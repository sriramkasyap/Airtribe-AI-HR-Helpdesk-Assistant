import { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } });
    return;
  }

  const token = authHeader.slice(7).trim();
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    req.user = {
      employeeId: String(payload.employeeId || ''),
      role: (payload.role as 'employee' | 'manager') || 'employee',
    };
    next();
  } catch (error) {
    logger.warn({ err: error, requestId: req.id }, 'JWT verification failed');
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}