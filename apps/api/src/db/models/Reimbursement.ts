import { Schema, model, type Document, type Model } from 'mongoose';

export interface ReimbursementDoc extends Document {
  id: string;
  employeeId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  type: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ReimbursementDoc>(
  {
    id: { type: String, required: true, unique: true },
    employeeId: { type: String, ref: 'Employee', required: true, index: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    type: { type: String, required: true },
    submittedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

export const ReimbursementModel: Model<ReimbursementDoc> = model<ReimbursementDoc>('Reimbursement', schema);
