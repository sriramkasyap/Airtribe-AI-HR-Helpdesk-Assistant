import { EmployeeModel } from '../db/models/Employee';
import { HRPolicyModel } from '../db/models/HRPolicy';
import type { ToolResult } from './types';

export async function listEmployees(args: { dateRange?: string } = {}): Promise<ToolResult> {
  try {
    const query: Record<string, unknown> = {};
    if (args.dateRange) {
      const [start, end] = args.dateRange.split('~');
      if (start && end) {
        query.hireDate = { $gte: new Date(start), $lte: new Date(end) };
      }
    }
    const employees = await EmployeeModel.find(query)
      .select('id name email department role hireDate')
      .lean();
    return { success: true, data: employees };
  } catch (error) {
    return { success: false, error: 'Failed to list employees' };
  }
}

export async function listPolicies(args: { topic?: string } = {}): Promise<ToolResult> {
  try {
    const query: Record<string, unknown> = {};
    if (args.topic) {
      query.category = args.topic;
    }
    const policies = await HRPolicyModel.find(query)
      .select('id title category content effectiveDate isActive')
      .lean();
    return { success: true, data: policies };
  } catch (error) {
    return { success: false, error: 'Failed to list policies' };
  }
}
