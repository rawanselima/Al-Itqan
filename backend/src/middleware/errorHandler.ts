import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { formatZodError, getFirstZodError } from '../utils/validationHelpers';

/**
 * Async handler wrapper to catch errors automatically
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error classes
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} غير موجود`, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: Record<string, string>) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Error:', err.message, err.stack);

  // Zod validation errors
  if (err instanceof ZodError) {
    const formatted = formatZodError(err);
    return res.status(400).json({
      error: getFirstZodError(err),
      details: formatted,
    });
  }

  // Mongoose validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string> = {};
    for (const field of Object.values(err.errors)) {
      details[field.path] = field.message;
    }
    return res.status(400).json({
      error: 'بيانات غير صالحة',
      details,
    });
  }

  // Mongoose duplicate key error
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      error: `معرف غير صالح: ${err.path}`,
    });
  }

  // MongoDB duplicate key (E11000)
  if ('code' in err && err.code === 11000) {
    const field = Object.keys((err as any).keyValue || {})[0] || 'الحقل';
    return res.status(409).json({
      error: `قيمة مكررة لـ ${field}. هذا السجل موجود بالفعل.`,
    });
  }

  // Custom app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Default server error
  const isDev = process.env.NODE_ENV !== 'production';
  return res.status(500).json({
    error: 'حدث خطأ في الخادم',
    ...(isDev && { details: err.message, stack: err.stack }),
  });
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    error: 'المسار غير موجود',
  });
};