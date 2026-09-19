import { Router } from 'express';
import { authRouter } from './auth';
import { chatRouter } from './chat';
import { employeeRouter } from './employee';

const router = Router();

router.use('/auth', authRouter);
router.use('/chat', chatRouter);
router.use('/', employeeRouter);

export { router as apiRouter };
