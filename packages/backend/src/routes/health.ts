import { Router } from 'express';
import { healthCheck } from '../services/health.service';

const router = Router();

router.get('/', async (_req, res) => {
  const health = await healthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

export { router as healthRouter };
