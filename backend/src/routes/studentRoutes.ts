import { Router, Request, Response } from 'express';
import Student from '../models/Student';
import Circle from '../models/Circle';

const router = Router();

// GET students (optional filter by circleId or search)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { circleId, search } = req.query;
    const filter: any = {};

    if (circleId) {
      filter.circleId = circleId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: String(search), $options: 'i' } },
        { phone: { $regex: String(search), $options: 'i' } },
      ];
    }

    const students = await Student.find(filter)
      .populate('circleId', 'name days time')
      .sort({ name: 1 });

    res.json(students);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create student
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, circleId, joinedAt, leftAt, warningForRemoval } = req.body;
    if (!name || !circleId) {
      return res.status(400).json({ error: 'اسم الطالبة والحلقة حقول مطلوبة' });
    }

    // Verify circle exists
    const circle = await Circle.findById(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'الحلقة المحددة غير موجودة' });
    }

    const newStudent = new Student({
      name,
      phone: phone || '',
      circleId,
      isActive: true,
      joinedAt: joinedAt || new Date().toISOString().split('T')[0],
      leftAt: leftAt || null,
      warningForRemoval: Boolean(warningForRemoval),
    });

    const saved = await newStudent.save();
    const populated = await Student.findById(saved._id).populate('circleId', 'name');
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update student
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, phone, circleId, isActive, joinedAt, leftAt, warningForRemoval } = req.body;
    const updateObj: any = {};
    if (name !== undefined) updateObj.name = name;
    if (phone !== undefined) updateObj.phone = phone;
    if (circleId !== undefined) updateObj.circleId = circleId;
    if (isActive !== undefined) updateObj.isActive = isActive;
    if (joinedAt !== undefined) updateObj.joinedAt = joinedAt;
    if (leftAt !== undefined) updateObj.leftAt = leftAt;
    if (warningForRemoval !== undefined) updateObj.warningForRemoval = warningForRemoval;

    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      updateObj,
      { new: true, runValidators: true }
    ).populate('circleId', 'name');

    if (!updated) {
      return res.status(404).json({ error: 'الطالبة غير موجودة' });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE student
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'الطالبة غير موجودة' });
    }
    res.json({ message: 'تم حذف الطالبة بنجاح' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
