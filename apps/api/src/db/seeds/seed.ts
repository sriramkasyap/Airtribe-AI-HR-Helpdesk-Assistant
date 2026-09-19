#!/usr/bin/env tsx

import { connectDB } from './db/connection';
import { EmployeeModel, LeaveBalanceModel, ReimbursementModel, HRPolicyModel } from './db/models';

async function seed() {
  try {
    await connectDB();
    console.log('Database connected for seeding');

    // Clear existing data
    await EmployeeModel.deleteMany({});
    await LeaveBalanceModel.deleteMany({});
    await ReimbursementModel.deleteMany({});
    await HRPolicyModel.deleteMany({});
    console.log('Cleared existing data');

    // Seed Employees
    const employees = [
      {
        name: 'Alice Johnson',
        email: 'alice@company.com',
        department: 'Engineering',
        role: 'employee',
        hireDate: '2023-01-15'
      },
      {
        name: 'Bob Smith',
        email: 'bob@company.com',
        department: 'Sales',
        role: 'manager',
        hireDate: '2022-06-10'
      },
      {
        name: 'Carol Lee',
        email: 'carol@company.com',
        department: 'HR',
        role: 'employee',
        hireDate: '2024-03-20'
      }
    ];

    const employeeDocs = await EmployeeModel.insertMany(employees);
    console.log(`Seeded ${employeeDocs.length} employees`);

    // Seed Leave Balances
    const leaveBalances = employeeDocs.map(emp => ({
      employee: emp._id,
      casualLeave: 21,
      sickLeave: 12,
      earnedLeave: 18,
      year: 2024
    }));

    await LeaveBalanceModel.insertMany(leaveBalances);
    console.log(`Seeded ${leaveBalances.length} leave balances`);

    // Seed HR Policies
    const hrPolicies = [
      {
        title: 'Work From Home Policy',
        category: 'Remote Work',
        content: 'Employees may work from home up to 3 days per week with manager approval.',
        effectiveDate: '2024-01-01',
        isActive: true
      },
      {
        title: 'Expense Reimbursement Policy',
        category: 'Finance',
        content: 'All business expenses must be submitted within 30 days of incurring them. Reimbursement is processed within 5 business days of approval.',
        effectiveDate: '2024-01-01',
        isActive: true
      },
      {
        title: 'Paid Time Off Policy',
        category: 'Leave',
        content: 'Employees accrue 21 casual leave days and 12 sick leave days per year. Earned leave accrues at 1.5 days per month.',
        effectiveDate: '2024-01-01',
        isActive: true
      }
    ];

    await HRPolicyModel.insertMany(hrPolicies);
    console.log(`Seeded ${hrPolicies.length} HR policies`);

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
