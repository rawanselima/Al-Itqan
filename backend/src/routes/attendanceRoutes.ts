import { Router, Request, Response } from 'express';
import AttendanceSession from '../models/AttendanceSession';
import Student from '../models/Student';
import Circle from '../models/Circle';
import Holiday from '../models/Holiday';
import { validate, asyncHandler } from '../middleware';
import {
  attendanceSaveSchema,
  attendanceQuerySchema,
} from '../schemas';

const router = Router();

// GET attendance session for a circle and date
router.get(
  '/',
  validate({ query: attendanceQuerySchema.shape.query }),
  asyncHandler(async (req: Request, res: Response) => {
    const { circleId, date } = req.query;

    const circle = await Circle.findById(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }

    // Get all active students for this circle (excluding soft-deleted)
    const students = await Student.find({ circleId, isActive: true, deletedAt: null }).sort({ name: 1 });

    // Look for existing session
    const session = await AttendanceSession.findOne({ circleId, date: String(date) });

    // Check if this date falls within any official holiday
    const matchingHoliday = await Holiday.findOne({
      $or: [{ circleId: null }, { circleId }],
      from: { $lte: String(date) },
      to: { $gte: String(date) },
    });
    const isOfficialHoliday = Boolean(matchingHoliday);
    const holidayReason = matchingHoliday?.reason || (isOfficialHoliday ? 'إجازة رسمية' : '');

    if (!session) {
      // Build draft records
      const draftRecords = students.map((st) => ({
        studentId: st._id,
        studentName: st.name,
        phone: st.phone,
        status: 'unrecorded' as const,
        hasRecited: false,
        order: null,
        notes: '',
        homeworkCompleted: false,
        departureTime: null,
      }));

      return res.json({
        circleId,
        date,
        isNew: true,
        isHoliday: isOfficialHoliday,
        isOfficialHoliday,
        holidayReason,
        records: draftRecords,
      });
    }

    // Map existing session records and merge any newly added students
    const existingMap = new Map();
    session.records.forEach((r) => {
      existingMap.set(String(r.studentId), r);
    });

    const mergedRecords = students.map((st) => {
      const rec = existingMap.get(String(st._id));
      if (rec) {
        return {
          studentId: st._id,
          studentName: st.name,
          phone: st.phone,
          status: rec.status,
          hasRecited: rec.hasRecited,
          order: rec.order,
          notes: rec.notes || '',
          homeworkCompleted: rec.homeworkCompleted || false,
          departureTime: rec.departureTime || null,
        };
      }
      return {
        studentId: st._id,
        studentName: st.name,
        phone: st.phone,
        status: 'unrecorded' as const,
        hasRecited: false,
        order: null,
        notes: '',
        homeworkCompleted: false,
        departureTime: null,
      };
    });

    // Sort: students with order (1, 2, 3...) first, then by name
    mergedRecords.sort((a, b) => {
      if (a.order !== null && b.order !== null) return a.order - b.order;
      if (a.order !== null) return -1;
      if (b.order !== null) return 1;
      return a.studentName.localeCompare(b.studentName, 'ar');
    });

    res.json({
      _id: session._id,
      circleId,
      date,
      isNew: false,
      isHoliday: Boolean(session.isHoliday || isOfficialHoliday),
      isOfficialHoliday,
      holidayReason,
      records: mergedRecords,
    });
  })
);

// POST save or update attendance session
router.post(
  '/',
  validate({ body: attendanceSaveSchema.shape.body }),
  asyncHandler(async (req: Request, res: Response) => {
    const { circleId, date, records, isHoliday } = req.body;

    const cleanRecords = records.map((r: any) => ({
      studentId: r.studentId,
      status: r.status,
      hasRecited: Boolean(r.hasRecited),
      order: r.order ?? null,
      notes: r.notes || '',
      homeworkCompleted: Boolean(r.homeworkCompleted),
      departureTime: r.departureTime || null,
    }));

    const session = await AttendanceSession.findOneAndUpdate(
      { circleId, date },
      { circleId, date, isHoliday: Boolean(isHoliday), records: cleanRecords },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ message: 'تم حفظ سجل الحضور بنجاح', session });
  })
);

export default router;