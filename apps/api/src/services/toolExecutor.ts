import { getEmployeeProfile, getLeaveBalance, getHRPolicy, getReimbursementStatus, listPolicies } from '../tools';
import type { ToolContext } from '../tools';

export type ToolName =
  | 'get_employee_profile'
  | 'get_leave_balance'
  | 'get_reimbursement_status'
  | 'get_hr_policy';

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ExecutedTool {
  name: string;
  ok: boolean;
  summary: unknown;
}

/**
 * Run a single tool call. Enforces per-tool authorization:
 * - record tools (profile/leave/reimbursement) require the requested employeeId
 *   to match the authenticated user, unless the caller is a manager.
 * - policy lookups are available to any authenticated employee.
 */
export function executeToolCall(
  call: ToolCallRequest,
  context: ToolContext,
): Promise<ExecutedTool> {
  switch (call.name) {
    case 'get_employee_profile': {
      const args = normalizeArgs(call.arguments, ['employeeId']);
      return run('get_employee_profile', () =>
        getEmployeeProfile({ employeeId: args.employeeId ?? context.employeeId }, context),
      );
    }
    case 'get_leave_balance': {
      const args = normalizeArgs(call.arguments, ['employeeId']);
      return run('get_leave_balance', () =>
        getLeaveBalance({ employeeId: args.employeeId ?? context.employeeId }, context),
      );
    }
    case 'get_reimbursement_status': {
      const args = normalizeArgs(call.arguments, ['employeeId']);
      return run('get_reimbursement_status', () =>
        getReimbursementStatus({ employeeId: args.employeeId ?? context.employeeId }, context),
      );
    }
    case 'get_hr_policy': {
      const args = normalizeArgs(call.arguments, ['policyId', 'topic']);
      if (args.policyId) {
        return run('get_hr_policy', () => getHRPolicy({ policyId: args.policyId }));
      }
      // No ID known — search by topic/category instead (e.g. "remote work policy")
      return run('get_hr_policy', () => lookupPolicyByTopic(args.topic));
    }
    default: {
      const unknown = `Unknown tool: ${call.name}`;
      return Promise.resolve({ name: call.name, ok: false, summary: unknown });
    }
  }
}

async function lookupPolicyByTopic(topic?: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const result = await listPolicies({ topic });
  if (!result.success) return result;
  const policies = result.data as Array<Record<string, unknown>> | undefined;
  // Exactly one match → return the policy itself; otherwise return the list
  // and let the composing turn summarize or ask which one is meant.
  if (Array.isArray(policies) && policies.length === 1) {
    return { success: true, data: policies[0] };
  }
  return result;
}

/**
 * Execute every tool call the LLM requested. Failures are captured per-call
 * (never thrown) so one bad call cannot break the whole chat turn.
 */
export async function executeToolCalls(
  calls: ToolCallRequest[],
  context: ToolContext,
): Promise<ExecutedTool[]> {
  const executed: ExecutedTool[] = [];
  for (const call of calls.slice(0, MAX_TOOL_CALLS_PER_TURN)) {
    executed.push(await executeToolCall(call, context));
  }
  return executed;
}

export const MAX_TOOL_CALLS_PER_TURN = 5;

function run(name: string, fn: () => Promise<{ success: boolean; data?: unknown; error?: string }>): Promise<ExecutedTool> {
  return fn()
    .then((result) => ({ name, ok: result.success, summary: result.success ? result.data : result.error }))
    .catch((error) => ({ name, ok: false, summary: (error as Error).message }));
}

function normalizeArgs(
  raw: Record<string, unknown>,
  keys: string[],
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of keys) {
    const value = raw[key];
    out[key] = typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
  return out;
}
