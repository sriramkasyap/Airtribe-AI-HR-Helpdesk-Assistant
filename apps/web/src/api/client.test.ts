import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getToken, setToken, clearToken, authHeader, login, streamChat } from './client';

// In-memory localStorage stub — keeps these tests independent of the DOM environment
const store = new Map<string, string>();

function sseResponse(blocks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const block of blocks) controller.enqueue(encoder.encode(block));
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'X-Session-Id': 'sess-42' } });
}

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

describe('streamChat', () => {
  it('dispatches live events to handlers', async () => {
    const blocks = [
      'data: {"type":"status","stage":"tools"}\n\n',
      'data: {"type":"tool","name":"get_leave_balance","ok":true}\n\n',
      'data: {"type":"token","content":"You have "}\n\n',
      'data: {"type":"token","content":"21 days."}\n\n',
      'data: {"type":"suggestions","items":["Check sick leave"]}\n\n',
      'data: {"type":"done"}\n\n',
    ];
    const fetchMock = vi.fn(async () => sseResponse(blocks));
    vi.stubGlobal('fetch', fetchMock);

    const events: string[] = [];
    await streamChat({ message: 'leaves?' }, {
      onSessionId: (sid) => events.push(`session:${sid}`),
      onStatus: (stage) => events.push(`status:${stage}`),
      onTool: (name, ok) => events.push(`tool:${name}:${ok}`),
      onToken: (content) => events.push(`token:${content}`),
      onSuggestions: (items) => events.push(`suggestions:${items.join('|')}`),
    });

    expect(events).toEqual([
      'session:sess-42',
      'status:tools',
      'tool:get_leave_balance:true',
      'token:You have ',
      'token:21 days.',
      'suggestions:Check sick leave',
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/chat',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when the stream carries an error event', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => sseResponse(['data: {"type":"error","message":"Assistant is not configured"}\n\n'])),
    );
    await expect(
      streamChat({ message: 'hi' }, {}),
    ).rejects.toThrow('Assistant is not configured');
  });

  it('propagates 401 as UNAUTHORIZED', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 401 })));
    await expect(streamChat({ message: 'hi' }, {})).rejects.toThrow('UNAUTHORIZED');
  });
});
