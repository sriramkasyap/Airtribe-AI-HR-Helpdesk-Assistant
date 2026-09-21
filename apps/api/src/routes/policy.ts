import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getHRPolicy, listPolicies } from '../tools';
import { HRPolicyModel } from '../db/models/HRPolicy';
import { requireManager } from '../middleware/requireManager';
import { logError } from '../utils/logger';

const router: Router = Router();

const policyBodySchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  content: z.string().min(1).max(20000),
  effectiveDate: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

function serializePolicy(doc: {
  id: string;
  title: string;
  category: string;
  content: string;
  effectiveDate: Date | string;
  isActive: boolean;
}) {
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    content: doc.content,
    effectiveDate:
      doc.effectiveDate instanceof Date
        ? doc.effectiveDate.toISOString().slice(0, 10)
        : String(doc.effectiveDate).slice(0, 10),
    isActive: doc.isActive,
  };
}

// GET /api/v1/policy?topic=... - list policies (any authenticated user)
router.get('/', async (req, res) => {
  const topic = typeof req.query.topic === 'string' ? req.query.topic : undefined;
  const result = await listPolicies({ topic });
  if (!result.success) {
    return res.status(400).json({ success: false, error: { code: 'TOOL_ERROR', message: result.error } });
  }
  const data = Array.isArray(result.data)
    ? (result.data as Array<Record<string, unknown>>).map((p) =>
        serializePolicy(p as Parameters<typeof serializePolicy>[0]),
      )
    : result.data;
  res.json({ success: true, data });
});

// POST /api/v1/policy - create (managers only)
router.post('/', requireManager, async (req, res) => {
  try {
    const body = policyBodySchema.parse(req.body);
    const id = `pol-${randomUUID().slice(0, 8)}`;
    const effectiveDate = body.effectiveDate ? new Date(body.effectiveDate) : new Date();
    const created = await HRPolicyModel.create({
      id,
      title: body.title,
      category: body.category,
      content: body.content,
      effectiveDate,
      isActive: body.isActive ?? true,
    });
    res.status(201).json({ success: true, data: serializePolicy(created) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid policy' },
      });
      return;
    }
    logError(error as Error, { section: 'policy', operation: 'create' });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create policy' } });
  }
});

// GET /api/v1/policy/:id - get policy by ID
router.get('/:id', async (req, res) => {
  const result = await getHRPolicy({ policyId: req.params.id });
  if (!result.success) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
  }
  res.json({
    success: true,
    data: serializePolicy(result.data as Parameters<typeof serializePolicy>[0]),
  });
});

// PATCH /api/v1/policy/:id - update (managers only)
router.patch('/:id', requireManager, async (req, res) => {
  try {
    const body = policyBodySchema.partial().parse(req.body);
    if (Object.keys(body).length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No fields to update' },
      });
      return;
    }
    const update: Record<string, unknown> = { ...body };
    if (body.effectiveDate) update.effectiveDate = new Date(body.effectiveDate);
    const updated = await HRPolicyModel.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }).lean();
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' } });
      return;
    }
    res.json({ success: true, data: serializePolicy(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid policy' },
      });
      return;
    }
    logError(error as Error, { section: 'policy', operation: 'update' });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update policy' } });
  }
});

// DELETE /api/v1/policy/:id - delete (managers only)
router.delete('/:id', requireManager, async (req, res) => {
  try {
    const deleted = await HRPolicyModel.findOneAndDelete({ id: req.params.id }).lean();
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' } });
      return;
    }
    res.json({ success: true, data: { id: deleted.id } });
  } catch (error) {
    logError(error as Error, { section: 'policy', operation: 'delete' });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete policy' } });
  }
});

export default router;
