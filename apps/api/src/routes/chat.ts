import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { LLMService } from '../services/llm.service';
import { MemoryService } from '../services/memory.service';

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  stream: z.boolean().optional().default(false),
});

const router = Router();
const llmService = new LLMService();
const memoryService = new MemoryService();

router.post('/', async (req, res) => {
  try {
    const { message, sessionId, stream } = chatSchema.parse(req.body);
    const employeeId = req.user?.employeeId || '';
    const role = req.user?.role || 'employee';
    const activeSessionId = sessionId || (await memoryService.createSession(employeeId)).sessionId;
    if (!sessionId) res.setHeader('X-Session-Id', activeSessionId);
    await memoryService.appendMessage(activeSessionId, 'user', message);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      for await (const token of llmService.streamChat(message, { employeeId, role })) {
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

    const history = await memoryService.getHistory(activeSessionId);
    const result = await llmService.classifyAndPlan(message, { employeeId, role }, history);
    await memoryService.appendMessage(activeSessionId, 'assistant', result.response);
    res.json({ success: true, data: { ...result, sessionId: activeSessionId } });
  } catch (error) {
    logger.error(error, { section: 'chat', operation: 'chat' });
    res.status(500).json({ success: false, error: { code: 'CHAT_ERROR', message: 'Unable to process request' } });
  }
});

export { router as chatRouter };
