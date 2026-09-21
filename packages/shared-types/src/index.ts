export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: EmployeeRole;
  hireDate: string;
  leaveBalance: LeaveBalance;
}

export type EmployeeRole = 'employee' | 'manager';

/** Leave quotas for the current entitlement year — stored on the employee document. */
export interface LeaveBalance {
  casualLeave: number;
  sickLeave: number;
  earnedLeave: number;
  year: number;
}

export interface Reimbursement {
  id: string;
  employeeId: string;
  amount: number;
  status: ReimbursementStatus;
  type: string;
  submittedAt: string;
}

export type ReimbursementStatus = 'pending' | 'approved' | 'rejected';

export interface HRPolicy {
  id: string;
  title: string;
  category: string;
  content: string;
  effectiveDate: string;
  isActive: boolean;
}

export interface ConversationMemory {
  id: string;
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  updatedAt: string;
  expiresAt: string;
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
}

export interface JWTClaims {
  employeeId: string;
  role: EmployeeRole;
  iat?: number;
  exp?: number;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
}

export interface APIError {
  code: string;
  message: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMClassification {
  type: RequestType;
  confidence: number;
  reasoning: string;
}

export interface LLMOutput {
  classification: LLMClassification;
  toolCalls: ToolCall[];
  response: string;
  needsClarification: boolean;
  clarificationQuestion: string | null;
  followUpSuggestions: string[];
}

export type RequestType =
  | 'question'
  | 'request'
  | 'policy_lookup'
  | 'record_lookup'
  | 'clarification_needed'
  | 'off_topic';

export interface ToolContext {
  employeeId: string;
  role: EmployeeRole;
  models: Record<string, unknown>;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
