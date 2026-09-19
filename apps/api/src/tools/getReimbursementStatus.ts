import { ReimbursementModel } from './models';

interface ToolContext {
  employeeId: string;
  role: 'employee' | 'manager';
}

interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getReimbursementStatus(args: { employeeId: string; dateRange?: { start: string; end: string } }, context: ToolContext): Promise<ToolResult> {
  if (context.employeeId !== args.employeeId && context.role !== 'manager') {
    return { success: false, error: "Unauthorized: cannot access another employee's reimbursements" };
  }
  const query: Record<string, unknown> = { employee: args.employeeId };
  if (args.dateRange) {
    query.submittedAt = { $gte: new Date(args.dateRange.start), $lte: new Date(args.dateRange.end) };
  }
  const records = await ReimbursementModel.find(query).sort({ submittedAt: -1 }).limit(50);
  return { success: true, data: records };
}
