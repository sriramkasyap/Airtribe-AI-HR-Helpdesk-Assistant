import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getToken, setToken, clearToken, authHeader, login } from './client';

// In-memory localStorage stub — keeps these tests independent of the DOM environment
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('token storage', () => {
  it('stores and clears the token', () => {
    setToken('abc');
    expect(getToken()).toBe('abc');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('authHeader includes the bearer token when set', () => {
    setToken('abc');
    expect(authHeader()).toEqual({ Authorization: 'Bearer abc' });
  });

  it('authHeader is empty without a token', () => {
    expect(authHeader()).toEqual({});
  });
});

describe('login', () => {
  it('stores the token on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ success: true, data: { token: 'tok', expiresAt: 123 } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    const data = await login('emp1');
    expect(data.token).toBe('tok');
    expect(getToken()).toBe('tok');
    expect(fetch).toHaveBeenCalledWith('/api/v1/auth/login', expect.objectContaining({ method: 'POST' }));
  });

  it('throws the API error message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'employeeId is required' } }),
            { status: 400 },
          ),
      ),
    );
    await expect(login('')).rejects.toThrow('employeeId is required');
    expect(getToken()).toBeNull();
  });

  it('falls back to a generic message when the body has no error details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('oops', { status: 500 })));
    await expect(login('emp1')).rejects.toThrow('Login failed');
  });
});
