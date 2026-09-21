import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as tools from '../tools';
import { executeToolCall, executeToolCalls, MAX_TOOL_CALLS_PER_TURN } from '../services/toolExecutor';

jest.mock('../tools');

const mockedTools = jest.mocked(tools);

const context = { employeeId: 'emp1', role: 'employee' as const };

beforeEach(() => {
  jest.resetAllMocks();
});

describe('executeToolCall', () => {
  it('defaults employeeId to the authenticated user', async () => {
    mockedTools.getLeaveBalance.mockResolvedValue({ success: true, data: { casualLeave: 21 } });
    const result = await executeToolCall({ name: 'get_leave_balance', arguments: {} }, context);
    expect(mockedTools.getLeaveBalance).toHaveBeenCalledWith({ employeeId: 'emp1' }, context);
    expect(result.ok).toBe(true);
    expect(result.summary).toEqual({ casualLeave: 21 });
  });

  it('propagates tool failure as ok:false with the error text', async () => {
    mockedTools.getLeaveBalance.mockResolvedValue({ success: false, error: 'Leave balance not found' });
    const result = await executeToolCall({ name: 'get_leave_balance', arguments: {} }, context);
    expect(result.ok).toBe(false);
    expect(result.summary).toBe('Leave balance not found');
  });

  it('captures thrown errors without throwing', async () => {
    mockedTools.getHRPolicy.mockRejectedValue(new Error('db down'));
    const result = await executeToolCall(
      { name: 'get_hr_policy', arguments: { policyId: 'pol1' } },
      context,
    );
    expect(result.ok).toBe(false);
    expect(result.summary).toBe('db down');
  });

  it('rejects unknown tools gracefully', async () => {
    const result = await executeToolCall({ name: 'delete_all', arguments: {} }, context);
    expect(result.ok).toBe(false);
    expect(String(result.summary)).toMatch(/Unknown tool/i);
  });

  it('enforces authorization via the underlying tools for other employees', async () => {
    mockedTools.getEmployeeProfile.mockResolvedValue({
      success: false,
      error: "Unauthorized: cannot access another employee's profile",
    });
    const result = await executeToolCall(
      { name: 'get_employee_profile', arguments: { employeeId: 'emp2' } },
      context,
    );
    expect(mockedTools.getEmployeeProfile).toHaveBeenCalledWith({ employeeId: 'emp2' }, context);
    expect(result.ok).toBe(false);
  });

  it('handles get_reimbursement_status', async () => {
    mockedTools.getReimbursementStatus.mockResolvedValue({ success: true, data: [{ amount: 500 }] });
    const result = await executeToolCall({ name: 'get_reimbursement_status', arguments: {} }, context);
    expect(result.ok).toBe(true);
    expect(result.summary).toEqual([{ amount: 500 }]);
  });
});

describe('executeToolCalls', () => {
  it('executes multiple calls in order', async () => {
    mockedTools.getLeaveBalance.mockResolvedValue({ success: true, data: {} });
    mockedTools.getHRPolicy.mockResolvedValue({ success: true, data: { title: 'PTO' } });
    const results = await executeToolCalls(
      [
        { name: 'get_leave_balance', arguments: {} },
        { name: 'get_hr_policy', arguments: { policyId: 'pol3' } },
      ],
      context,
    );
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('get_leave_balance');
    expect(results[1].ok).toBe(true);
  });

  it('caps the number of tool calls per turn', async () => {
    mockedTools.getLeaveBalance.mockResolvedValue({ success: true, data: {} });
    const calls = Array.from({ length: 8 }, () => ({
      name: 'get_leave_balance',
      arguments: {},
    }));
    const results = await executeToolCalls(calls, context);
    expect(results).toHaveLength(MAX_TOOL_CALLS_PER_TURN);
  });
});
