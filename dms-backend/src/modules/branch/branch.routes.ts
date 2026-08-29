import { Router } from 'express';
import { branchController } from './branch.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { createBranchSchema, updateBranchSchema } from './branch.validation';

/** Public — feeds the registration branch dropdown. Mounted at /v1/branches (no auth). */
export const branchPublicRoutes = Router();
branchPublicRoutes.get('/', asyncHandler(branchController.listPublic.bind(branchController)));

/** Super-admin only — branch management. Mounted at /v1/admin/branches. */
export const branchAdminRoutes = Router();
branchAdminRoutes.get('/', asyncHandler(branchController.list.bind(branchController)));
branchAdminRoutes.post(
  '/',
  validate(createBranchSchema),
  asyncHandler(branchController.create.bind(branchController))
);
branchAdminRoutes.patch(
  '/:branchId',
  validate(updateBranchSchema),
  asyncHandler(branchController.update.bind(branchController))
);
