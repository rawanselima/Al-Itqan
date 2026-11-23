import { Router, Request, Response } from 'express';
import Circle from '../models/Circle';
import Student from '../models/Student';

const router = Router();

// GET all circles with student count
router.get('/', async (_req: Request, res: Response) => {
  try {
    const circles = await Circle.find().sort({ createdAt: -1 });
    
    // Attach student counts
    const circlesWithCount = await Promise.all(
      circles.map(async (c) => {
        const studentCount = await Student.countDocuments({ circleId: c._id, isActive: true });
        return {
          ...c.toObject(),
          studentCount,
        };
      })
    );

    res.json(circlesWithCount);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single circle
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }
    res.json(circle);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// جدول تحويل أسماء الأيام إلى أرقام 0-6 إن أُرسلت كنصوص
const parseDayToNumber = (d: any): number => {
  if (typeof d === 'number' && d >= 0 && d <= 6) return d;
  const map: Record<string, number> = {
    'الأحد': 0, 'الاحد': 0, 'أحد': 0, 'احد': 0,
    'الإثنين': 1, 'الاثنين': 1, 'إثنين': 1, 'اثنين': 1,
    'الثلاثاء': 2, 'الثلاثا': 2, 'ثلاثاء': 2,
    'الأربعاء': 3, 'الاربعاء': 3, 'أربعاء': 3, 'اربعاء': 3,
    'الخميس': 4, 'خميس': 4,
    'الجمعة': 5, 'جمعة': 5, 'الجمعه': 5,
    'السبت': 6, 'سبت': 6,
  };
  if (typeof d === 'string' && d.trim() in map) return map[d.trim()];
  const parsed = Number(d);
  return !isNaN(parsed) && parsed >= 0 && parsed <= 6 ? parsed : 0;
};

// POST create circle
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, teacherName, days, time, notes } = req.body;
    if (!name || !days || !days.length || !time) {
      return res.status(400).json({ error: 'الاسم والأيام والوقت حقول مطلوبة' });
    }

    const normalizedDays = Array.from(new Set<number>(days.map(parseDayToNumber))).sort(
      (a, b) => a - b
    );

    const newCircle = new Circle({
      name,
      teacherName: teacherName || '',
      days: normalizedDays,
      time,
      notes: notes || '',
    });

    const savedCircle = await newCircle.save();
    res.status(201).json(savedCircle);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update circle
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, teacherName, days, time, notes } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (teacherName !== undefined) updateData.teacherName = teacherName;
    if (time !== undefined) updateData.time = time;
    if (notes !== undefined) updateData.notes = notes;
    if (days !== undefined && Array.isArray(days)) {
      updateData.days = Array.from(new Set<number>(days.map(parseDayToNumber))).sort(
        (a, b) => a - b
      );
    }

    const updated = await Circle.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE circle
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await Circle.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }
    // Also remove or unassign associated students
    await Student.deleteMany({ circleId: req.params.id });
    res.json({ message: 'تم حذف الحلقة والطالبات المرتبطات بها بنجاح' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
