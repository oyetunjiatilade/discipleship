import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors';
import { sendError } from '../shared/utils/response';
import { env } from '../config';

/**
 * Global error handling middleware.
 *
 * This is the ONLY place where errors are translated to HTTP responses.
 * Controllers and services throw errors — this middleware catches them all.
 *
 * Must be registered LAST in the middleware chain (after all routes).
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ─── AppError (our domain errors) ───
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // ─── Zod validation errors ───
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', details);
    return;
  }

  // ─── Mongoose validation errors ───
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.entries(err.errors).map(([field, error]) => ({
      field,
      message: error.message,
    }));
    sendError(res, 400, 'VALIDATION_ERROR', 'Database validation failed', details);
    return;
  }

  // ─── Mongoose CastError (invalid ObjectId, etc.) ───
  if (err instanceof mongoose.Error.CastError) {
    sendError(res, 400, 'INVALID_ID', `Invalid ${err.path}: ${err.value}`);
    return;
  }

  // ─── MongoDB duplicate key error ───
  if (isMongoDuplicateKeyError(err)) {
    const field = extractDuplicateField(err);
    sendError(res, 409, 'DUPLICATE_KEY', `A record with this ${field} already exists`);
    return;
  }

  // ─── JSON parse errors (malformed request body) ───
  if ('type' in err && (err as Record<string, unknown>).type === 'entity.parse.failed') {
    sendError(res, 400, 'INVALID_JSON', 'Request body contains invalid JSON');
    return;
  }

  // ─── Unexpected / unhandled errors ───
  console.error('💥 Unhandled error:', {
    name: err.name,
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message;

  sendError(res, 500, 'INTERNAL_SERVER_ERROR', message);
}

/**
 * Detect MongoDB duplicate key error (code 11000).
 */
function isMongoDuplicateKeyError(err: unknown): err is Error & { code: number; keyPattern: Record<string, number> } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: number }).code === 11000
  );
}

/**
 * Extract the duplicate field name from a MongoDB 11000 error.
 */
function extractDuplicateField(err: Error & { keyPattern?: Record<string, number> }): string {
  if (err.keyPattern) {
    return Object.keys(err.keyPattern).join(', ');
  }
  return 'field';
}

