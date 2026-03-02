import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/firebase';
import * as admin from 'firebase-admin';

export interface AuthRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: '인증 토큰이 필요합니다.' });
    return;
  }

  try {
    req.user = await verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

export async function optionalAuthMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = await verifyToken(token);
    } catch {
      // 토큰 검증 실패해도 요청은 계속 진행
    }
  }
  next();
}
