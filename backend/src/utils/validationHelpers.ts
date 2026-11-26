import { ZodError } from 'zod';

/**
 * Format ZodError into a clean object with field paths as keys
 */
export function formatZodError(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formatted[path]) {
      formatted[path] = issue.message;
    }
  }
  return formatted;
}

/**
 * Get the first error message from ZodError
 */
export function getFirstZodError(error: ZodError): string {
  return error.issues[0]?.message || 'بيانات غير صالحة';
}

/**
 * Common error responses
 */
export const errorResponses = {
  notFound: (resource: string) => ({ error: `${resource} غير موجود` }),
  unauthorized: () => ({ error: 'غير مصرح بالوصول' }),
  forbidden: () => ({ error: 'ممنوع الوصول' }),
  validation: (message: string, details?: Record<string, string>) => ({
    error: message,
    details,
  }),
  server: (message = 'حدث خطأ في الخادم', details?: string) => ({
    error: message,
    ...(details && { details }),
  }),
};

/**
 * Async handler wrapper to catch errors automatically
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Success response helper
 */
export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Paginated response helper
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number; pages: number },
  message?: string
) {
  return {
    success: true,
    message,
    data,
    pagination,
  };
}