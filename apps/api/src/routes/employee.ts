import { Router } from 'express';
import { logger } from '../utils/logger';
import { getLeaveBalance } from '../tools/getLeaveBalance';
import { getReimbursementStatus } from '../tools/getReimbursementStatus';
import { getHRPolicy } from '../tools/getHRPolicy';
import { getEmployeeProfile } from '../tools/getEmployeeProfile';

const router = Router();

router.get('/profile', async (req, res) => {
  try {
    const result = await getEmployeeProfile(
      { employeeId: req.user!.employeeId },
      { employeeId: req.user!.employeeId, role: req.user!.role!, models: {} },
    );
    res.json(result);
  } catch (error) {
    logger.error(error, { section: 'employee', operation: 'profile' });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unable to fetch profile' } });
  }
});

router.get('/leave-balance', async (req, res) => {
  try {
    const result = await getLeaveBalance(
      { employeeId: req.user!.employeeId },
      { employeeId: req.user!.employeeId, role: req.user!.role!, models: {} },
    );
    res.json(result);
  } catch (error) {
    logger.error(error, { section: 'employee', operation: 'leave-balance' });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unable to fetch leave balance' } });
  }
});

router.get('/reimbursements', async (req, res) => {
  try {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const result = await getReimbursementStatus(
      { employeeId: req.user!.employeeId, dateRange: start && end ? { start, end } : undefined },
      { employeeId: req.user!.employeeId, role: req.user!.role!, models: {} },
    );
    res.json(result);
  } catch (error) {
    logger.error(error, { section: 'employee', operation: 'reimbursements' });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unable to fetch reimbursements' } });
  }
});

router.get('/policies', async (req, res) => {
  try {
    const topic = req.query.topic as string;
    if (!topic) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'topic is required' } });
      return;
    }
    const result = await getHRPolicy(
      { topic },
      { employeeId: req.user!.employeeId, role: req.user!.role!, models: {} },
    );
    res.json(result);
  } catch (error) {
    logger.error(error, { section: 'employee', operation: 'policies' });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unable to fetch policies' } });
  }
});

export { router as employeeRouter };
