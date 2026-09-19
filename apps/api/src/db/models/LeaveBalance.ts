import mongoose, { Schema } from 'mongoose';
import { LeaveBalance } from '@ai-hr/shared-types';

const LeaveBalanceSchema = new Schema<LeaveBalance>({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  casualLeave: { type: Number, default: 21 },
  sickLeave: { type: Number, default: 12 },
  earnedLeave: { type: Number, default: 18 },
  year: { type: Number, required: true },
}, { timestamps: true });

LeaveBalanceSchema.index({ employee: 1, year: 1 }, { unique: true });

export const LeaveBalanceModel = mongoose.model<LeaveBalance>('LeaveBalance', LeaveBalanceSchema);
