import axios from 'axios';
import { LLMOutput, parseStructuredOutput, LLMOutputError } from './llm.service';
import { buildSystemPrompt } from './prompt';
import { logger } from '../utils/logger';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const MODEL = 'glm-5.3-flash';
const TEMPERATURE = 0.3;
const MAX_TOKENS = 4096;
const TIMEOUT_MS = 30000;
const INPUT_RATE = 0.002 / 1_000_000;
const OUTPUT_RATE = 0.004 / 1_000_000;

interface ToolContext {
  employeeId: string;
  role: 'employee' | 'manager';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class LLMService {
  private client = axios.create({ baseURL: 'https://openrouter.ai/api/v1', timeout: TIMEOUT_MS });

  async classifyAndPlan(userMessage: string, context: ToolContext, history: ChatMessage[] = []): Promise<LLMOutput> {
    const prompt = buildSystemPrompt(userMessage, history);
    const result = await this.callLLM(prompt);
    const parsed = parseStructuredOutput(result);
    return parsed;
  }

  async streamChat(userMessage: string, context: ToolContext, history: ChatMessage[] = []): Promise<AsyncGenerator<string>> {
    const prompt = buildSystemPrompt(userMessage, history);
    const response = await this.client.post(
      '/chat/completions',
      {
        model: MODEL,
        messages: [{ role: 'system', content: prompt }, { role: 'user', content: userMessage }],
        stream: true,
        temperature: 0.5,
        max_tokens: MAX_TOKENS,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': FRONTEND_URL,
          'X-Title': 'HR-Helpdesk-Assistant',
        },
      }
    );

    return this._streamGenerator(response.data);
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    return inputTokens * INPUT_RATE + outputTokens * OUTPUT_RATE;
  }

  private async callLLM(prompt: string): Promise<string> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await this.client.post(
          '/chat/completions',
          {
            model: MODEL,
            messages: [{ role: 'system', content: prompt }, { role: 'user', content: 'Respond in JSON.' }],
            temperature: TEMPERATURE,
            max_tokens: MAX_TOKENS,
          },
          {
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              'HTTP-Referer': FRONTEND_URL,
              'X-Title': 'HR-Helpdesk-Assistant',
            },
          }
        );

        const message = response.data?.choices?.[0]?.message?.content;
        if (!message) throw new LLMOutputError('Empty response from LLM');
        return message;
      } catch (error) {
        lastError = error as Error;
        logger.warn({ attempt, error: (error as Error).message }, 'LLM call failed, retrying');
        if (attempt < 3) await this._delay(1000 * attempt * 2);
      }
    }
    throw lastError || new Error('LLM call failed after 3 attempts');
  }

  private async *_streamGenerator(data: unknown): AsyncGenerator<string> {
    const lines = typeof data === 'string' ? data.split('\n') : [];
    for (const line of lines) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const parsed = JSON.parse(line.slice(6));
          const token = parsed?.choices?.[0]?.delta?.content;
          if (token) yield token;
        } catch {
          /* skip malformed lines */
        }
      }
    }
  }

  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
