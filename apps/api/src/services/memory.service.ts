import { randomUUID } from 'crypto';
import { ConversationMemoryModel } from '../db/models/ConversationMemory';
import type { StoredMessage } from '../db/models/ConversationMemory';

export interface MemoryChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StoredConversation {
  id: string;
  sessionId: string;
  userId: string;
  messages: StoredMessage[];
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export class MemoryService {
  async createSession(userId: string): Promise<StoredConversation> {
    const created = await ConversationMemoryModel.create({
      id: randomUUID(),
      sessionId: randomUUID(),
      userId,
      messages: [],
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    return created.toObject() as StoredConversation;
  }

  async getConversation(sessionId: string): Promise<StoredConversation | null> {
    return (await ConversationMemoryModel.findOne({ sessionId }).lean()) as StoredConversation | null;
  }

  async appendMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    await ConversationMemoryModel.updateOne(
      { sessionId },
      { $push: { messages: { role, content, timestamp: new Date() } } },
    );
  }

  async getHistory(sessionId: string): Promise<MemoryChatMessage[]> {
    const conversation = await this.getConversation(sessionId);
    return (conversation?.messages ?? []).map((m) => ({ role: m.role, content: m.content }));
  }

  async expireConversations(): Promise<void> {
    await ConversationMemoryModel.deleteMany({ expiresAt: { $lt: new Date() } });
  }
}
