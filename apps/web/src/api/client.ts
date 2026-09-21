import { streamChatResponse } from './sse';

const TOKEN_KEY = 'hr_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface LoginResult {
  token: string;
  expiresAt: number;
}

export interface LLMOutput {
  classification: {
    type: string;
    confidence: number;
    reasoning: string;
  };
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>;
  response: string;
  needsClarification: boolean;
  clarificationQuestion: string | null;
  followUpSuggestions: string[];
}

export interface LLMChatResponse extends LLMOutput {
  sessionId: string;
  toolsUsed: Array<{ name: string; ok: boolean; data: unknown }>;
}

export interface StreamHandlers {
  onStatus?: (stage: string) => void;
  onTool?: (name: string, ok: boolean) => void;
  onToken?: (content: string) => void;
  onSuggestions?: (items: string[]) => void;
  onSessionId?: (sessionId: string) => void;
}

/**
 * Stream a chat answer over SSE. Events arrive live as the server runs
 * tools and the LLM generates tokens.
 */
export async function streamChat(
  body: { message: string; sessionId?: string },
  handlers: StreamHandlers,
): Promise<void> {
  const res = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) {
    let message = `Chat request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: { message?: string } };
      if (data.error?.message) message = data.error.message;
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
  const sessionId = res.headers.get('X-Session-Id');
  if (sessionId) handlers.onSessionId?.(sessionId);
  await streamChatResponse(res, (event) => {
    if (event.type === 'status') handlers.onStatus?.(event.stage);
    else if (event.type === 'tool') handlers.onTool?.(event.name, event.ok);
    else if (event.type === 'token') handlers.onToken?.(event.content);
    else if (event.type === 'suggestions') handlers.onSuggestions?.(event.items);
    else if (event.type === 'error') throw new Error(event.message);
  });
}

export async function sendChat(
  body: { message: string; sessionId?: string; stream?: false },
): Promise<LLMChatResponse> {
  const res = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  const data = (await res.json()) as { success?: boolean; data?: LLMChatResponse; error?: { message?: string } };
  if (!res.ok || !data.success || !data.data) {
    throw new Error(data.error?.message || 'Chat request failed');
  }
  return data.data;
}

export async function login(employeeId: string): Promise<LoginResult> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId }),
  });
  let body: {
    success?: boolean;
    data?: LoginResult;
    error?: { code?: string; message?: string };
  };
  try {
    body = await res.json();
  } catch {
    // Non-JSON response (e.g. proxy/gateway error page)
    throw new Error('Login failed');
  }
  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error?.message || 'Login failed');
  }
  setToken(body.data.token);
  return body.data;
}
