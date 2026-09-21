import { Schema, model, type Document, type Model } from 'mongoose';

export interface EmployeeDoc extends Document {
  id: string;
  name: string;
  email: string;
  department: string;
  role: 'employee' | 'manager';
  hireDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<EmployeeDoc>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    role: { type: String, enum: ['employee', 'manager'], required: true },
    hireDate: { type: Date, required: true },
  },
  { timestamps: true },
);

export const EmployeeModel: Model<EmployeeDoc> = model<EmployeeDoc>('Employee', schema);
