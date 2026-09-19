import { Router } from 'express';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { logger } from '../utils/logger';

const loginSchema = z.object({ employeeId: z.string().min(1) });
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { employeeId } = loginSchema.parse(req.body);
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT({ employeeId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(secret);
    res.json({ success: true, data: { token, expiresAt: Date.now() + 2 * 60 * 60 * 1000 } });
  } catch (error) {
    logger.error(error, { section: 'auth', operation: 'login' });
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid login request' } });
  }
});

export { router as authRouter };
