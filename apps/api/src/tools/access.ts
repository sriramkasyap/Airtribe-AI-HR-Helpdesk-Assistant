import type { ToolContext, ToolResult } from './types';

/** Returns an error result if a non-manager tries to access another employee's records. */
export function unauthorizedIfOtherEmployee(
  context: ToolContext,
  targetEmployeeId: string,
  resource: string,
): ToolResult | null {
  if (context.employeeId !== targetEmployeeId && context.role !== 'manager') {
    return {
      success: false,
      error: `Unauthorized: cannot access another employee's ${resource}`,
    };
  }
  return null;
}
