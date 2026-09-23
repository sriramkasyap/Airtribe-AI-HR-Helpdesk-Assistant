import { Router } from 'express';
import { z } from 'zod';
import { buildChatTurnLog, logChatTurn, logError } from '../utils/logger';
import { LLMService, MODEL, type LLMOutput } from '../services/llm.service';
import { MemoryService } from '../services/memory.service';
import { executeToolCalls } from '../services/toolExecutor';
import type { ExecutedTool } from '../services/toolExecutor';
import { addUsage, emptyUsage, type TokenUsage } from '../services/cost';

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  stream: z.boolean().optional().default(false),
});

const router: Router = Router();
const llmService = new LLMService();
const memoryService = new MemoryService();

function serializeExecutedTools(
  executed: ExecutedTool[],
): Array<{ name: string; ok: boolean; data: unknown }> {
  return executed.map((t) => ({ name: t.name, ok: t.ok, data: t.summary }));
}

function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('OPENROUTER_API_KEY')) {
    return 'Assistant is not configured: missing OPENROUTER_API_KEY';
  }
  return 'Unable to process request';
}

function writeChatLog(args: {
  reqId?: string;
  sessionId: string;
  employeeId: string;
  role: string;
  stream: boolean;
  query: string;
  plan?: LLMOutput;
  executed: ExecutedTool[];
  usage: TokenUsage;
  startedAt: number;
  outcome: 'success' | 'error';
}): void {
  logChatTurn(
    buildChatTurnLog({
      requestId: args.reqId,
      sessionId: args.sessionId,
      employeeId: args.employeeId,
      role: args.role,
      stream: args.stream,
      model: MODEL,
      query: args.query,
      classification: args.plan?.classification,
      toolsUsed: args.executed.map((t) => ({ name: t.name, ok: t.ok })),
      usage: args.usage,
      startedAt: args.startedAt,
      outcome: args.outcome,
    }),
  );
}

router.post('/', async (req, res) => {
  const startedAt = Date.now();
  try {
    const { message, sessionId, stream } = chatSchema.parse(req.body);
    const employeeId = req.user?.employeeId || '';
    const role = req.user?.role || 'employee';
    const context = { employeeId, role };
    const activeSessionId = sessionId || (await memoryService.createSession(employeeId)).sessionId;
    if (!sessionId) res.setHeader('X-Session-Id', activeSessionId);
    await memoryService.appendMessage(activeSessionId, 'user', message);
    const history = await memoryService.getHistory(activeSessionId);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const send = (event: Record<string, unknown>) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      let full = '';
      let usage = emptyUsage();
      let plan: LLMOutput | undefined;
      let executed: ExecutedTool[] = [];
      let outcome: 'success' | 'error' = 'success';
      try {
        // 1) LLM turn 1: classify + plan tool calls
        send({ type: 'status', stage: 'understanding' });
        const planned = await llmService.classifyAndPlan(message, context, history);
        plan = planned.plan;
        usage = addUsage(usage, planned.usage);

        // 2) Execute requested tools (failures captured per-call, never thrown)
        if (plan.toolCalls.length > 0) {
          send({ type: 'status', stage: 'tools' });
          executed = await executeToolCalls(plan.toolCalls, context);
          for (const tool of executed) {
            send({ type: 'tool', name: tool.name, ok: tool.ok });
          }
        }

        // 3) Stream the final answer token by token
        send({ type: 'status', stage: 'composing' });
        if (executed.length > 0) {
          try {
            const streamUsage = emptyUsage();
            for await (const token of llmService.streamAnswer(message, context, history, executed, streamUsage)) {
              full += token;
              send({ type: 'token', content: token });
            }
            usage = addUsage(usage, streamUsage);
          } catch (error) {
            // Streaming composition failed — fall back to the plan's own response
            logError(error as Error, { section: 'chat', event: 'stream composition failed' });
            full = plan.response;
            for (const token of chunkString(full, 24)) {
              send({ type: 'token', content: token });
            }
          }
        } else {
          // No tools needed — turn 1 already produced the complete answer
          full = plan.response;
          for (const token of chunkString(full, 24)) {
            send({ type: 'token', content: token });
          }
        }

        await memoryService.appendMessage(activeSessionId, 'assistant', full);
        send({ type: 'suggestions', items: plan.followUpSuggestions ?? [] });
        send({ type: 'done' });
      } catch (error) {
        outcome = 'error';
        logError(error as Error, { section: 'chat', event: 'stream failed' });
        send({ type: 'error', message: friendlyError(error) });
        send({ type: 'done' });
      } finally {
        writeChatLog({
          reqId: req.id,
          sessionId: activeSessionId,
          employeeId,
          role,
          stream: true,
          query: message,
          plan,
          executed,
          usage,
          startedAt,
          outcome,
        });
        res.end();
      }
      return;
    }

    // Non-streaming: same two-turn flow, structured JSON response
    let usage = emptyUsage();
    const planned = await llmService.classifyAndPlan(message, context, history);
    let finalOutput = planned.plan;
    usage = addUsage(usage, planned.usage);
    const executed = await executeToolCalls(planned.plan.toolCalls, context);

    if (executed.length > 0) {
      try {
        const composed = await llmService.composeWithToolResults(message, planned.plan, executed, history, context);
        finalOutput = composed.plan;
        usage = addUsage(usage, composed.usage);
      } catch (error) {
        // Fall back to the plan's own response if composition fails
        logError(error as Error, { section: 'chat', event: 'tool composition failed' });
      }
    }

    await memoryService.appendMessage(activeSessionId, 'assistant', finalOutput.response);
    writeChatLog({
      reqId: req.id,
      sessionId: activeSessionId,
      employeeId,
      role,
      stream: false,
      query: message,
      plan: finalOutput,
      executed,
      usage,
      startedAt,
      outcome: 'success',
    });
    res.json({
      success: true,
      data: {
        ...finalOutput,
        sessionId: activeSessionId,
        toolsUsed: serializeExecutedTools(executed),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid request' } });
      return;
    }
    logError(error as Error, { section: 'chat' });
    res.status(503).json({ success: false, error: { code: 'LLM_UNAVAILABLE', message: friendlyError(error) } });
  }
});

export default router;
