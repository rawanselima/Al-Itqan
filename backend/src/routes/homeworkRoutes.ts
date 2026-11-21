import { Router, Request, Response } from 'express';
import HomeworkRecord from '../models/HomeworkRecord';
import Student from '../models/Student';

const router = Router();

// GET homework for a circle across a date range (e.g. Saturday to Thursday)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { circleId, startDate, endDate } = req.query;
    if (!circleId || !startDate || !endDate) {
      return res.status(400).json({ error: 'circleId و startDate و endDate مطلوبة' });
    }

    // Get all active students for this circle
    const students = await Student.find({ circleId, isActive: true }).sort({ name: 1 });

    // Fetch existing homework records in this range
    const records = await HomeworkRecord.find({
      circleId,
      date: { $gte: String(startDate), $lte: String(endDate) },
    });

    res.json({
      students,
      records,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST toggle homework completion status for student and date
router.post('/toggle', async (req: Request, res: Response) => {
  try {
    const { circleId, studentId, date, completed } = req.body;
    if (!circleId || !studentId || !date) {
      return res.status(400).json({ error: 'circleId و studentId و date مطلوبة' });
    }

    const record = await HomeworkRecord.findOneAndUpdate(
      { studentId, date },
      { circleId, studentId, date, completed: Boolean(completed) },
      { new: true, upsert: true }
    );

    res.json(record);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
