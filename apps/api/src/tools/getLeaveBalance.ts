import { EmployeeModel } from '../db/models/Employee';
import type { ToolContext, ToolResult } from './types';

export async function getLeaveBalance(
  args: { employeeId?: string; name?: string },
  context: ToolContext,
): Promise<ToolResult> {
  const resolved = await resolveTargetEmployeeId(args, context);
  if (!resolved.success) return resolved;

  const targetId = resolved.employeeId;
  if (context.employeeId !== targetId && context.role !== 'manager') {
    return { success: false, error: "Unauthorized: cannot access another employee's leave balance" };
  }

  const employee = await EmployeeModel.findOne({ id: targetId }).select('id name leaveBalance').lean();
  if (!employee?.leaveBalance) return { success: false, error: 'Leave balance not found' };
  return {
    success: true,
    data: {
      employeeId: employee.id,
      name: employee.name,
      ...employee.leaveBalance,
    },
  };
}

async function resolveTargetEmployeeId(
  args: { employeeId?: string; name?: string },
  context: ToolContext,
): Promise<{ success: true; employeeId: string } | { success: false; error: string }> {
  if (args.employeeId?.trim()) {
    return { success: true, employeeId: args.employeeId.trim() };
  }

  if (args.name?.trim()) {
    if (context.role !== 'manager') {
      return { success: false, error: 'Unauthorized: only managers can look up employees by name' };
    }
    const escaped = args.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = await EmployeeModel.findOne({
      name: { $regex: escaped, $options: 'i' },
    })
      .select('id')
      .lean();
    if (!match) {
      return { success: false, error: `No employee found matching name "${args.name.trim()}"` };
    }
    return { success: true, employeeId: match.id };
  }

  return { success: true, employeeId: context.employeeId };
}
