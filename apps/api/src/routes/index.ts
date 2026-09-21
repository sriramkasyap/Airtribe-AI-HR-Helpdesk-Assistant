import { Router } from 'express';

import authRoutes from './auth';
import chatRoutes from './chat';
import employeeRoutes from './employee';
import policyRoutes from './policy';
import { authMiddleware } from '../middleware/auth';
import { guardrailsMiddleware } from '../middleware/guardrails';

const router: Router = Router();

// Public: authentication endpoints
router.use('/auth', authRoutes);

// Protected: everything below requires a valid JWT and passes guardrails
router.use(authMiddleware, guardrailsMiddleware);
router.use('/chat', chatRoutes);
router.use('/employee', employeeRoutes);
router.use('/policy', policyRoutes);

export default router;
