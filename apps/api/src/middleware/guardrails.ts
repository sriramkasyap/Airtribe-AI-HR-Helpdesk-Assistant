import { Request, Response, NextFunction } from 'express';
import { buildChatTurnLog, logChatTurn, logger } from '../utils/logger';
import { emptyUsage } from '../services/cost';
import { MODEL } from '../services/llm.service';

/** Patterns blocked in user chat messages (not HTTP methods/paths). */
const FORBIDDEN_PATTERNS = [
  /salary/i,
  /compensation/i,
  /terminate/i,
  /\bfire\b/i,
  /promote/i,
  /\bdelete\b/i,
  /export/i,
  /modify_policy/i,
  /change_policy/i,
  /\badmin\b/i,
  /\bbulk\b/i,
  /all_employees/i,
  /salary_data/i,
  /payroll/i,
  /termination/i,
];

export function guardrailsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only scan chat user text — applying these to method/path blocked legitimate DELETE routes.
  const message = typeof req.body?.message === 'string' ? req.body.message : '';
  if (!message) {
    next();
    return;
  }
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(message)) {
      logger.warn(
        { requestId: req.id, employeeId: req.user?.employeeId, pattern: pattern.source },
        'Guardrail blocked request',
      );
      logChatTurn(
        buildChatTurnLog({
          requestId: req.id,
          sessionId: typeof req.body?.sessionId === 'string' ? req.body.sessionId : 'none',
          employeeId: req.user?.employeeId || 'unknown',
          role: req.user?.role || 'unknown',
          stream: Boolean(req.body?.stream),
          model: MODEL,
          query: message,
          toolsUsed: [],
          usage: emptyUsage(),
          startedAt: Date.now(),
          outcome: 'guardrail_blocked',
        }),
      );
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'This action is not permitted' },
      });
      return;
    }
  }
  next();
}
