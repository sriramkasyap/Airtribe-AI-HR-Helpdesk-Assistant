import mongoose, { Schema } from 'mongoose';
import { HRPolicy } from '@ai-hr/shared-types';

const HRPolicySchema = new Schema<HRPolicy>({
  title: { type: String, required: true },
  category: { type: String, required: true },
  content: { type: String, required: true },
  effectiveDate: Date,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

HRPolicySchema.index({ title: 'text', content: 'text' });

export const HRPolicyModel = mongoose.model<HRPolicy>('HRPolicy', HRPolicySchema);
