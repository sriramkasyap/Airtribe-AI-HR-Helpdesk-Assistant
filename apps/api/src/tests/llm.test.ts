import { describe, it, expect } from '@jest/globals';
import { parseStructuredOutput, extractJSON, LLMOutputError, createSSETokenParser } from '../services/llm.service';

const validPayload = {
  classification: { type: 'record_lookup', confidence: 0.9, reasoning: 'leave balance question' },
  toolCalls: [{ name: 'get_leave_balance', arguments: { employeeId: 'emp1' } }],
  response: 'You have 21 casual leaves left.',
  needsClarification: false,
  clarificationQuestion: null,
  followUpSuggestions: ['Check my sick leave'],
};

describe('llm.service structured output', () => {
  it('parses a valid JSON payload', () => {
    const output = parseStructuredOutput(JSON.stringify(validPayload));
    expect(output.classification.type).toBe('record_lookup');
    expect(output.classification.confidence).toBe(0.9);
    expect(output.toolCalls).toHaveLength(1);
    expect(output.needsClarification).toBe(false);
    expect(output.followUpSuggestions).toEqual(['Check my sick leave']);
  });

  it('extracts JSON embedded in surrounding text', () => {
    const wrapped = `Here is the result:\n${JSON.stringify(validPayload)}\nHope that helps!`;
    const json = extractJSON(wrapped);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('throws LLMOutputError when no JSON is present', () => {
    expect(() => extractJSON('no json here')).toThrow(LLMOutputError);
  });

  it('applies defaults for missing optional fields', () => {
    const output = parseStructuredOutput(JSON.stringify({ response: 'partial' }));
    expect(output.classification.type).toBe('off_topic');
    expect(output.classification.confidence).toBe(0.5);
    expect(output.toolCalls).toEqual([]);
    expect(output.needsClarification).toBe(false);
  });
});

describe('createSSETokenParser', () => {
  it('extracts tokens from complete blocks', () => {
    const parser = createSSETokenParser();
    const tokens = parser.push('data: {"choices":[{"delta":{"content":"Hel"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\n');
    expect(tokens).toEqual(['Hel', 'lo']);
    expect(parser.flush()).toEqual([]);
  });

  it('reassembles a block split across chunks', () => {
    const parser = createSSETokenParser();
    expect(parser.push('data: {"choices":[{"del')).toEqual([]);
    expect(parser.push('ta":{"content":"Hi"}}]}\n\ndata: {"choices":[{"delta":{"content":"!"}}]}\n')).toEqual(['Hi']);
    expect(parser.flush()).toEqual(['!']);
  });

  it('skips [DONE] and malformed lines, flushes a trailing block', () => {
    const parser = createSSETokenParser();
    const tokens = parser.push('data: [DONE]\n\ndata: not-json\n\ndata: {"choices":[{"delta":{"content":"end"}}]}');
    expect(tokens).toEqual([]);
    expect(parser.flush()).toEqual(['end']);
  });

  it('ignores null content deltas', () => {
    const parser = createSSETokenParser();
    expect(parser.push('data: {"choices":[{"delta":{}}]}\n\n')).toEqual([]);
  });
});
