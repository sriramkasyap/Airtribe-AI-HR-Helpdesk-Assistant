import { Schema, model, type Document, type Model } from 'mongoose';

export interface LeaveBalanceFields {
  casualLeave: number;
  sickLeave: number;
  earnedLeave: number;
  year: number;
}

export interface EmployeeDoc extends Document {
  id: string;
  name: string;
  email: string;
  department: string;
  role: 'employee' | 'manager';
  hireDate: Date;
  leaveBalance: LeaveBalanceFields;
  createdAt: Date;
  updatedAt: Date;
}

const leaveBalanceSchema = new Schema<LeaveBalanceFields>(
  {
    casualLeave: { type: Number, default: 0 },
    sickLeave: { type: Number, default: 0 },
    earnedLeave: { type: Number, default: 0 },
    year: { type: Number, required: true },
  },
  { _id: false },
);

const schema = new Schema<EmployeeDoc>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    role: { type: String, enum: ['employee', 'manager'], required: true },
    hireDate: { type: Date, required: true },
    leaveBalance: { type: leaveBalanceSchema, required: true },
  },
  { timestamps: true },
);

export const EmployeeModel: Model<EmployeeDoc> = model<EmployeeDoc>('Employee', schema);
