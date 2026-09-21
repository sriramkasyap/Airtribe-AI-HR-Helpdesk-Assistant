import { describe, it, expect } from '@jest/globals';
import type { Employee, LeaveBalance, Reimbursement, HRPolicy, ConversationMemory, ChatMessage } from '@ai-hr/shared-types';

describe('shared-types', () => {
  it('should type the Employee interface', () => {
    const emp: Employee = {
      id: '1',
      name: 'Test',
      email: 'test@company.com',
      department: 'engineering',
      role: 'employee',
      hireDate: '2023-01-01',
    };
    expect(emp.id).toBe('1');
    expect(emp.role).toBe('employee');
  });

  it('should type the LeaveBalance interface', () => {
    const bal: LeaveBalance = { id: '1', employeeId: '1', casualLeave: 21, sickLeave: 12, earnedLeave: 18, year: 2024 };
    expect(bal.casualLeave).toBe(21);
  });

  it('should type the Reimbursement interface', () => {
    const reimb: Reimbursement = { id: '1', employeeId: '1', amount: 100, status: 'pending', type: 'travel', submittedAt: '2024-01-01' };
    expect(reimb.amount).toBe(100);
    expect(reimb.status).toBe('pending');
  });

  it('should type the HRPolicy interface', () => {
    const policy: HRPolicy = { id: '1', title: 'WFH', category: 'remote_work', content: '...', effectiveDate: '2024-01-01', isActive: true };
    expect(policy.category).toBe('remote_work');
  });

  it('should type the ConversationMemory and ChatMessage interfaces', () => {
    const message: ChatMessage = { id: 'm1', sessionId: 'sess1', role: 'user', content: 'hello', timestamp: '2024-01-01T00:00:00Z' };
    const mem: ConversationMemory = {
      id: '1',
      sessionId: 'sess1',
      userId: 'user1',
      messages: [message],
      updatedAt: '2024-01-01',
      expiresAt: '2024-01-02',
    };
    expect(mem.sessionId).toBe('sess1');
    expect(mem.messages[0].role).toBe('user');
  });
});
