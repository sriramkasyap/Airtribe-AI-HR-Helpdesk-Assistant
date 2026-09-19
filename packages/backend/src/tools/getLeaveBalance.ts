import { EmployeeModel, LeaveBalanceModel, ReimbursementModel, HRPolicyModel, ConversationMemoryModel } from './models';

interface ToolContext {
  employeeId: string;
  role: 'employee' | 'manager';
}

interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const currentYear = new Date().getFullYear();

export async function getLeaveBalance(args: { employeeId: string }, context: ToolContext): Promise<ToolResult> {
  if (context.employeeId !== args.employeeId && context.role !== 'manager') {
    return { success: false, error: "Unauthorized: cannot access another employee's leave balance" };
  }
  const balance = await LeaveBalanceModel.findOne({ employee: args.employeeId, year: currentYear });
  if (!balance) {
    return { success: true, data: { casualLeave: 21, sickLeave: 12, earnedLeave: 18, year: currentYear } };
  }
  return { success: true, data: { casualLeave: balance.casualLeave, sickLeave: balance.sickLeave, earnedLeave: balance.earnedLeave, year: balance.year } };
}
