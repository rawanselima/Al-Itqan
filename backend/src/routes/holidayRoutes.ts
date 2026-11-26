import { Router, Request, Response } from 'express';
import Holiday from '../models/Holiday';
import AttendanceSession from '../models/AttendanceSession';
import { validate, asyncHandler } from '../middleware';
import {
  holidayCreateSchema,
  holidayParamsSchema,
  holidayQuerySchema,
} from '../schemas';

const router = Router();

// GET all holidays (optionally filtered by circleId)
router.get(
  '/',
  validate({ query: holidayQuerySchema.shape.query }),
  asyncHandler(async (req: Request, res: Response) => {
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
  })
);

// POST create holiday
router.post(
  '/',
  validate({ body: holidayCreateSchema.shape.body }),
  asyncHandler(async (req: Request, res: Response) => {
    const { circleId, from, to, reason } = req.body;

    const newHoliday = new Holiday({
      circleId: circleId || null,
      from,
      to,
      reason: reason || '',
    });

    const saved = await newHoliday.save();

    // Update existing attendance sessions in the same date range to mark as holiday
    const sessionFilter: any = {
      date: { $gte: from, $lte: to },
    };
    if (circleId) {
      sessionFilter.circleId = circleId;
    }
    await AttendanceSession.updateMany(sessionFilter, { $set: { isHoliday: true } });

    const populated = await Holiday.findById(saved._id).populate('circleId', 'name');
    res.status(201).json(populated);
  })
);

// DELETE holiday
router.delete(
  '/:id',
  validate({ params: holidayParamsSchema.shape.params }),
  asyncHandler(async (req: Request, res: Response) => {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ error: 'الإجازة غير موجودة' });
    }

    await Holiday.findByIdAndDelete(req.params.id);

    // Re-check affected attendance sessions to remove holiday flag if no other holiday covers them
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
  })
);

export default router;