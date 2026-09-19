import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const FORBIDDEN_PATTERNS = [
  /salary/i, /compensation/i, /terminate/i, /fire/i, /promote/i,
  /delete/i, /export/i, /modify_policy/i, /change_policy/i, /admin/i,
  /bulk/i, /all_employees/i, /salary_data/i, /payroll/i, /termination/i,
];

export function guardrailsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const haystack = `${req.method} ${req.path} ${JSON.stringify(req.body || {})} ${JSON.stringify(req.query || {})}`;
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(haystack)) {
      logger.warn({ requestId: req.id, employeeId: req.user?.employeeId, pattern: pattern.source }, 'Guardrail blocked request');
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'This action is not permitted' } });
      return;
    }
  }
  next();
}