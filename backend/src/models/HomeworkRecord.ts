import mongoose, { Schema, Document, Types } from 'mongoose';

export type HomeworkStatus = 'done' | 'notDone' | 'partial';

export interface IHomeworkRecord extends Document {
  circleId: Types.ObjectId;
  studentId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  status: HomeworkStatus; // done (✅) | notDone (❗) | partial (☑️)
  completed?: boolean; // مؤقت للتوافقية إن لزم
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HomeworkRecordSchema = new Schema<IHomeworkRecord>(
  {
    circleId: { type: Schema.Types.ObjectId, ref: 'Circle', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    status: {
      type: String,
      enum: ['done', 'notDone', 'partial'],
      default: 'notDone',
    },
    completed: { type: Boolean },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// قيد فريد يمنع تكرار الواجب لنفس الطالبة في نفس التاريخ
HomeworkRecordSchema.index({ studentId: 1, date: 1 }, { unique: true });
HomeworkRecordSchema.index({ circleId: 1, date: 1 });

export default mongoose.model<IHomeworkRecord>('HomeworkRecord', HomeworkRecordSchema);
