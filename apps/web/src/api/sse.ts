export type SSEEvent =
  | { type: 'token'; content: string }
  | { type: 'done' }
  | { type: 'status'; stage: string }
  | { type: 'tool'; name: string; ok: boolean }
  | { type: 'suggestions'; items: string[] }
  | { type: 'error'; message: string };

/**
 * Parse a single SSE block (lines separated from other blocks by a blank line)
 * into typed events. Malformed lines are skipped.
 */
export function parseSSEBlock(block: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const data = trimmed.slice(5).trim();
    if (!data) continue;
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      if (parsed.type === 'token' && typeof parsed.content === 'string') {
        events.push({ type: 'token', content: parsed.content });
      } else if (parsed.type === 'done') {
        events.push({ type: 'done' });
      } else if (parsed.type === 'status' && typeof parsed.stage === 'string') {
        events.push({ type: 'status', stage: parsed.stage });
      } else if (parsed.type === 'tool' && typeof parsed.name === 'string') {
        events.push({ type: 'tool', name: parsed.name, ok: Boolean(parsed.ok) });
      } else if (parsed.type === 'suggestions' && Array.isArray(parsed.items)) {
        events.push({
          type: 'suggestions',
          items: parsed.items.filter((item): item is string => typeof item === 'string'),
        });
      } else if (parsed.type === 'error' && typeof parsed.message === 'string') {
        events.push({ type: 'error', message: parsed.message });
      }
    } catch {
      /* skip malformed data lines */
    }
  }
  return events;
}

/**
 * Consume a streaming SSE Response and invoke onEvent for every parsed event.
 * Handles blocks that span multiple network chunks via buffering.
 */
export async function streamChatResponse(
  res: Response,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error('Response has no body');
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        for (const event of parseSSEBlock(block)) onEvent(event);
        separatorIndex = buffer.indexOf('\n\n');
      }
    }
    // Flush any trailing block without a final blank line
    if (buffer.trim()) {
      for (const event of parseSSEBlock(buffer)) onEvent(event);
    }
  } finally {
    reader.releaseLock();
  }
}
