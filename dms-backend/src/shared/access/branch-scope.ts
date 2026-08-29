import { Types } from 'mongoose';
import { Role } from '../constants/roles';
import { ForbiddenError } from '../errors';

/**
 * Branch-scoping helpers — the tenant-isolation analog of
 * `assertMentorAccessToConvert` (src/modules/mentor/access.ts): a bypass role
 * (super_admin) sees everything, everyone else is checked against an
 * ownership field (branchId) compared to the requester's own branch.
 */

interface BranchScopedRequester {
  role: string;
  branchId: string | null;
}

/**
 * Build a Mongo filter fragment that scopes a query to the requester's branch.
 * Super admins get an empty filter (no restriction, sees every branch).
 *
 * Returns an actual `ObjectId`, not a string — plain `find()` queries would cast
 * a string automatically, but raw `$match` stages inside `.aggregate()` do NOT,
 * so a string here would silently match zero documents in any aggregation.
 *
 * @example
 *   User.find({ role: Role.CONVERT, isActive: true, ...branchFilter(req.user!) })
 *   User.aggregate([{ $match: { role: Role.CONVERT, ...branchFilter(req.user!) } }, ...])
 */
export function branchFilter(
  requester: BranchScopedRequester
): { branchId: Types.ObjectId } | Record<string, never> {
  if (requester.role === Role.SUPER_ADMIN) return {};
  // branchId is always set for a real admin/mentor; if it's ever missing, fall back
  // to a fresh random ObjectId that matches no real branch rather than widening to "all".
  return { branchId: requester.branchId ? new Types.ObjectId(requester.branchId) : new Types.ObjectId() };
}

/**
 * Assert the requester may access a single document that belongs to `targetBranchId`.
 * Super admins always pass. Everyone else must match branches exactly.
 *
 * @example
 *   assertBranchAccess(req.user!, cohort.branchId?.toString());
 */
export function assertBranchAccess(
  requester: BranchScopedRequester,
  targetBranchId: string | null | undefined
): void {
  if (requester.role === Role.SUPER_ADMIN) return;
  if (!targetBranchId || targetBranchId.toString() !== requester.branchId) {
    throw new ForbiddenError('This resource belongs to a different branch.');
  }
}
