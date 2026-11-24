import { Router, Request, Response } from 'express';
import Holiday from '../models/Holiday';
import AttendanceSession from '../models/AttendanceSession';

const router = Router();

// GET all holidays (optionally filtered by circleId)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { circleId } = req.query;
    let query: any = {};

    if (circleId) {
      // إجازات عامة (null) + إجازات خاصة بهذه الحلقة
      query = {
        $or: [{ circleId: null }, { circleId }],
      };
    }

    const holidays = await Holiday.find(query).populate('circleId', 'name').sort({ from: 1 });
    res.json(holidays);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create holiday
router.post('/', async (req: Request, res: Response) => {
  try {
    const { circleId, from, to, reason } = req.body;

    if (!from || !to) {
      return res.status(400).json({ error: 'تاريخ البداية (from) وتاريخ النهاية (to) حقول مطلوبة' });
    }

    // تحقق من صيغة التاريخ YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(from) || !dateRegex.test(to)) {
      return res.status(400).json({ error: 'صيغة التاريخ يجب أن تكون YYYY-MM-DD' });
    }

    if (from > to) {
      return res.status(400).json({ error: 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية' });
    }

    const newHoliday = new Holiday({
      circleId: circleId || null,
      from,
      to,
      reason: reason || '',
    });

    const saved = await newHoliday.save();

    // تحديث الجلسات المسجلة في نفس الفترة الزمنية لتصبح إجازة تلقائياً
    const sessionFilter: any = {
      date: { $gte: from, $lte: to },
    };
    if (circleId) {
      sessionFilter.circleId = circleId;
    }
    await AttendanceSession.updateMany(sessionFilter, { $set: { isHoliday: true } });

    const populated = await Holiday.findById(saved._id).populate('circleId', 'name');
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE holiday
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ error: 'الإجازة غير موجودة' });
    }

    await Holiday.findByIdAndDelete(req.params.id);

    // إعادة فحص الجلسات في نطاق الإجازة المحذوفة لإلغاء الإجازة إذا لم تعد مشمولة بأي عطلة أخرى
    const sessionFilter: any = {
      date: { $gte: holiday.from, $lte: holiday.to },
    };
    if (holiday.circleId) {
      sessionFilter.circleId = holiday.circleId;
    }
    const affectedSessions = await AttendanceSession.find(sessionFilter);
    for (const sess of affectedSessions) {
      const remainingHoliday = await Holiday.findOne({
        $or: [{ circleId: null }, { circleId: sess.circleId }],
        from: { $lte: sess.date },
        to: { $gte: sess.date },
      });
      if (!remainingHoliday) {
        sess.isHoliday = false;
        await sess.save();
      }
    }

    res.json({ message: 'تم حذف الإجازة بنجاح' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
