import { EmployeeModel } from '../db/models/Employee';
import type { ToolContext, ToolResult } from './types';

export async function getEmployeeProfile(
  args: { employeeId: string },
  context: ToolContext,
): Promise<ToolResult> {
  if (context.employeeId !== args.employeeId && context.role !== 'manager') {
    return { success: false, error: "Unauthorized: cannot access another employee's profile" };
  }
  const employee = await EmployeeModel.findOne({ id: args.employeeId })
    .select('id name email department role hireDate')
    .lean();
  if (!employee) return { success: false, error: 'Employee not found' };
  return { success: true, data: employee };
}
