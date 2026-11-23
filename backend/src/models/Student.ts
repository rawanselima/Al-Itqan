import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  phone: string;
  circleId: Types.ObjectId;
  isActive: boolean;
  joinedAt: string; // YYYY-MM-DD
  leftAt?: string | null; // YYYY-MM-DD أو null
  warningForRemoval: boolean; // علامة تحذير بالحذف ⚠️
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    circleId: { type: Schema.Types.ObjectId, ref: 'Circle', required: true },
    isActive: { type: Boolean, default: true },
    joinedAt: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    leftAt: { type: String, default: null },
    warningForRemoval: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IStudent>('Student', StudentSchema);
