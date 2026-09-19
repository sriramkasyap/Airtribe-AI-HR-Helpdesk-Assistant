import { ConversationMemoryModel } from '../db/models';
import { logger } from '../utils/logger';

const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS || '24', 10);

export class MemoryService {
  async createSession(userId: string): Promise<{ sessionId: string }> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
    await ConversationMemoryModel.create({ sessionId, userId, messages: [], expiresAt });
    logger.info({ sessionId, userId }, 'Session created');
    return { sessionId };
  }

  async appendMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    await ConversationMemoryModel.updateOne(
      { sessionId },
      { $push: { messages: { role, content, timestamp: new Date() } }, updatedAt: new Date() }
    );
  }

  async getHistory(sessionId: string, limit: number = 20): Promise<{ role: 'user' | 'assistant'; content: string; timestamp: string }[]> {
    const session = await ConversationMemoryModel.findOne({ sessionId }).sort({ updatedAt: -1 });
    if (!session) return [];
    return (session.messages || []).slice(-limit).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.timestamp.toISOString(),
    }));
  }

  async cleanupExpired(): Promise<number> {
    const result = await ConversationMemoryModel.deleteMany({ expiresAt: { $lt: new Date() } });
    logger.info({ deleted: result.deletedCount }, 'Cleaned up expired sessions');
    return result.deletedCount;
  }

  async getSessionCount(): Promise<number> {
    return ConversationMemoryModel.countDocuments();
  }
}
