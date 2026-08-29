import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Specifies which parts of the request to validate.
 */
interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Request validation middleware factory.
 *
 * Validates request body, query params, and/or route params against Zod schemas.
 * Parsed (and transformed) values REPLACE the raw values on the request object,
 * so downstream handlers receive clean, typed data.
 *
 * @example
 *   const createUserSchema = { body: z.object({ name: z.string(), phone: z.string() }) };
 *   router.post('/users', validate(createUserSchema), createUser);
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as Record<string, string>;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Record<string, string>;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error); // Caught by global error handler → 400
      } else {
        next(error);
      }
    }
  };
}
