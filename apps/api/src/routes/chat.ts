import { Router } from 'express';
import { z } from 'zod';
import { logError } from '../utils/logger';
import { LLMService } from '../services/llm.service';
import { MemoryService } from '../services/memory.service';
import { executeToolCalls } from '../services/toolExecutor';
import type { ExecutedTool } from '../services/toolExecutor';

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

router.post('/', async (req, res) => {
  try {
    const { message, sessionId, stream } = chatSchema.parse(req.body);
    const employeeId = req.user?.employeeId || '';
    const role = req.user?.role || 'employee';
    const context = { employeeId, role };
    const activeSessionId = sessionId || (await memoryService.createSession(employeeId)).sessionId;
    if (!sessionId) res.setHeader('X-Session-Id', activeSessionId);
    await memoryService.appendMessage(activeSessionId, 'user', message);

    // 1) LLM turn 1: classify + plan tool calls
    const history = await memoryService.getHistory(activeSessionId);
    const plan = await llmService.classifyAndPlan(message, context, history);

    // 2) Execute requested tools (failures captured per-call, never thrown)
    const executed = await executeToolCalls(plan.toolCalls, context);

    // 3) LLM turn 2: compose the final answer with tool evidence
    let finalOutput = plan;
    if (executed.length > 0) {
      try {
        finalOutput = await llmService.composeWithToolResults(message, plan, executed, history);
      } catch (error) {
        // Fall back to the plan's own response if composition fails
        logError(error as Error, { section: 'chat', event: 'tool composition failed' });
      }
    }

    await memoryService.appendMessage(activeSessionId, 'assistant', finalOutput.response);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      for (const token of chunkString(finalOutput.response, 24)) {
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

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
    const message = error instanceof Error && error.message.includes('OPENROUTER_API_KEY')
      ? 'Assistant is not configured: missing OPENROUTER_API_KEY'
      : 'Unable to process request';
    res.status(503).json({ success: false, error: { code: 'LLM_UNAVAILABLE', message } });
  }
});

export default router;
