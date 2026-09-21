import { Router } from 'express';
import { getHRPolicy, listPolicies } from '../tools';

const router: Router = Router();

// GET /api/v1/policy?topic=... - list policies
router.get('/', async (req, res) => {
  const topic = typeof req.query.topic === 'string' ? req.query.topic : undefined;
  const result = await listPolicies({ topic });
  if (!result.success) {
    return res.status(400).json({ success: false, error: { code: 'TOOL_ERROR', message: result.error } });
  }
  res.json({ success: true, data: result.data });
});

// GET /api/v1/policy/:id - get policy by ID
router.get('/:id', async (req, res) => {
  const result = await getHRPolicy({ policyId: req.params.id });
  if (!result.success) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
  }
  res.json({ success: true, data: result.data });
});

export default router;
