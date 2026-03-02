import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase';
import { verifyToken } from '../services/firebase';
import { GuestLoginRequest } from '../types';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agreed, name, phone } = req.body as GuestLoginRequest;

    if (!agreed) {
      res.status(400).json({ error: '개인정보 수집에 동의해야 합니다.' });
      return;
    }

    if (!name || !phone) {
      res.status(400).json({ error: '이름과 전화번호는 필수 항목입니다.' });
      return;
    }

    const guestUserId = uuidv4();

    if (supabase) {
      const { error } = await supabase.from('users').insert({
        id: guestUserId,
        name,
        phone,
        role: 'guest',
      });

      if (error) {
        res.status(500).json({ error: '사용자 생성에 실패했습니다.', details: error.message });
        return;
      }
    }

    res.status(201).json({
      message: '게스트 로그인 성공',
      user_id: guestUserId,
      role: 'guest',
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
