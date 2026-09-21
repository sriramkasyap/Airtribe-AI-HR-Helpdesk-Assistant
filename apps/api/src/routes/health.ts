import { Router } from 'express';
import { healthCheck } from '../services/health.service';

const router: Router = Router();

router.get('/', async (_req, res) => {
  const status = await healthCheck();
  const statusCode = status.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(status);
});

export default router;
