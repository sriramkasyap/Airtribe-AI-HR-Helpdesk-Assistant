import { Schema, model, type Document, type Model } from 'mongoose';

export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ConversationMemoryDoc extends Document {
  id: string;
  sessionId: string;
  userId: string;
  messages: StoredMessage[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<StoredMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, required: true },
  },
  { _id: false },
);

const schema = new Schema<ConversationMemoryDoc>(
  {
    id: { type: String, required: true, unique: true },
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, ref: 'Employee', required: true },
    messages: { type: [messageSchema], default: [] },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const ConversationMemoryModel: Model<ConversationMemoryDoc> = model<ConversationMemoryDoc>(
  'ConversationMemory',
  schema,
);
