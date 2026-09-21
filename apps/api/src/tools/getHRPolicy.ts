import { HRPolicyModel } from '../db/models/HRPolicy';
import type { ToolContext, ToolResult } from './types';

export async function getHRPolicy(
  args: { policyId?: string },
  _context?: ToolContext,
): Promise<ToolResult> {
  if (!args.policyId) return { success: false, error: 'Policy ID required' };
  const policy = await HRPolicyModel.findOne({ id: args.policyId })
    .select('id title category content effectiveDate isActive')
    .lean();
  if (!policy) return { success: false, error: 'Policy not found' };
  return { success: true, data: policy };
}
