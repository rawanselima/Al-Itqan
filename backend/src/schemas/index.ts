import { z } from 'zod';

/**
 * Backend Validation Schemas using Zod
 * Centralized validation for all API endpoints
 */

// ============================================
// Common reusable schemas
// ============================================

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'معرف غير صالح');

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ============================================
// Circle Schemas
// ============================================

export const circleDaySchema = z.union([
  z.number().int().min(0).max(6),
  z.string().transform((val) => {
    const dayMap: Record<string, number> = {
      'الأحد': 0, 'الاحد': 0, 'أحد': 0, 'احد': 0,
      'الإثنين': 1, 'الاثنين': 1, 'إثنين': 1, 'اثنين': 1,
      'الثلاثاء': 2, 'الثلاثا': 2, 'ثلاثاء': 2,
      'الأربعاء': 3, 'الاربعاء': 3, 'أربعاء': 3, 'اربعاء': 3,
      'الخميس': 4, 'خميس': 4,
      'الجمعة': 5, 'جمعة': 5, 'الجمعه': 5,
      'السبت': 6, 'سبت': 6,
    };
    const trimmed = val.trim();
    if (trimmed in dayMap) return dayMap[trimmed];
    const parsed = Number(trimmed);
    return !isNaN(parsed) && parsed >= 0 && parsed <= 6 ? parsed : 0;
  }),
]);

export const circleCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'اسم المعلمة يجب أن يكون حرفين على الأقل').max(100, 'اسم المعلمة طويل جداً'),
    teacherName: z.string().max(100, 'اسم المعلمة طويل جداً').optional().default(''),
    days: z.array(circleDaySchema).min(1, 'يرجى اختيار يوم واحد على الأقل').max(7),
    time: z.string().trim().min(2, 'يرجى تحديد وقت الحلقة').max(50, 'وقت طويل جداً'),
    notes: z.string().max(500, 'الملاحظات طويلة جداً').optional().default(''),
  }),
});

export const circleUpdateSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    name: z.string().trim().min(2, 'اسم المعلمة يجب أن يكون حرفين على الأقل').max(100).optional(),
    teacherName: z.string().max(100).optional(),
    days: z.array(circleDaySchema).min(1, 'يرجى اختيار يوم واحد على الأقل').max(7).optional(),
    time: z.string().trim().min(2, 'يرجى تحديد وقت الحلقة').max(50).optional(),
    notes: z.string().max(500).optional(),
  }).refine((data) => Object.keys(data).length > 0, 'لا توجد بيانات للتحديث'),
});

export const circleParamsSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

// ============================================
// Student Schemas
// ============================================

export const studentCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'اسم الطالبة يجب أن يكون حرفين على الأقل').max(100, 'اسم الطالبة طويل جداً'),
    phone: z.string().trim().regex(/^[\d\s\-\+\(\)]{8,}$/, 'رقم الهاتف غير صحيح').optional().or(z.literal('')).default(''),
    circleId: objectIdSchema,
    joinedAt: dateStringSchema.optional().default(() => new Date().toISOString().split('T')[0]),
    leftAt: dateStringSchema.nullable().optional(),
    warningForRemoval: z.boolean().optional().default(false),
  }),
});

export const studentUpdateSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    name: z.string().trim().min(2, 'اسم الطالبة يجب أن يكون حرفين على الأقل').max(100).optional(),
    phone: z.string().trim().regex(/^[\d\s\-\+\(\)]{8,}$/, 'رقم الهاتف غير صحيح').optional().or(z.literal('')),
    circleId: objectIdSchema.optional(),
    isActive: z.boolean().optional(),
    joinedAt: dateStringSchema.optional(),
    leftAt: dateStringSchema.nullable().optional(),
    warningForRemoval: z.boolean().optional(),
  }).refine((data) => Object.keys(data).length > 0, 'لا توجد بيانات للتحديث'),
});

export const studentQuerySchema = z.object({
  query: z.object({
    circleId: objectIdSchema.optional(),
    search: z.string().optional(),
    isActive: z.coerce.boolean().optional().default(true),
    ...paginationSchema.shape,
  }),
});

export const studentParamsSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

