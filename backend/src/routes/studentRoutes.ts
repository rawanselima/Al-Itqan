import { Router, Request, Response } from 'express';
import Student from '../models/Student';
import Circle from '../models/Circle';
import { validate, asyncHandler } from '../middleware';
import {
  studentCreateSchema,
  studentUpdateSchema,
  studentQuerySchema,
  studentParamsSchema,
} from '../schemas';

const router = Router();

// GET students with pagination, filtering, and search
router.get(
  '/',
  validate({ query: studentQuerySchema.shape.query }),
  asyncHandler(async (req: Request, res: Response) => {
    const { circleId, search, isActive = true, page = 1, limit = 50 } = req.query;
    const filter: any = {};

    if (circleId) filter.circleId = circleId;
    if (isActive !== undefined) filter.isActive = Boolean(isActive);
    if (search) {
      filter.$or = [
        { name: { $regex: String(search), $options: 'i' } },
        { phone: { $regex: String(search), $options: 'i' } },
      ];
    }

    // Exclude soft-deleted students unless explicitly requested
    if (!filter.deletedAt) {
      filter.$or = [
        { deletedAt: null },
        { deletedAt: { $exists: false } }
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('circleId', 'name days time')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum),
      Student.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);

    res.json({
      students,
      pagination: { page: pageNum, limit: limitNum, total, pages },
    });
  })
);

// POST create student
router.post(
  '/',
  validate({ body: studentCreateSchema.shape.body }),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, phone, circleId, joinedAt, leftAt, warningForRemoval } = req.body;

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
    const populated = await Student.findById(saved._id).populate('circleId', 'name days time');
    res.status(201).json(populated);
  })
);

// PUT update student
router.put(
  '/:id',
  validate({ params: studentParamsSchema.shape.params, body: studentUpdateSchema.shape.body }),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, phone, circleId, isActive, joinedAt, leftAt, warningForRemoval } = req.body;
    const updateObj: any = {};

    if (name !== undefined) updateObj.name = name;
    if (phone !== undefined) updateObj.phone = phone;
    if (circleId !== undefined) {
      // Verify new circle exists
      const circle = await Circle.findById(circleId);
      if (!circle) {
        return res.status(404).json({ error: 'الحلقة المحددة غير موجودة' });
      }
      updateObj.circleId = circleId;
    }
    if (isActive !== undefined) updateObj.isActive = isActive;
    if (joinedAt !== undefined) updateObj.joinedAt = joinedAt;
    if (leftAt !== undefined) updateObj.leftAt = leftAt;
    if (warningForRemoval !== undefined) updateObj.warningForRemoval = warningForRemoval;

    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      updateObj,
      { new: true, runValidators: true }
    ).populate('circleId', 'name days time');

    if (!updated) {
      return res.status(404).json({ error: 'الطالبة غير موجودة' });
    }
    res.json(updated);
  })
);

// DELETE student (soft delete)
router.delete(
  '/:id',
  validate({ params: studentParamsSchema.shape.params }),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false, deletedAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'الطالبة غير موجودة' });
    }
    res.json({ message: 'تم تعطيل الطالبة بنجاح (حذف ناعم)' });
  })
);

export default router;