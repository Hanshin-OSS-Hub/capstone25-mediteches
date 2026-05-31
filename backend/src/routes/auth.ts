import { randomUUID, createHash } from 'crypto';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../services/supabase';
import { verifyToken } from '../services/firebase';
import { GuestLoginRequest } from '../types';
import {
  encryptUserPii,
  maskName,
  maskPhone,
  hashIp,
  serializePayload,
} from '../services/crypto/pqc';
import {
  requireHospitalAuth,
  signHospitalToken,
} from '../middleware/hospitalAuth';
import {
  decryptUserPii,
} from '../services/crypto/pqc';

const router = Router();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as GuestLoginRequest;
    const {
      agreedTerms,
      agreedPrivacy,
      agreedSensitive,
      name,
      phone,
      residentId,
      consentVersion,
    } = body;

    if (!agreedTerms || !agreedPrivacy || !agreedSensitive) {
      res.status(400).json({ error: '필수 약관에 모두 동의해야 합니다.' });
      return;
    }

    if (!name?.trim() || !phone?.trim() || !residentId?.trim()) {
      res.status(400).json({ error: '이름, 연락처, 주민등록번호는 필수 항목입니다.' });
      return;
    }

    const residentDigits = residentId.replace(/\D/g, '');
    if (residentDigits.length !== 13) {
      res.status(400).json({ error: '주민등록번호 형식이 올바르지 않습니다.' });
      return;
    }

    const guestUserId = randomUUID();
    const nameMasked = maskName(name.trim());
    const phoneMasked = maskPhone(phone.trim());
    const ipHash = hashIp(getClientIp(req));

    let encrypted;
    try {
      encrypted = encryptUserPii(name.trim(), phone.trim(), residentDigits);
    } catch (err) {
      console.error('PII encryption failed:', err);
      res.status(500).json({ error: '개인정보 암호화에 실패했습니다. 서버 설정을 확인해 주세요.' });
      return;
    }

    if (supabase) {
      const { error: userError } = await supabase.from('users').insert({
        id: guestUserId,
        name: nameMasked,
        phone: phoneMasked,
        name_masked: nameMasked,
        phone_masked: phoneMasked,
        role: 'guest',
      });

      if (userError) {
        res.status(500).json({ error: '사용자 생성에 실패했습니다.', details: userError.message });
        return;
      }

      const { error: encError } = await supabase.from('users_encrypted').insert({
        user_id: guestUserId,
        name_enc: serializePayload(encrypted.nameEnc),
        phone_enc: serializePayload(encrypted.phoneEnc),
        resident_id_enc: serializePayload(encrypted.residentIdEnc),
        dek_wrapped: serializePayload(encrypted.dekWrapped),
        mlkem_ciphertext: encrypted.mlkemCiphertext,
        algorithm: encrypted.algorithm,
        key_version: encrypted.keyVersion,
      });

      if (encError) {
        console.error('Encrypted insert failed:', encError);
      }

      const consents = [
        { user_id: guestUserId, consent_type: 'terms', version: consentVersion, ip_hash: ipHash },
        { user_id: guestUserId, consent_type: 'privacy', version: consentVersion, ip_hash: ipHash },
        { user_id: guestUserId, consent_type: 'sensitive', version: consentVersion, ip_hash: ipHash },
      ];
      await supabase.from('user_consents').insert(consents);
    }

    res.status(201).json({
      message: '게스트 로그인 성공',
      user_id: guestUserId,
      role: 'guest',
      name_masked: nameMasked,
      phone_masked: phoneMasked,
    });
  } catch (err) {
    console.error('Guest login error:', err);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: '인증 토큰이 필요합니다.' });
      return;
    }

    const idToken = authHeader.slice(7);
    const decodedToken = await verifyToken(idToken);

    res.json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      verified: true,
    });
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
});

export default router;
