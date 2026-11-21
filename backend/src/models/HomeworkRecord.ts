import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHomeworkRecord extends Document {
  circleId: Types.ObjectId;
  studentId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  completed: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HomeworkRecordSchema = new Schema<IHomeworkRecord>(
  {
    circleId: { type: Schema.Types.ObjectId, ref: 'Circle', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    completed: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

HomeworkRecordSchema.index({ studentId: 1, date: 1 }, { unique: true });
HomeworkRecordSchema.index({ circleId: 1, date: 1 });

export default mongoose.model<IHomeworkRecord>('HomeworkRecord', HomeworkRecordSchema);
