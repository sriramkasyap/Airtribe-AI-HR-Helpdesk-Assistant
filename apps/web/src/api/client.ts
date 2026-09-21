import { streamChatResponse } from './sse';

const TOKEN_KEY = 'hr_token';
const ROLE_KEY = 'hr_role';

export type UserRole = 'employee' | 'manager';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRole(): UserRole | null {
  const role = localStorage.getItem(ROLE_KEY);
  return role === 'manager' || role === 'employee' ? role : null;
}

export function setRole(role: UserRole): void {
  localStorage.setItem(ROLE_KEY, role);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface LoginResult {
  token: string;
  expiresAt: number;
  employeeId: string;
  role: UserRole;
}

export interface HRPolicy {
  id: string;
  title: string;
  category: string;
  content: string;
  effectiveDate: string;
  isActive: boolean;
}

export type PolicyInput = {
  title: string;
  category: string;
  content: string;
  effectiveDate?: string;
  isActive?: boolean;
};

export interface StreamHandlers {
  onStatus?: (stage: string) => void;
  onTool?: (name: string, ok: boolean) => void;
  onToken?: (content: string) => void;
  onSuggestions?: (items: string[]) => void;
  onSessionId?: (sessionId: string) => void;
}

async function readJsonError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string } };
    if (data.error?.message) return data.error.message;
  } catch {
    /* keep fallback */
  }
  return fallback;
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
    throw new Error(await readJsonError(res, `Chat request failed (${res.status})`));
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
    throw new Error('Login failed');
  }
  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error?.message || 'Login failed');
  }
  setToken(body.data.token);
  setRole(body.data.role);
  return body.data;
}

export async function listPolicies(): Promise<HRPolicy[]> {
  const res = await fetch('/api/v1/policy', { headers: { ...authHeader() } });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) throw new Error(await readJsonError(res, 'Failed to load policies'));
  const body = (await res.json()) as { success?: boolean; data?: HRPolicy[] };
  if (!body.success || !Array.isArray(body.data)) throw new Error('Failed to load policies');
  return body.data;
}

export async function createPolicy(input: PolicyInput): Promise<HRPolicy> {
  const res = await fetch('/api/v1/policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (res.status === 403) throw new Error('Manager role required');
  if (!res.ok) throw new Error(await readJsonError(res, 'Failed to create policy'));
  const body = (await res.json()) as { success?: boolean; data?: HRPolicy };
  if (!body.success || !body.data) throw new Error('Failed to create policy');
  return body.data;
}

export async function updatePolicy(id: string, input: Partial<PolicyInput>): Promise<HRPolicy> {
  const res = await fetch(`/api/v1/policy/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (res.status === 403) throw new Error('Manager role required');
  if (!res.ok) throw new Error(await readJsonError(res, 'Failed to update policy'));
  const body = (await res.json()) as { success?: boolean; data?: HRPolicy };
  if (!body.success || !body.data) throw new Error('Failed to update policy');
  return body.data;
}

export async function deletePolicy(id: string): Promise<void> {
  const res = await fetch(`/api/v1/policy/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...authHeader() },
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (res.status === 403) throw new Error('Manager role required');
  if (!res.ok) throw new Error(await readJsonError(res, 'Failed to delete policy'));
}
