import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  phone: string;
  circleId: Types.ObjectId;
  isActive: boolean;
  joinedAt: string; // YYYY-MM-DD
  leftAt?: string | null; // YYYY-MM-DD أو null
  warningForRemoval: boolean; // علامة تحذير بالحذف ⚠️
  deletedAt?: Date | null; // Soft delete timestamp
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
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes for common queries
StudentSchema.index({ circleId: 1, isActive: 1, name: 1 }); // For listing active students in a circle
StudentSchema.index({ circleId: 1, isActive: 1 }); // For count queries
StudentSchema.index({ name: 'text', phone: 'text' }); // For search
StudentSchema.index({ deletedAt: 1 }); // For soft delete queries

// Virtual for checking if student is soft deleted
StudentSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

// Ensure virtuals are included in JSON
StudentSchema.set('toJSON', { virtuals: true });
StudentSchema.set('toObject', { virtuals: true });

export default mongoose.model<IStudent>('Student', StudentSchema);