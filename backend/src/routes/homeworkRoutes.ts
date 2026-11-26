import { Router, Request, Response } from 'express';
import HomeworkRecord from '../models/HomeworkRecord';
import Student from '../models/Student';
import { validate, asyncHandler } from '../middleware';
import {
  homeworkToggleSchema,
  homeworkQuerySchema,
  paginationSchema,
} from '../schemas';

const router = Router();

// GET homework for a circle across a date range with pagination
router.get(
  '/',
  validate({ query: homeworkQuerySchema.shape.query }),
  asyncHandler(async (req: Request, res: Response) => {
    const { circleId, startDate, endDate, page = 1, limit = 1000 } = req.query;

    // Get all active students for this circle (excluding soft-deleted)
    const students = await Student.find({ circleId, isActive: true, deletedAt: null }).sort({ name: 1 });

    // Fetch existing homework records in this range
    const records = await HomeworkRecord.find({
      circleId,
      date: { $gte: String(startDate), $lte: String(endDate) },
    });

    res.json({
      students,
      records,
    });
  })
);

// POST toggle homework completion status for student and date
router.post(
  '/toggle',
  validate({ body: homeworkToggleSchema.shape.body }),
  asyncHandler(async (req: Request, res: Response) => {
    const { circleId, studentId, date, completed, status } = req.body;

    let finalStatus: 'done' | 'notDone' | 'partial' = 'notDone';
    if (status && ['done', 'notDone', 'partial'].includes(status)) {
      finalStatus = status;
    } else if (completed !== undefined) {
      finalStatus = completed ? 'done' : 'notDone';
    }

    const record = await HomeworkRecord.findOneAndUpdate(
      { studentId, circleId, date },
      {
        circleId,
        studentId,
        date,
        status: finalStatus,
        completed: finalStatus === 'done',
      },
      { new: true, upsert: true }
    );

    res.json(record);
  })
);

export default router;