export {
  circleSchema,
  studentSchema,
  attendanceRecordSchema,
  attendanceSaveSchema,
  homeworkToggleSchema,
  settingsSchema,
  holidaySchema,
  monthlyReportParamsSchema,
  type CircleFormData,
  type StudentFormData,
  type AttendanceRecordFormData,
  type AttendanceSaveFormData,
  type HomeworkToggleFormData,
  type SettingsFormData,
  type HolidayFormData,
  type MonthlyReportParams,
} from "@/lib/validation";

export { formatZodError, getFirstZodError, commonRules } from "@/lib/validation";