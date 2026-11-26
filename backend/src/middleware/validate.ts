import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodObject, ZodError, ZodRawShape } from 'zod';
import { formatZodError } from '../utils/validationHelpers';

type AnyZodObject = ZodObject<ZodRawShape>;

/**
 * Middleware factory for Zod schema validation
 * Validates body, query, params against provided schemas
 */
export const validate = (schemas: Partial<Record<'body' | 'query' | 'params', AnyZodObject>>): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate each part of the request
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        const parsedQuery = await schemas.query.parseAsync(req.query);
        Object.assign(req.query, parsedQuery);
      }
      if (schemas.params) {
        const parsedParams = await schemas.params.parseAsync(req.params);
        Object.assign(req.params, parsedParams);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodError(error);
        const firstError = Object.values(formattedErrors)[0];
        return res.status(400).json({
          error: firstError || 'بيانات غير صالحة',
          details: formattedErrors,
        });
      }
      next(error);
    }
  };
};

/**
 * Quick validation helpers for common cases
 */
export const validateBody = (schema: AnyZodObject) => validate({ body: schema });
export const validateQuery = (schema: AnyZodObject) => validate({ query: schema });
export const validateParams = (schema: AnyZodObject) => validate({ params: schema });
export const validateAll = (schemas: { body?: AnyZodObject; query?: AnyZodObject; params?: AnyZodObject }) => validate(schemas);