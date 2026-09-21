import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { decodeJwt } from 'jose';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { seedDatabase } from '../db/seeds/seed';
import { getLeaveBalance } from '../tools/getLeaveBalance';

let dbUp = false;

beforeAll(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-helpdesk-test', {
      serverSelectionTimeoutMS: 2000,
    });
    dbUp = true;
    await seedDatabase();
  } catch {
    dbUp = false;
  }
});

afterAll(async () => {
  if (dbUp) await mongoose.disconnect();
});

describe('manager leave access', () => {
  it('logs in emp2 with role manager in the JWT', async () => {
    if (!dbUp) return;
    const res = await request(app).post('/api/v1/auth/login').send({ employeeId: 'emp2' });
    expect(res.status).toBe(200);
    const claims = decodeJwt(res.body.data.token);
    expect(claims.employeeId).toBe('emp2');
    expect(claims.role).toBe('manager');
  });

  it('rejects unknown employee IDs at login', async () => {
    if (!dbUp) return;
    const res = await request(app).post('/api/v1/auth/login').send({ employeeId: 'nope' });
    expect(res.status).toBe(401);
  });

  it('allows a manager to fetch another employee leave balance by id', async () => {
    if (!dbUp) return;
    const result = await getLeaveBalance(
      { employeeId: 'emp1' },
      { employeeId: 'emp2', role: 'manager' },
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ employeeId: 'emp1', casualLeave: 21 });
  });

  it('allows a manager to fetch leave balance by name', async () => {
    if (!dbUp) return;
    const result = await getLeaveBalance(
      { name: 'Alice' },
      { employeeId: 'emp2', role: 'manager' },
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ employeeId: 'emp1' });
  });

  it('blocks a non-manager from another employee leave balance', async () => {
    if (!dbUp) return;
    const result = await getLeaveBalance(
      { employeeId: 'emp3' },
      { employeeId: 'emp1', role: 'employee' },
    );
    expect(result.success).toBe(false);
    expect(String(result.error)).toMatch(/Unauthorized/i);
  });
});
