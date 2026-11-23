import { Router, Request, Response } from 'express';
import Holiday from '../models/Holiday';

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
    const populated = await Holiday.findById(saved._id).populate('circleId', 'name');
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE holiday
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await Holiday.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'الإجازة غير موجودة' });
    }
    res.json({ message: 'تم حذف الإجازة بنجاح' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
