import { LoggerOptions } from 'pino';
import { calculateCost, type TokenUsage } from '../services/cost';

const isDev = process.env.NODE_ENV !== 'production';

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev && {
    transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
  }),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'MONGODB_URI',
      'OPENROUTER_API_KEY',
      // Axios error dumps embed the outbound request headers — censor the key
      'err.config.headers.Authorization',
      'err.request._header',
      'err.config.request.headers.Authorization',
    ],
    censor: '[REDACTED]',
  },
};

export const logger = require('pino')(options);

export function logError(error: Error, context?: Record<string, unknown>): void {
  logger.error({ err: error, ...context }, error.message);
}

/** Phase 7 per-request chat log — every field the course asks to show. */
export interface ChatTurnLog {
  event: 'chat_turn';
  timestamp: string;
  requestId: string;
  sessionId: string;
  employeeId: string;
  role: string;
  stream: boolean;
  model: string;
  query: string;
  classificationType: string | null;
  classificationConfidence: number | null;
  classificationReasoning: string | null;
  toolsUsed: Array<{ name: string; ok: boolean }>;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  costUsd: number;
  costFormula: string;
  outcome: 'success' | 'error' | 'guardrail_blocked';
}

export function logChatTurn(entry: ChatTurnLog): void {
  logger.info(entry, 'chat_turn');
}

export function buildChatTurnLog(args: {
  requestId?: string;
  sessionId: string;
  employeeId: string;
  role: string;
  stream: boolean;
  model: string;
  query: string;
  classification?: { type: string; confidence: number; reasoning: string };
  toolsUsed: Array<{ name: string; ok: boolean }>;
  usage: TokenUsage;
  startedAt: number;
  outcome: ChatTurnLog['outcome'];
}): ChatTurnLog {
  const cost = calculateCost(args.usage);
  return {
    event: 'chat_turn',
    timestamp: new Date().toISOString(),
    requestId: args.requestId || 'unknown',
    sessionId: args.sessionId,
    employeeId: args.employeeId,
    role: args.role,
    stream: args.stream,
    model: args.model,
    query: args.query,
    classificationType: args.classification?.type ?? null,
    classificationConfidence: args.classification?.confidence ?? null,
    classificationReasoning: args.classification?.reasoning ?? null,
    toolsUsed: args.toolsUsed,
    promptTokens: args.usage.promptTokens,
    completionTokens: args.usage.completionTokens,
    totalTokens: args.usage.promptTokens + args.usage.completionTokens,
    latencyMs: Date.now() - args.startedAt,
    costUsd: cost.usd,
    costFormula: cost.formula,
    outcome: args.outcome,
  };
}
