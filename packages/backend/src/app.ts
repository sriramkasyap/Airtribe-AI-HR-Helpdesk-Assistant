import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { requestIdMiddleware } from './middleware/requestId';
import { authMiddleware } from './middleware/auth';
import { guardrailsMiddleware } from './middleware/guardrails';
import { globalRateLimit } from './middleware/rateLimit';
import { logger } from './utils/logger';
import { apiRouter } from './routes';
import { healthRouter } from './routes/health';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalRateLimit);

app.use(requestIdMiddleware);

app.get('/health', healthRouter);

app.use('/api/v1', authMiddleware, guardrailsMiddleware, apiRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(error, { path: error.stack });
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

export { app };
