import mongoose, { Schema } from 'mongoose';
import { Reimbursement } from '@ai-hr/shared-types';

const ReimbursementSchema = new Schema<Reimbursement>({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  type: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const ReimbursementModel = mongoose.model<Reimbursement>('Reimbursement', ReimbursementSchema);
