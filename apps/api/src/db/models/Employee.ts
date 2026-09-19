import mongoose, { Schema } from 'mongoose';
import { Employee } from '@ai-hr/shared-types';

const EmployeeSchema = new Schema<Employee>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  role: { type: String, enum: ['employee', 'manager'], default: 'employee' },
  hireDate: Date,
}, { timestamps: true });

export const EmployeeModel = mongoose.model<Employee>('Employee', EmployeeSchema);
