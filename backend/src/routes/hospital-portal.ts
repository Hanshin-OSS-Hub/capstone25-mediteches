import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../services/supabase';
import {
  requireHospitalAuth,
  signHospitalToken,
} from '../middleware/hospitalAuth';
import { decryptUserPii, hashIp } from '../services/crypto/pqc';

const router = Router();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

router.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: '이메일과 비밀번호를 입력해 주세요.' });
      return;
    }

    if (!supabase) {
      const demoEmail = process.env.HOSPITAL_DEMO_EMAIL || 'hospital@meditech.local';
      const demoPassword = process.env.HOSPITAL_DEMO_PASSWORD || 'meditech2026';
      if (email === demoEmail && password === demoPassword) {
        const token = signHospitalToken({
          staffId: 'demo-staff',
          email: demoEmail,
          name: '데모 병원직원',
          role: 'hospital',
        });
        res.json({ token, staff: { id: 'demo-staff', email: demoEmail, name: '데모 병원직원' } });
        return;
      }
      res.status(401).json({ error: '인증 정보가 올바르지 않습니다.' });
      return;
    }

    const { data: staff, error } = await supabase
      .from('hospital_staff')
      .select('id, email, password_hash, name, role')
      .eq('email', email)
      .single();

    if (error || !staff) {
      res.status(401).json({ error: '인증 정보가 올바르지 않습니다.' });
      return;
    }

    const valid = await bcrypt.compare(password, staff.password_hash);
    if (!valid) {
      res.status(401).json({ error: '인증 정보가 올바르지 않습니다.' });
      return;
    }

    const token = signHospitalToken({
      staffId: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
    });

    res.json({
      token,
      staff: { id: staff.id, email: staff.email, name: staff.name },
    });
  } catch (err) {
    console.error('Hospital login error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.get('/patients', requireHospitalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!supabase) {
      res.json({ patients: [] });
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, name_masked, phone_masked, role, created_at')
      .eq('role', 'guest')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      res.status(500).json({ error: '환자 목록 조회에 실패했습니다.' });
      return;
    }

    const patients = (data || []).map((u) => ({
      id: u.id,
      nameMasked: u.name_masked || u.name,
      phoneMasked: u.phone_masked || u.phone,
      createdAt: u.created_at,
    }));

    res.json({ patients });
  } catch (err) {
    console.error('Patients list error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.post(
  '/patients/:id/decrypt',
  requireHospitalAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const fields = (req.body?.fields as string[]) || ['name', 'phone', 'residentId'];
      const staff = req.hospitalStaff!;

      if (!supabase) {
        res.status(503).json({ error: '데이터베이스가 연결되지 않았습니다.' });
        return;
      }

      const { data: enc, error } = await supabase
        .from('users_encrypted')
        .select('*')
        .eq('user_id', id)
        .single();

      if (error || !enc) {
        res.status(404).json({ error: '암호화된 환자 정보를 찾을 수 없습니다.' });
        return;
      }

      const decrypted = decryptUserPii(enc, fields as ('name' | 'phone' | 'residentId')[]);

      if (staff.staffId !== 'demo-staff') {
        await supabase.from('decrypt_audit_log').insert({
          staff_id: staff.staffId,
          user_id: id,
          fields_accessed: fields,
          ip_hash: hashIp(getClientIp(req)),
        });
      }

      res.json({ decrypted, accessedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Decrypt error:', err);
      res.status(500).json({ error: '복호화에 실패했습니다.' });
    }
  },
);

router.get('/audit-log', requireHospitalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!supabase) {
      res.json({ logs: [] });
      return;
    }

    const { data, error } = await supabase
      .from('decrypt_audit_log')
      .select('id, staff_id, user_id, fields_accessed, accessed_at, ip_hash')
      .order('accessed_at', { ascending: false })
      .limit(50);

    if (error) {
      res.status(500).json({ error: '감사 로그 조회에 실패했습니다.' });
      return;
    }

    res.json({ logs: data || [] });
  } catch (err) {
    console.error('Audit log error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

export default router;
