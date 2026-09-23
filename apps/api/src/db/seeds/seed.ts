import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { EmployeeModel } from '../models/Employee';
import { ReimbursementModel } from '../models/Reimbursement';
import { HRPolicyModel } from '../models/HRPolicy';

const CURRENT_YEAR = new Date().getFullYear();
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

/** seed.ts is apps/api/src/db/seeds → five levels up is the repo root. */
const POLICIES_DIR = path.resolve(__dirname, '../../../../../docs/policies');

function loadPolicy(filename: string, fallback: string): string {
  try {
    return fs.readFileSync(path.join(POLICIES_DIR, filename), 'utf8').trim();
  } catch {
    return fallback;
  }
}

const SEED_DATA = {
  employees: [
    {
      id: 'emp1',
      name: 'Alice Johnson',
      email: 'alice@company.com',
      department: 'engineering',
      role: 'employee' as const,
      hireDate: new Date('2022-03-15'),
      leaveBalance: { casualLeave: 21, sickLeave: 12, earnedLeave: 18, year: CURRENT_YEAR },
    },
    {
      id: 'emp2',
      name: 'Bob Smith',
      email: 'bob@company.com',
      department: 'engineering',
      role: 'manager' as const,
      hireDate: new Date('2020-06-01'),
      leaveBalance: { casualLeave: 15, sickLeave: 8, earnedLeave: 10, year: CURRENT_YEAR },
    },
    {
      id: 'emp3',
      name: 'Carol White',
      email: 'carol@company.com',
      department: 'hr',
      role: 'employee' as const,
      hireDate: new Date('2021-09-20'),
      leaveBalance: { casualLeave: 20, sickLeave: 15, earnedLeave: 16, year: CURRENT_YEAR },
    },
  ],
  reimbursements: [
    { id: 'reb1', employeeId: 'emp1', amount: 500, status: 'pending', type: 'travel', submittedAt: daysAgo(6) },
    { id: 'reb2', employeeId: 'emp3', amount: 200, status: 'approved', type: 'office_supplies', submittedAt: daysAgo(11) },
  ],
  policies: [
    {
      id: 'pol1',
      title: 'Remote Work Policy',
      category: 'remote_work',
      content: loadPolicy(
        'remote-work.md',
        'Employees may work remotely up to 3 days per week.',
      ),
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
    {
      id: 'pol2',
      title: 'Code of Conduct',
      category: 'conduct',
      content: loadPolicy(
        'code-of-conduct.md',
        'All employees must follow the company code of conduct.',
      ),
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
    {
      id: 'pol3',
      title: 'PTO Policy',
      category: 'leave',
      content: loadPolicy(
        'pto.md',
        'Employees are entitled to PTO based on their tenure.',
      ),
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
    },
  ],
};

export async function seedDatabase(): Promise<void> {
  // Drop legacy LeaveBalance collection if it still exists from earlier schemas.
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropCollection('leavebalances').catch(() => undefined);
  }

  await Promise.all([
    EmployeeModel.deleteMany({}),
    ReimbursementModel.deleteMany({}),
    HRPolicyModel.deleteMany({}),
  ]);

  await Promise.all([
    EmployeeModel.insertMany(SEED_DATA.employees),
    ReimbursementModel.insertMany(SEED_DATA.reimbursements),
    HRPolicyModel.insertMany(SEED_DATA.policies),
  ]);

  console.log('Database seeded successfully');
}
