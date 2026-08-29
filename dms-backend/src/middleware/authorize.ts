import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../shared/errors';
import { UserRole } from '../shared/types/express.d';

/**
 * Role-based authorization middleware factory.
 *
 * Must be used AFTER `authenticate` middleware (requires `req.user`).
 *
 * `super_admin` implicitly satisfies any check that allows `'admin'` — this lets every
 * existing `authorize('admin')`/`authorize('mentor', 'admin')` mount admit super admins
 * without listing the role at every call site. Routes that must be super-admin-only
 * (e.g. branch management) should call `authorize('super_admin')` directly, which this
 * rule does not widen.
 *
 * @example
 *   router.get('/admin/converts', authenticate, authorize('admin'), listConverts);
 *   router.get('/me', authenticate, authorize('convert', 'admin'), getProfile);
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const { role } = req.user;
    const permitted =
      allowedRoles.includes(role) || (role === 'super_admin' && allowedRoles.includes('admin'));

    if (!permitted) {
      next(new ForbiddenError('You do not have permission to access this resource'));
      return;
    }

    next();
  };
}
