import axios from 'axios';
import { buildPrompt } from './prompt';
import { logger } from '../utils/logger';

export interface LLMOutput {
  classification: {
    type: 'question' | 'request' | 'policy_lookup' | 'record_lookup' | 'clarification_needed' | 'off_topic';
    confidence: number;
    reasoning: string;
  };
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>;
  response: string;
  needsClarification: boolean;
  clarificationQuestion: string | null;
  followUpSuggestions: string[];
}

export class LLMOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMOutputError';
  }
}

export function parseStructuredOutput(text: string): LLMOutput {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new LLMOutputError('No JSON found in response');
  const parsed = JSON.parse(jsonMatch[0]) as Record<string, any>;
  return {
    classification: {
      type: parsed.classification?.type ?? 'off_topic',
      confidence: typeof parsed.classification?.confidence === 'number' ? parsed.classification.confidence : 0.5,
      reasoning: parsed.classification?.reasoning ?? 'Unable to determine classification',
    },
    toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [],
    response: parsed.response ?? 'Unable to process your request',
    needsClarification: Boolean(parsed.needsClarification),
    clarificationQuestion: parsed.clarificationQuestion ?? null,
    followUpSuggestions: Array.isArray(parsed.followUpSuggestions) ? parsed.followUpSuggestions : [],
  };
}

export function extractJSON(text: string): string {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new LLMOutputError('No JSON found in response');
  return jsonMatch[0];
}

// z-ai/glm-5.3-flash is a hybrid reasoning model: without excluding the
// reasoning channel it spends tokens (and wall-clock time) thinking before
// emitting content, which both slows responses and can leave content null.
const REQUEST_OPTIONS = { reasoning: { exclude: true } } as const;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const MODEL = process.env.OPENROUTER_MODEL || 'z-ai/glm-5.3-flash';
const TEMPERATURE = 0.3;
const MAX_TOKENS = 4096;
const TIMEOUT_MS = 120000;
const INPUT_RATE = 0.002 / 1_000_000;
const OUTPUT_RATE = 0.004 / 1_000_000;
const MAX_ATTEMPTS = 3;

interface ToolContext {
  employeeId: string;
  role: 'employee' | 'manager';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class LLMService {
  private baseUrl = 'https://openrouter.ai/api/v1';

  async classifyAndPlan(
    userMessage: string,
    _context: ToolContext,
    history: ChatMessage[] = [],
  ): Promise<LLMOutput> {
    const prompt = buildPrompt(userMessage, history);
    const raw = await this.callLLM(prompt);
    return parseStructuredOutput(raw);
  }

  async streamChat(
    userMessage: string,
    _context: ToolContext,
    history: ChatMessage[] = [],
  ): Promise<AsyncGenerator<string>> {
    const prompt = buildPrompt(userMessage, history);
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: MODEL,
        messages: [{ role: 'system', content: prompt }],
        stream: true,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        ...REQUEST_OPTIONS,
      },
      {
        timeout: TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': FRONTEND_URL,
          'X-Title': 'HR-Helpdesk-Assistant',
        },
      },
    );
    return this._streamGenerator(String(response.data ?? ''));
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    return inputTokens * INPUT_RATE + outputTokens * OUTPUT_RATE;
  }

  /**
   * Second LLM turn: given the executed tool results, compose the final
   * user-facing answer grounded in the actual tool data.
   */
  async composeWithToolResults(
    userMessage: string,
    plan: LLMOutput,
    executedTools: Array<{ name: string; ok: boolean; summary: unknown }>,
    history: ChatMessage[] = [],
  ): Promise<LLMOutput> {
    const prompt = [
      buildPrompt(userMessage, history),
      '<tool_results>',
      JSON.stringify(executedTools, null, 2),
      '</tool_results>',
      'Using ONLY the tool results above (and the conversation history), write the final response JSON.',
      'If a tool failed or returned no data, say so honestly and suggest contacting HR.',
    ].join('\n');

    const raw = await this.callLLM(prompt);
    return parseStructuredOutput(raw);
  }

  private async callLLM(prompt: string): Promise<string> {
    if (!OPENROUTER_API_KEY) {
      throw new LLMOutputError('OpenRouter API key is not configured (set OPENROUTER_API_KEY)');
    }
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          {
            model: MODEL,
            messages: [{ role: 'system', content: prompt }],
            temperature: TEMPERATURE,
            max_tokens: MAX_TOKENS,
            ...REQUEST_OPTIONS,
          },
          {
            timeout: TIMEOUT_MS,
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              'HTTP-Referer': FRONTEND_URL,
              'X-Title': 'HR-Helpdesk-Assistant',
            },
          },
        );
        const message = response.data?.choices?.[0]?.message?.content;
        if (!message) throw new LLMOutputError('Empty response from LLM');
        return message;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn({ attempt, error: lastError.message }, 'LLM call failed, retrying');
        if (attempt < MAX_ATTEMPTS) await this._delay(1000 * attempt * 2);
      }
    }
    throw lastError ?? new Error('LLM call failed after 3 attempts');
  }

  private async *_streamGenerator(payload: string): AsyncGenerator<string> {
    for (const line of payload.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) yield token;
      } catch {
        /* skip malformed SSE lines */
      }
    }
  }

  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
