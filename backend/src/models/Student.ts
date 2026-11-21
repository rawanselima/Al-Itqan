import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  phone: string;
  circleId: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    circleId: { type: Schema.Types.ObjectId, ref: 'Circle', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IStudent>('Student', StudentSchema);
