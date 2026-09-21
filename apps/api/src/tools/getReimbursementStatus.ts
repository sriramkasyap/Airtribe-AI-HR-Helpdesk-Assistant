import { ReimbursementModel } from '../db/models/Reimbursement';
import type { ToolContext, ToolResult } from './types';

export async function getReimbursementStatus(
  args: { employeeId: string },
  context: ToolContext,
): Promise<ToolResult> {
  if (context.employeeId !== args.employeeId && context.role !== 'manager') {
    return { success: false, error: "Unauthorized: cannot access another employee's reimbursement history" };
  }
  const reimbursements = await ReimbursementModel.find({ employeeId: args.employeeId })
    .select('id type amount status submittedAt')
    .lean();
  return { success: true, data: reimbursements };
}
