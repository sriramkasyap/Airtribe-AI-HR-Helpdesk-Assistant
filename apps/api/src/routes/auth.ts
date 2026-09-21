import { Router } from 'express';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { logger, logError } from '../utils/logger';
import { EmployeeModel } from '../db/models/Employee';

const loginSchema = z.object({ employeeId: z.string().min(1) });
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';
const TOKEN_TTL_SECONDS = 2 * 60 * 60;

const router: Router = Router();

router.post('/login', async (req, res) => {
  try {
    const { employeeId } = loginSchema.parse(req.body);
    const employee = await EmployeeModel.findOne({ id: employeeId }).select('id role').lean();
    if (!employee) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Unknown employee ID' },
      });
      return;
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT({ employeeId: employee.id, role: employee.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
      .sign(secret);
    res.json({
      success: true,
      data: {
        token,
        expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
        employeeId: employee.id,
        role: employee.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ issues: error.issues }, 'Login validation failed');
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'employeeId is required' } });
      return;
    }
    logError(error as Error, { section: 'auth', operation: 'login' });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Login failed' } });
  }
});

export default router;
