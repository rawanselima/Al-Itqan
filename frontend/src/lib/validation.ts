"use client";

import { z } from "zod";

/**
 * Unified validation schemas and error messages
 * Centralizes all validation logic to prevent duplication
 */

// Common validation rules
export const commonRules = {
  required: (fieldName: string) => `${fieldName} مطلوب`,
  minLength: (fieldName: string, min: number) => `${fieldName} يجب أن يكون ${min} أحرف على الأقل`,
  maxLength: (fieldName: string, max: number) => `${fieldName} طويل جداً (الحد الأقصى ${max} حرف)`,
  invalidPhone: "رقم الهاتف غير صحيح",
  invalidEmail: "البريد الإلكتروني غير صحيح",
  invalidDate: "التاريخ غير صحيح",
  startBeforeEnd: "تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية",
  atLeastOneDay: "يرجى اختيار يوم واحد على الأقل",
};

// Circle validation
export const circleSchema = z.object({
  _id: z.string().optional(),
  name: z
    .string({ required_error: "يرجى إدخال اسم المعلمة" })
    .trim()
    .min(2, "اسم المعلمة يجب أن يكون حرفين على الأقل")
    .max(100, commonRules.maxLength("اسم المعلمة", 100)),
  teacherName: z
    .string()
    .max(100, commonRules.maxLength("اسم المعلمة", 100))
    .optional(),
  days: z
    .array(z.union([z.string(), z.number()]))
    .min(1, "يرجى اختيار يوم واحد على الأقل"),
  time: z
    .string({ required_error: "يرجى تحديد ساعة وتوقيت الحلقة" })
    .trim()
    .min(2, "يرجى تحديد ساعة وتوقيت الحلقة")
    .max(50, commonRules.maxLength("وقت الحلقة", 50)),
  notes: z
    .string()
    .max(500, commonRules.maxLength("الملاحظات", 500))
    .optional(),
});

export type CircleFormData = z.infer<typeof circleSchema>;

// Student validation
export const studentSchema = z.object({
  _id: z.string().optional(),
  name: z
    .string({ required_error: "يرجى إدخال اسم الطالبة" })
    .trim()
    .min(2, "اسم الطالبة يجب أن يكون حرفين على الأقل")
    .max(100, commonRules.maxLength("اسم الطالبة", 100)),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s\-\+\(\)]{8,}$/, "رقم الهاتف غير صحيح (يجب أن يكون 8 أرقام على الأقل)")
    .optional()
    .or(z.literal("")),
  circleId: z.string({ required_error: "يرجى اختيار الحلقة" }).min(1, "يرجى اختيار الحلقة"),
  joinedAt: z.string().optional(),
  leftAt: z.string().nullable().optional(),
  warningForRemoval: z.boolean().optional(),
});

export type StudentFormData = z.infer<typeof studentSchema>;

// Attendance validation
export const attendanceRecordSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  phone: z.string(),
  status: z.enum(["present", "absent", "excused", "unrecorded"]),
  hasRecited: z.boolean(),
  order: z.number().nullable().optional(),
  notes: z.string().optional(),
  homeworkCompleted: z.boolean().optional(),
  departureTime: z.string().nullable().optional(),
});

export const attendanceSaveSchema = z.object({
  circleId: z.string(),
  date: z.string(),
  records: z.array(attendanceRecordSchema),
  isHoliday: z.boolean().optional(),
});

export type AttendanceRecordFormData = z.infer<typeof attendanceRecordSchema>;
export type AttendanceSaveFormData = z.infer<typeof attendanceSaveSchema>;

// Homework validation
export const homeworkToggleSchema = z.object({
  circleId: z.string(),
  studentId: z.string(),
  date: z.string(),
  completed: z.boolean(),
});

export type HomeworkToggleFormData = z.infer<typeof homeworkToggleSchema>;

// Settings validation
export const settingsSchema = z.object({
  supervisorName: z.string().min(2, commonRules.minLength("اسم المشرفة", 2)).max(100),
  introText: z.string().max(2000, commonRules.maxLength("النص", 2000)).optional(),
  outroText: z.string().max(2000, commonRules.maxLength("النص", 2000)).optional(),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

// Holiday validation
export const holidaySchema = z.object({
  circleId: z.string().nullable().optional(),
  from: z.string().min(10, "يرجى تحديد تاريخ البداية"),
  to: z.string().min(10, "يرجى تحديد تاريخ النهاية"),
  reason: z.string().max(200, commonRules.maxLength("السبب", 200)).optional(),
}).refine((data) => data.from <= data.to, {
  message: commonRules.startBeforeEnd,
  path: ["to"],
});

export type HolidayFormData = z.infer<typeof holidaySchema>;

// Report validation
export const monthlyReportParamsSchema = z.object({
  circleId: z.string().min(1, "يرجى اختيار الحلقة"),
  year: z.number().min(2020).max(2030),
  month: z.number().min(1).max(12),
});

export type MonthlyReportParams = z.infer<typeof monthlyReportParamsSchema>;

/**
 * Helper to format Zod errors for display
 */
export function formatZodError(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!formatted[path]) {
      formatted[path] = issue.message;
    }
  }
  return formatted;
}

/**
 * Helper to get first error message from Zod error
 */
export function getFirstZodError(error: z.ZodError): string {
  return error.issues[0]?.message || "خطأ في التحقق من البيانات";
}