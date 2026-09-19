import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Server } from 'http';
import request from 'supertest';
import { app } from '../src/app';
import { connectDB } from '../src/db/connection';

let server: Server;

beforeAll(async () => {
  await connectDB();
  server = app.listen(0);
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(resolve));
});

describe('Health', () => {
  it('should return health status', async () => {
    const res = await request(server).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('checks');
  });
});

describe('Auth', () => {
  it('should login with valid employeeId', async () => {
    const res = await request(server).post('/api/v1/auth/login').send({ employeeId: 'emp1' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('expiresAt');
  });

  it('should reject login without employeeId', async () => {
    const res = await request(server).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Chat', () => {
  it('should require auth', async () => {
    const res = await request(server).post('/api/v1/chat').send({ message: 'Hello' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject oversized messages', async () => {
    const token = 'valid_token_placeholder';
    const longMessage = 'x'.repeat(5000);
    const res = await request(server)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: longMessage });
    expect(res.status).toBe(400);
  });
});
