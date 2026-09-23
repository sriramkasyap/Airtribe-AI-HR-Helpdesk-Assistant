import { describe, it, expect, afterEach } from '@jest/globals';
import {
  addUsage,
  calculateCost,
  DEFAULT_INPUT_USD_PER_MILLION,
  DEFAULT_OUTPUT_USD_PER_MILLION,
  emptyUsage,
  parseUsage,
} from '../services/cost';
import { buildChatTurnLog } from '../utils/logger';
import { createSSETokenParser } from '../services/llm.service';

describe('cost helpers', () => {
  const prevIn = process.env.OPENROUTER_INPUT_USD_PER_MILLION;
  const prevOut = process.env.OPENROUTER_OUTPUT_USD_PER_MILLION;

  afterEach(() => {
    if (prevIn === undefined) delete process.env.OPENROUTER_INPUT_USD_PER_MILLION;
    else process.env.OPENROUTER_INPUT_USD_PER_MILLION = prevIn;
    if (prevOut === undefined) delete process.env.OPENROUTER_OUTPUT_USD_PER_MILLION;
    else process.env.OPENROUTER_OUTPUT_USD_PER_MILLION = prevOut;
  });

  it('parses OpenRouter usage objects and ignores junk', () => {
    expect(parseUsage({ prompt_tokens: 120, completion_tokens: 40 })).toEqual({
      promptTokens: 120,
      completionTokens: 40,
    });
    expect(parseUsage(null)).toEqual(emptyUsage());
    expect(parseUsage({ prompt_tokens: 'nope' })).toEqual(emptyUsage());
  });

  it('adds usage across two LLM turns', () => {
    expect(addUsage({ promptTokens: 100, completionTokens: 20 }, { promptTokens: 80, completionTokens: 30 })).toEqual({
      promptTokens: 180,
      completionTokens: 50,
    });
  });

  it('computes USD from the course rates and shows the formula', () => {
    delete process.env.OPENROUTER_INPUT_USD_PER_MILLION;
    delete process.env.OPENROUTER_OUTPUT_USD_PER_MILLION;
    const cost = calculateCost({ promptTokens: 1_000_000, completionTokens: 1_000_000 });
    expect(cost.usd).toBeCloseTo(DEFAULT_INPUT_USD_PER_MILLION + DEFAULT_OUTPUT_USD_PER_MILLION);
    expect(cost.formula).toContain('$0.002/1M');
    expect(cost.formula).toContain('$0.004/1M');
  });
});

describe('Phase 7 chat turn log', () => {
  it('includes every Phase 7 field plus the cost formula', () => {
    const startedAt = Date.now() - 250;
    const entry = buildChatTurnLog({
      requestId: 'req-1',
      sessionId: 'sess-1',
      employeeId: 'emp1',
      role: 'employee',
      stream: false,
      model: 'z-ai/glm-5.3-flash',
      query: 'How many casual leaves do I have left?',
      classification: { type: 'record_lookup', confidence: 0.92, reasoning: 'leave balance question' },
      toolsUsed: [{ name: 'get_leave_balance', ok: true }],
      usage: { promptTokens: 1240, completionTokens: 180 },
      startedAt,
      outcome: 'success',
    });

    expect(entry.event).toBe('chat_turn');
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.requestId).toBe('req-1');
    expect(entry.sessionId).toBe('sess-1');
    expect(entry.employeeId).toBe('emp1');
    expect(entry.role).toBe('employee');
    expect(entry.stream).toBe(false);
    expect(entry.model).toBe('z-ai/glm-5.3-flash');
    expect(entry.query).toMatch(/casual leaves/);
    expect(entry.classificationType).toBe('record_lookup');
    expect(entry.classificationConfidence).toBe(0.92);
    expect(entry.classificationReasoning).toBe('leave balance question');
    expect(entry.toolsUsed).toEqual([{ name: 'get_leave_balance', ok: true }]);
    expect(entry.promptTokens).toBe(1240);
    expect(entry.completionTokens).toBe(180);
    expect(entry.totalTokens).toBe(1420);
    expect(entry.latencyMs).toBeGreaterThanOrEqual(250);
    expect(entry.costUsd).toBeGreaterThan(0);
    expect(entry.costFormula).toMatch(/1240/);
    expect(entry.outcome).toBe('success');
  });
});

describe('SSE parser usage', () => {
  it('captures usage from a trailing OpenRouter chunk', () => {
    const parser = createSSETokenParser();
    parser.push('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n');
    parser.push('data: {"choices":[],"usage":{"prompt_tokens":11,"completion_tokens":2}}\n\n');
    expect(parser.usage()).toEqual({ promptTokens: 11, completionTokens: 2 });
  });
});
