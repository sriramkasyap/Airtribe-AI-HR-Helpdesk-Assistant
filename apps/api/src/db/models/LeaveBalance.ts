import { Schema, model, type Document, type Model } from 'mongoose';

export interface LeaveBalanceDoc extends Document {
  id: string;
  employeeId: string;
  casualLeave: number;
  sickLeave: number;
  earnedLeave: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<LeaveBalanceDoc>(
  {
    id: { type: String, required: true, unique: true },
    employeeId: { type: String, ref: 'Employee', required: true, index: true },
    casualLeave: { type: Number, default: 0 },
    sickLeave: { type: Number, default: 0 },
    earnedLeave: { type: Number, default: 0 },
    year: { type: Number, required: true },
  },
  { timestamps: true },
);

export const LeaveBalanceModel: Model<LeaveBalanceDoc> = model<LeaveBalanceDoc>('LeaveBalance', schema);
