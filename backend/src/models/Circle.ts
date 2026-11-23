import mongoose, { Schema, Document } from 'mongoose';

export interface ICircle extends Document {
  name: string;
  teacherName: string;
  days: number[]; // 0=الأحد, 1=الإثنين, 2=الثلاثاء, 3=الأربعاء, 4=الخميس, 5=الجمعة, 6=السبت
  time: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CircleSchema = new Schema<ICircle>(
  {
    name: { type: String, required: true, trim: true },
    teacherName: { type: String, default: '', trim: true },
    days: [{ type: Number, min: 0, max: 6, required: true }],
    time: { type: String, required: true, trim: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<ICircle>('Circle', CircleSchema);
