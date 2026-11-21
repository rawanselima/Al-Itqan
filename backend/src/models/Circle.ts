import mongoose, { Schema, Document } from 'mongoose';

export interface ICircle extends Document {
  name: string;
  days: string[];
  time: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CircleSchema = new Schema<ICircle>(
  {
    name: { type: String, required: true, trim: true },
    days: [{ type: String, required: true }],
    time: { type: String, required: true, trim: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<ICircle>('Circle', CircleSchema);
