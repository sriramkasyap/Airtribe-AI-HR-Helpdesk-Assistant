import { LeaveBalanceModel } from '../db/models/LeaveBalance';
import type { ToolContext, ToolResult } from './types';

export async function getLeaveBalance(
  args: { employeeId: string },
  context: ToolContext,
): Promise<ToolResult> {
  if (context.employeeId !== args.employeeId && context.role !== 'manager') {
    return { success: false, error: "Unauthorized: cannot access another employee's leave balance" };
  }
  const balance = await LeaveBalanceModel.findOne({ employeeId: args.employeeId }).lean();
  if (!balance) return { success: false, error: 'Leave balance not found' };
  return { success: true, data: balance };
}
