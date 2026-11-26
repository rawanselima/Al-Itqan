import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttendanceRecord {
  studentId: Types.ObjectId;
  status: 'present' | 'absent' | 'excused' | 'unrecorded';
  hasRecited: boolean;
  order?: number | null;
  notes?: string;
  homeworkCompleted?: boolean;
  departureTime?: string | null;
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
    homeworkCompleted: { type: Boolean, default: false },
    departureTime: { type: String, default: null },
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

// Unique compound index - one session per circle per date
AttendanceSessionSchema.index({ circleId: 1, date: 1 }, { unique: true });

// Additional indexes for reports
AttendanceSessionSchema.index({ circleId: 1, isHoliday: 1, date: 1 });
AttendanceSessionSchema.index({ date: 1 }); // For holiday checks across all circles

export default mongoose.model<IAttendanceSession>('AttendanceSession', AttendanceSessionSchema);