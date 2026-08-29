import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { branchFilter, assertBranchAccess } from '../../src/shared/access/branch-scope';
import { Role } from '../../src/shared/constants/roles';
import { ForbiddenError } from '../../src/shared/errors';

/**
 * Regression guard for the tenant-isolation boundary: a super_admin must see
 * everything, while every other role must be pinned to its own branch. If
 * this ever regresses, branch data leaks across churches.
 */
describe('branchFilter', () => {
  it('returns an empty filter for super_admin (sees every branch)', () => {
    const filter = branchFilter({ role: Role.SUPER_ADMIN, branchId: null });
    expect(filter).toEqual({});
  });

  it('scopes to the requester branchId as a real ObjectId (not a string)', () => {
    const branchId = new Types.ObjectId().toString();
    const filter = branchFilter({ role: Role.ADMIN, branchId });
    expect('branchId' in filter).toBe(true);
    const scoped = filter as { branchId: Types.ObjectId };
    expect(scoped.branchId).toBeInstanceOf(Types.ObjectId);
    expect(scoped.branchId.toString()).toBe(branchId);
  });

  it('falls back to a fresh (impossible-to-match) ObjectId if branchId is somehow missing', () => {
    const filter = branchFilter({ role: Role.ADMIN, branchId: null });
    const scoped = filter as { branchId: Types.ObjectId };
    expect(scoped.branchId).toBeInstanceOf(Types.ObjectId);
  });
});

describe('assertBranchAccess', () => {
  it('lets super_admin access any branch, including null/undefined targets', () => {
    const requester = { role: Role.SUPER_ADMIN, branchId: null };
    expect(() => assertBranchAccess(requester, undefined)).not.toThrow();
    expect(() => assertBranchAccess(requester, new Types.ObjectId().toString())).not.toThrow();
  });

  it('lets an admin access a resource in their own branch', () => {
    const branchId = new Types.ObjectId().toString();
    const requester = { role: Role.ADMIN, branchId };
    expect(() => assertBranchAccess(requester, branchId)).not.toThrow();
  });

  it('blocks an admin from a resource in a different branch', () => {
    const requester = { role: Role.ADMIN, branchId: new Types.ObjectId().toString() };
    const otherBranchId = new Types.ObjectId().toString();
    expect(() => assertBranchAccess(requester, otherBranchId)).toThrow(ForbiddenError);
  });

  it('blocks an admin from a resource with no branch at all', () => {
    const requester = { role: Role.ADMIN, branchId: new Types.ObjectId().toString() };
    expect(() => assertBranchAccess(requester, null)).toThrow(ForbiddenError);
    expect(() => assertBranchAccess(requester, undefined)).toThrow(ForbiddenError);
  });
});
