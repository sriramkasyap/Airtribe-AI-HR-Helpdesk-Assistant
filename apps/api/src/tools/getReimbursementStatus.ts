import { ReimbursementModel } from '../db/models/Reimbursement';
import type { ToolContext, ToolResult } from './types';
import { unauthorizedIfOtherEmployee } from './access';

export async function getReimbursementStatus(
  args: { employeeId: string },
  context: ToolContext,
): Promise<ToolResult> {
  const denied = unauthorizedIfOtherEmployee(context, args.employeeId, 'reimbursement history');
  if (denied) return denied;

  const reimbursements = await ReimbursementModel.find({ employeeId: args.employeeId })
    .select('id type amount status submittedAt')
    .lean();
  return { success: true, data: reimbursements };
}
