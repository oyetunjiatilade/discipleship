import { Router } from 'express';
import { adminConvertController } from './convert.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { changeBranchSchema } from './convert.validation';

/**
 * Super-admin convert-management routes.
 * Mounted at /v1/admin/converts behind authenticate + authorize('super_admin').
 */
const router = Router();

router.patch(
  '/:convertId/branch',
  validate(changeBranchSchema),
  asyncHandler(adminConvertController.changeBranch.bind(adminConvertController))
);

export { router as adminConvertRoutes };
