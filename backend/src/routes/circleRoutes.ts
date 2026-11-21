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

// POST create circle
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, days, time, notes } = req.body;
    if (!name || !days || !days.length || !time) {
      return res.status(400).json({ error: 'الاسم والأيام والوقت حقول مطلوبة' });
    }

    const newCircle = new Circle({
      name,
      days,
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
    const { name, days, time, notes } = req.body;
    const updated = await Circle.findByIdAndUpdate(
      req.params.id,
      { name, days, time, notes },
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
