// Common test helpers
export const mockEmployee = (overrides: Record<string, unknown> = {}) => ({
  id: 'emp1',
  name: 'Test Employee',
  email: 'emp1@company.com',
  department: 'engineering',
  role: 'employee',
  hireDate: '2023-01-01',
  leaveBalance: {
    casualLeave: 21,
    sickLeave: 12,
    earnedLeave: 18,
    year: 2024,
  },
  ...overrides,
});

export const mockManager = (overrides: Record<string, unknown> = {}) => ({
  id: 'mgr1',
  name: 'Test Manager',
  email: 'mgr1@company.com',
  department: 'hr',
  role: 'manager',
  hireDate: '2020-01-01',
  leaveBalance: {
    casualLeave: 15,
    sickLeave: 8,
    earnedLeave: 10,
    year: 2024,
  },
  ...overrides,
});

export const mockLeaveBalance = (overrides: Record<string, unknown> = {}) => ({
  casualLeave: 21,
  sickLeave: 12,
  earnedLeave: 18,
  year: 2024,
  ...overrides,
});

export const mockPolicy = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  title: 'Work From Home Policy',
  category: 'remote_work',
  content: 'Employees may work from home up to 2 days per week.',
  effectiveDate: '2024-01-01',
  isActive: true,
  ...overrides,
});
