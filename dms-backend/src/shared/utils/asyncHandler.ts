import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express route handler to automatically catch rejected promises
 * and forward them to the global error handler.
 *
 * Usage:
 *   router.get('/users', asyncHandler(async (req, res) => { ... }));
 *
 * Without this, every async route would need its own try/catch.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
