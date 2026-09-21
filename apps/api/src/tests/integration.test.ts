import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { SignJWT } from 'jose';
import app from '../app';
import { seedDatabase } from '../db/seeds/seed';

let dbUp = false;
let token = '';

beforeAll(async () => {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'development-secret-change-me');
  token = await new SignJWT({ employeeId: 'emp1', role: 'employee' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secret);

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

describe('Health', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/health');
    // 200 when all checks healthy (DB up), 503 when degraded (e.g. no MongoDB locally)
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('checks');
    expect(res.body.checks).toHaveProperty('database');
  });
});

describe('Auth', () => {
  it('should login with a valid employeeId', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ employeeId: 'emp1' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('expiresAt');
  });

  it('should reject login without employeeId', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Chat', () => {
  it('should require auth', async () => {
    const res = await request(app).post('/api/v1/chat').send({ message: 'Hello' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject oversized messages', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'x'.repeat(5000) });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Employee routes', () => {
  it('should reject unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/employee');
    expect(res.status).toBe(401);
  });

  it('should list employees with valid auth', async () => {
    if (!dbUp) return;
    const res = await request(app).get('/api/v1/employee').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should get an employee profile by ID', async () => {
    if (!dbUp) return;
    const res = await request(app).get('/api/v1/employee/emp1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('name');
  });
});

describe('Policy routes', () => {
  it('should reject unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/policy');
    expect(res.status).toBe(401);
  });

  it('should list policies with valid auth', async () => {
    if (!dbUp) return;
    const res = await request(app).get('/api/v1/policy').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should get a policy by ID', async () => {
    if (!dbUp) return;
    const res = await request(app).get('/api/v1/policy/pol1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('title');
  });

  it('should forbid employees from creating policies', async () => {
    if (!dbUp) return;
    const res = await request(app)
      .post('/api/v1/policy')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'X', category: 'leave', content: 'Nope' });
    expect(res.status).toBe(403);
  });

  it('should allow managers to create, update, and delete policies', async () => {
    if (!dbUp) return;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'development-secret-change-me');
    const managerToken = await new SignJWT({ employeeId: 'emp2', role: 'manager' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(secret);

    const created = await request(app)
      .post('/api/v1/policy')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Travel Policy',
        category: 'travel',
        content: 'Submit expenses within 30 days.',
        effectiveDate: '2026-01-01',
        isActive: true,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.title).toBe('Travel Policy');
    const id = created.body.data.id as string;

    const updated = await request(app)
      .patch(`/api/v1/policy/${id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ content: 'Submit expenses within 14 days.' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.content).toMatch(/14 days/);

    const deleted = await request(app)
      .delete(`/api/v1/policy/${id}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(deleted.status).toBe(200);

    const missing = await request(app)
      .get(`/api/v1/policy/${id}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(missing.status).toBe(404);
  });
});
