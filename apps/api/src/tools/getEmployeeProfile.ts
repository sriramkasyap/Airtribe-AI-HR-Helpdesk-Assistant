import { EmployeeModel } from '../db/models/Employee';
import type { ToolContext, ToolResult } from './types';
import { unauthorizedIfOtherEmployee } from './access';

export async function getEmployeeProfile(
  args: { employeeId: string },
  context: ToolContext,
): Promise<ToolResult> {
  const denied = unauthorizedIfOtherEmployee(context, args.employeeId, 'profile');
  if (denied) return denied;

  const employee = await EmployeeModel.findOne({ id: args.employeeId })
    .select('id name email department role hireDate')
    .lean();
  if (!employee) return { success: false, error: 'Employee not found' };
  return { success: true, data: employee };
}
