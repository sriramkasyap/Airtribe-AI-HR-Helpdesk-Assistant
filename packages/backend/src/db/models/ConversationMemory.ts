import mongoose, { Schema } from 'mongoose';
import { ChatMessage } from '@ai-hr/shared-types';

const messageSchema = new Schema<ChatMessage>({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ConversationMemorySchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  messages: [messageSchema],
  updatedAt: { type: Date, default: Date.now },
  expiresAt: Date,
}, { timestamps: true });

ConversationMemorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ConversationMemoryModel = mongoose.model('ConversationMemory', ConversationMemorySchema);
