import { Response } from 'express';
import { PaginationMeta } from '../types/express.d';

/**
 * Send a standardized success response.
 *
 * @example
 *   sendSuccess(res, 200, user);
 *   sendSuccess(res, 200, users, paginationMeta);
 */
export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  data: T,
  meta?: PaginationMeta
): void {
  const body: { success: true; data: T; meta?: PaginationMeta } = {
    success: true,
    data,
  };

  if (meta) {
    body.meta = meta;
  }

  res.status(statusCode).json(body);
}

/**
 * Send a standardized error response.
 * Typically called by the global error handler, not controllers directly.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  const body: {
    success: false;
    error: { code: string; message: string; details?: unknown };
  } = {
    success: false,
    error: { code, message },
  };

  if (details !== undefined) {
    body.error.details = details;
  }

  res.status(statusCode).json(body);
}

/**
 * Send a 201 Created response (convenience wrapper for resource creation).
 */
export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, 201, data);
}

/**
 * Send a 204 No Content response (for deletes, marks-as-read, etc.).
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}