// ============================================
// Attendance Schemas
// ============================================

export const attendanceRecordSchema = z.object({
  studentId: objectIdSchema,
  studentName: z.string(),
  phone: z.string(),
  status: z.enum(['present', 'absent', 'excused', 'unrecorded']).default('unrecorded'),
  hasRecited: z.boolean().default(false),
  order: z.number().int().min(1).nullable().optional(),
  notes: z.string().optional().default(''),
  homeworkCompleted: z.boolean().optional().default(false),
  departureTime: z.string().nullable().optional(),
});

export const attendanceSaveSchema = z.object({
  body: z.object({
    circleId: objectIdSchema,
    date: dateStringSchema,
    records: z.array(attendanceRecordSchema),
    isHoliday: z.boolean().optional().default(false),
  }),
});

export const attendanceQuerySchema = z.object({
  query: z.object({
    circleId: objectIdSchema,
    date: dateStringSchema,
  }),
});

// ============================================
// Homework Schemas
// ============================================

export const homeworkStatusSchema = z.enum(['done', 'notDone', 'partial']);

export const homeworkToggleSchema = z.object({
  body: z.object({
    circleId: objectIdSchema,
    studentId: objectIdSchema,
    date: dateStringSchema,
    completed: z.boolean().optional(),
    status: homeworkStatusSchema.optional(),
  }).refine((data) => data.completed !== undefined || data.status !== undefined, {
    message: 'يجب تحديد completed أو status',
    path: ['status'],
  }),
});

export const homeworkQuerySchema = z.object({
  query: z.object({
    circleId: objectIdSchema,
    startDate: dateStringSchema,
    endDate: dateStringSchema,
  }).refine((data) => data.startDate <= data.endDate, {
    message: 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية',
    path: ['endDate'],
  }),
});

// ============================================
// Holiday Schemas
// ============================================

export const holidayCreateSchema = z.object({
  body: z.object({
    circleId: objectIdSchema.nullable().optional(),
    from: dateStringSchema,
    to: dateStringSchema,
    reason: z.string().max(200, 'السبب طويل جداً').optional().default(''),
  }).refine((data) => data.from <= data.to, {
    message: 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية',
    path: ['to'],
  }),
});

export const holidayParamsSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

export const holidayQuerySchema = z.object({
  query: z.object({
    circleId: objectIdSchema.optional(),
  }),
});

// ============================================
// Settings Schemas
// ============================================

export const settingsUpdateSchema = z.object({
  body: z.object({
    supervisorName: z.string().min(2, 'اسم المشرفة يجب أن يكون حرفين على الأقل').max(100).optional(),
    introText: z.string().max(2000, 'النص طويل جداً').optional(),
    outroText: z.string().max(2000, 'النص طويل جداً').optional(),
  }).refine((data) => Object.keys(data).length > 0, 'لا توجد بيانات للتحديث'),
});

// ============================================
// Report Schemas
// ============================================

export const monthlyReportQuerySchema = z.object({
  query: z.object({
    circleId: objectIdSchema,
    year: z.coerce.number().int().min(2020).max(2030),
    month: z.coerce.number().int().min(1).max(12),
  }),
});

export const homeworkReportQuerySchema = z.object({
  query: z.object({
    circleId: objectIdSchema,
    year: z.coerce.number().int().min(2020).max(2030).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
  }).refine((data) => {
    if (data.from && data.to) return data.from <= data.to;
    return true;
  }, {
    message: 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية',
    path: ['to'],
  }),
});

// ============================================
// Type exports
// ============================================

export type CircleCreateInput = z.infer<typeof circleCreateSchema>['body'];
export type CircleUpdateInput = z.infer<typeof circleUpdateSchema>['body'];
export type StudentCreateInput = z.infer<typeof studentCreateSchema>['body'];
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>['body'];
export type StudentQueryInput = z.infer<typeof studentQuerySchema>['query'];
export type AttendanceSaveInput = z.infer<typeof attendanceSaveSchema>['body'];
export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>;
export type HomeworkToggleInput = z.infer<typeof homeworkToggleSchema>['body'];
export type HolidayCreateInput = z.infer<typeof holidayCreateSchema>['body'];
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>['body'];