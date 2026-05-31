import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface HospitalStaffPayload {
  staffId: string;
  email: string;
  name: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      hospitalStaff?: HospitalStaffPayload;
    }
  }
}

function getJwtSecret(): string {
  const secret = process.env.HOSPITAL_JWT_SECRET;
  if (!secret) throw new Error('HOSPITAL_JWT_SECRET is not configured');
  return secret;
}

export function signHospitalToken(payload: HospitalStaffPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '8h' });
}

export function requireHospitalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: '병원 인증이 필요합니다.' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, getJwtSecret()) as HospitalStaffPayload;
    req.hospitalStaff = decoded;
    next();
  } catch {
    res.status(401).json({ error: '유효하지 않은 병원 인증 토큰입니다.' });
  }
}
