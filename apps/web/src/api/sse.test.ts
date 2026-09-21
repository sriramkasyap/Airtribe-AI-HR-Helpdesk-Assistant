import { describe, it, expect } from 'vitest';
import { parseSSEBlock, streamChatResponse } from './sse';

function sseResponse(blocks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const block of blocks) controller.enqueue(encoder.encode(block));
      controller.close();
    },
  });
  return new Response(stream);
}

describe('parseSSEBlock', () => {
  it('parses token events', () => {
    expect(parseSSEBlock('data: {"type":"token","content":"Hello"}')).toEqual([
      { type: 'token', content: 'Hello' },
    ]);
  });

  it('parses done events', () => {
    expect(parseSSEBlock('data: {"type":"done"}')).toEqual([{ type: 'done' }]);
  });

  it('parses multiple lines within one block', () => {
    const events = parseSSEBlock('data: {"type":"token","content":"a"}\ndata: {"type":"done"}');
    expect(events).toEqual([
      { type: 'token', content: 'a' },
      { type: 'done' },
    ]);
  });

  it('skips malformed and non-event lines', () => {
    const events = parseSSEBlock('data: not-json\n: comment\ndata: {"type":"token","content":"ok"}');
    expect(events).toEqual([{ type: 'token', content: 'ok' }]);
  });

  it('ignores unknown event types', () => {
    expect(parseSSEBlock('data: {"type":"weird"}')).toEqual([]);
  });

  it('parses status events', () => {
    expect(parseSSEBlock('data: {"type":"status","stage":"tools"}')).toEqual([
      { type: 'status', stage: 'tools' },
    ]);
  });

  it('parses tool events', () => {
    expect(parseSSEBlock('data: {"type":"tool","name":"get_leave_balance","ok":true}')).toEqual([
      { type: 'tool', name: 'get_leave_balance', ok: true },
    ]);
  });

  it('parses suggestions events and filters non-strings', () => {
    expect(parseSSEBlock('data: {"type":"suggestions","items":["a",42,"b"]}')).toEqual([
      { type: 'suggestions', items: ['a', 'b'] },
    ]);
  });

  it('parses error events', () => {
    expect(parseSSEBlock('data: {"type":"error","message":"boom"}')).toEqual([
      { type: 'error', message: 'boom' },
    ]);
  });
});

describe('streamChatResponse', () => {
  it('emits events from a simple stream', async () => {
    const events: string[] = [];
    await streamChatResponse(sseResponse(['data: {"type":"token","content":"Hi"}\n\ndata: {"type":"done"}\n\n']), (e) => {
      if (e.type === 'token') events.push(e.content ?? '');
    });
    expect(events).toEqual(['Hi']);
  });

  it('reassembles blocks split across chunks', async () => {
    const events: string[] = [];
    // The token block is split mid-JSON across two chunks
    const chunks = [
      'data: {"type":"tok',
      'en","content":"Hi there"}\n\ndata: {"type":"done"}\n\n',
    ];
    await streamChatResponse(sseResponse(chunks), (e) => {
      if (e.type === 'token') events.push(e.content ?? '');
    });
    expect(events).toEqual(['Hi there']);
  });

  it('flushes a trailing block without a final blank line', async () => {
    const events: string[] = [];
    await streamChatResponse(sseResponse(['data: {"type":"token","content":"end"}']),(e) => {
      if (e.type === 'token') events.push(e.content ?? '');
    });
    expect(events).toEqual(['end']);
  });

  it('throws when the response has no body', async () => {
    const res = new Response(null);
    await expect(streamChatResponse(res, () => undefined)).rejects.toThrow('no body');
  });
});
