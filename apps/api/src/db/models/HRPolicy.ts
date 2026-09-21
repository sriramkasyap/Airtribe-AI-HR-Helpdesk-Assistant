import { Schema, model, type Document, type Model } from 'mongoose';

export interface HRPolicyDoc extends Document {
  id: string;
  title: string;
  category: string;
  content: string;
  effectiveDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<HRPolicyDoc>(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    content: { type: String, required: true },
    effectiveDate: { type: Date, default: () => new Date() },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const HRPolicyModel: Model<HRPolicyDoc> = model<HRPolicyDoc>('HRPolicy', schema);
