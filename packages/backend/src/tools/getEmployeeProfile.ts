import { EmployeeModel } from './models';

interface ToolContext {
  employeeId: string;
  role: 'employee' | 'manager';
}

interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getEmployeeProfile(args: { employeeId: string }, context: ToolContext): Promise<ToolResult> {
  if (context.employeeId !== args.employeeId && context.role !== 'manager') {
    return { success: false, error: "Unauthorized: cannot access another employee's profile" };
  }
  const emp = await EmployeeModel.findById(args.employeeId).select('name email department role hireDate');
  if (!emp) return { success: false, error: 'Employee not found' };
  return { success: true, data: emp };
}
