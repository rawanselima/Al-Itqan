import { Router, Request, Response } from 'express';
import Circle from '../models/Circle';
import Student from '../models/Student';
import { validate, asyncHandler } from '../middleware';
import {
  circleCreateSchema,
  circleUpdateSchema,
  circleParamsSchema,
  paginationSchema,
} from '../schemas';

const router = Router();

// GET all circles with student count - uses aggregation (no N+1)
router.get(
  '/',
  validate({ query: paginationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = (page - 1) * limit;

    // Aggregation pipeline to get circles with student counts in one query
    const [circles, total] = await Promise.all([
      Circle.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: 'students',
            let: { circleId: '$_id' },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ['$circleId', '$$circleId'] }, { $eq: ['$isActive', true] }] } } },
              { $count: 'count' },
            ],
            as: 'studentCounts',
          },
        },
        {
          $addFields: {
            studentCount: {
              $ifNull: [{ $arrayElemAt: ['$studentCounts.count', 0] }, 0],
            },
          },
        },
        { $project: { studentCounts: 0 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      Circle.countDocuments(),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
      circles,
      pagination: { page, limit, total, pages },
    });
  })
);

// GET single circle
router.get(
  '/:id',
  validate({ params: circleParamsSchema.shape.params }),
  asyncHandler(async (req: Request, res: Response) => {
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }
    // Get student count
    const studentCount = await Student.countDocuments({ circleId: circle._id, isActive: true });
    res.json({ ...circle.toObject(), studentCount });
  })
);

// POST create circle
router.post(
  '/',
  validate({ body: circleCreateSchema.shape.body }),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, teacherName, days, time, notes } = req.body;

    // Normalize days: deduplicate and sort
    const normalizedDays = Array.from(new Set<number>(days)).sort((a, b) => a - b);

    const newCircle = new Circle({
      name,
      teacherName: teacherName || '',
      days: normalizedDays,
      time,
      notes: notes || '',
    });

    const savedCircle = await newCircle.save();
    res.status(201).json(savedCircle);
  })
);

// PUT update circle
router.put(
  '/:id',
  validate({ params: circleParamsSchema.shape.params, body: circleUpdateSchema.shape.body }),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, teacherName, days, time, notes } = req.body;
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (teacherName !== undefined) updateData.teacherName = teacherName;
    if (time !== undefined) updateData.time = time;
    if (notes !== undefined) updateData.notes = notes;
    if (days !== undefined && Array.isArray(days)) {
      updateData.days = Array.from(new Set<number>(days)).sort((a, b) => a - b);
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
  })
);

// DELETE circle (also soft delete associated students)
router.delete(
  '/:id',
  validate({ params: circleParamsSchema.shape.params }),
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await Circle.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }

    // Soft delete associated students instead of hard delete
    await Student.updateMany(
      { circleId: req.params.id },
      { $set: { isActive: false, deletedAt: new Date() } }
    );

    res.json({ message: 'تم حذف الحلقة وتعطيل الطالبات المرتبطات بها بنجاح' });
  })
);

export default router;