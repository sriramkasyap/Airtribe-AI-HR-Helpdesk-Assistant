import { HRPolicyModel } from './models';

interface ToolContext {
  employeeId: string;
  role: 'employee' | 'manager';
}

interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getHRPolicy(args: { topic: string }, context: ToolContext): Promise<ToolResult> {
  const policies = await HRPolicyModel.find({ isActive: true, $text: { $search: args.topic } }).limit(10);
  return { success: true, data: policies };
}
