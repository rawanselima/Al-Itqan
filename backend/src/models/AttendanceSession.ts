import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttendanceRecord {
  studentId: Types.ObjectId;
  status: 'present' | 'absent' | 'excused' | 'unrecorded';
  hasRecited: boolean;
  order?: number | null;
  notes?: string;
}

export interface IAttendanceSession extends Document {
  circleId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  isHoliday?: boolean;
  records: IAttendanceRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'excused', 'unrecorded'],
      default: 'unrecorded',
    },
    hasRecited: { type: Boolean, default: false },
    order: { type: Number, default: null },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const AttendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    circleId: { type: Schema.Types.ObjectId, ref: 'Circle', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    isHoliday: { type: Boolean, default: false },
    records: [AttendanceRecordSchema],
  },
  { timestamps: true }
);

AttendanceSessionSchema.index({ circleId: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendanceSession>('AttendanceSession', AttendanceSessionSchema);
