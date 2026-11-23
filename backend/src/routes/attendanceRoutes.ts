import { Router, Request, Response } from 'express';
import AttendanceSession from '../models/AttendanceSession';
import Student from '../models/Student';
import Circle from '../models/Circle';

const router = Router();

// GET attendance session for a circle and date
// If not yet created, returns a draft initialized with all active students of this circle

router.get('/', async (req: Request, res: Response) => {
  try {
    const { circleId, date } = req.query;
    if (!circleId || !date) {
      return res.status(400).json({ error: 'circleId و date حقول مطلوبة' });
    }

    const circle = await Circle.findById(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }

    // Get all active students for this circle
    const students = await Student.find({ circleId, isActive: true }).sort({ name: 1 });

    // Look for existing session
    const session = await AttendanceSession.findOne({ circleId, date: String(date) });

    if (!session) {
      // Build draft records
      const draftRecords = students.map((st) => ({
        studentId: st._id,
        studentName: st.name,
        phone: st.phone,
        status: 'unrecorded',
        hasRecited: false,
        order: null,
        notes: '',
      }));

      return res.json({
        circleId,
        date,
        isNew: true,
        isHoliday: false,
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
          departureTime: rec.departureTime || null,
        };
      }
      return {
        studentId: st._id,
        studentName: st.name,
        phone: st.phone,
        status: 'unrecorded',
        hasRecited: false,
        order: null,
        notes: '',
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
      isHoliday: Boolean(session.isHoliday),
      records: mergedRecords,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST save or update attendance session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { circleId, date, records, isHoliday } = req.body;
    if (!circleId || !date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'circleId و date و records مطلوبة' });
    }

    const cleanRecords = records.map((r: any) => ({
      studentId: r.studentId,
      status: r.status,
      hasRecited: Boolean(r.hasRecited),
      order: r.order ?? null,
      notes: r.notes || '',
      departureTime: r.departureTime || null,
    }));

    const session = await AttendanceSession.findOneAndUpdate(
      { circleId, date },
      { circleId, date, isHoliday: Boolean(isHoliday), records: cleanRecords },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ message: 'تم حفظ سجل الحضور بنجاح', session });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
