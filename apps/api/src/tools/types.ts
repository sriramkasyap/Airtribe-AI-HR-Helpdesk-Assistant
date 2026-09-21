export interface ToolContext {
  employeeId: string;
  role: 'employee' | 'manager';
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
