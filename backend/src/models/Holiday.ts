import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHoliday extends Document {
  circleId?: Types.ObjectId | null; // لو null أو غير محدد = إجازة عامة لجميع الحلقات
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    circleId: {
      type: Schema.Types.ObjectId,
      ref: 'Circle',
      default: null,
    },
    from: { type: String, required: true }, // YYYY-MM-DD
    to: { type: String, required: true }, // YYYY-MM-DD
    reason: { type: String, default: '' },
  },
  { timestamps: true }
);

// Indexes for efficient holiday lookups
HolidaySchema.index({ circleId: 1, from: 1, to: 1 });
HolidaySchema.index({ from: 1, to: 1 }); // For general holiday checks (circleId: null)
HolidaySchema.index({ circleId: 1 }); // For listing holidays by circle

export default mongoose.model<IHoliday>('Holiday', HolidaySchema);