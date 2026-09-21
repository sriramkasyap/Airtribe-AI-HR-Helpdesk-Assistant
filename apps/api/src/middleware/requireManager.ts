import { Request, Response, NextFunction } from 'express';

/** Requires authMiddleware first. Blocks non-managers with 403. */
export function requireManager(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'manager') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Manager role required' },
    });
    return;
  }
  next();
}
