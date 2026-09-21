import mongoose from 'mongoose';
import { EmployeeModel } from '../models/Employee';
import { LeaveBalanceModel } from '../models/LeaveBalance';
import { ReimbursementModel } from '../models/Reimbursement';
import { HRPolicyModel } from '../models/HRPolicy';

const CURRENT_YEAR = new Date().getFullYear();
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const SEED_DATA = {
  employees: [
    { id: 'emp1', name: 'Alice Johnson', email: 'alice@company.com', department: 'engineering', role: 'employee', hireDate: new Date('2022-03-15') },
    { id: 'emp2', name: 'Bob Smith', email: 'bob@company.com', department: 'engineering', role: 'manager', hireDate: new Date('2020-06-01') },
    { id: 'emp3', name: 'Carol White', email: 'carol@company.com', department: 'hr', role: 'employee', hireDate: new Date('2021-09-20') },
  ],
  leaveBalances: [
    { id: 'lb1', employeeId: 'emp1', casualLeave: 21, sickLeave: 12, earnedLeave: 18, year: CURRENT_YEAR },
    { id: 'lb2', employeeId: 'emp2', casualLeave: 15, sickLeave: 8, earnedLeave: 10, year: CURRENT_YEAR },
    { id: 'lb3', employeeId: 'emp3', casualLeave: 20, sickLeave: 15, earnedLeave: 16, year: CURRENT_YEAR },
  ],
  reimbursements: [
    { id: 'reb1', employeeId: 'emp1', amount: 500, status: 'pending', type: 'travel', submittedAt: daysAgo(6) },
    { id: 'reb2', employeeId: 'emp3', amount: 200, status: 'approved', type: 'office_supplies', submittedAt: daysAgo(11) },
  ],
  policies: [
    { id: 'pol1', title: 'Remote Work Policy', category: 'remote_work', content: 'Employees may work remotely up to 3 days per week.', effectiveDate: new Date('2024-01-01'), isActive: true },
    { id: 'pol2', title: 'Code of Conduct', category: 'conduct', content: 'All employees must follow the company code of conduct.', effectiveDate: new Date('2024-01-01'), isActive: true },
    { id: 'pol3', title: 'PTO Policy', category: 'leave', content: 'Employees are entitled to PTO based on their tenure.', effectiveDate: new Date('2024-01-01'), isActive: true },
  ],
};

export async function seedDatabase(): Promise<void> {
  await Promise.all([
    EmployeeModel.deleteMany({}),
    LeaveBalanceModel.deleteMany({}),
    ReimbursementModel.deleteMany({}),
    HRPolicyModel.deleteMany({}),
  ]);

  await Promise.all([
    EmployeeModel.insertMany(SEED_DATA.employees),
    LeaveBalanceModel.insertMany(SEED_DATA.leaveBalances),
    ReimbursementModel.insertMany(SEED_DATA.reimbursements),
    HRPolicyModel.insertMany(SEED_DATA.policies),
  ]);

  console.log('Database seeded successfully');
}
