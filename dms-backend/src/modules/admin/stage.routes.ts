import { Router } from 'express';
import { adminStageController } from './stage.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  convertIdParamSchema,
  transitionStageSchema,
  holySpiritSchema,
} from './stage.validation';

const router = Router();

/**
 * Admin stage-management routes.
 * Mounted at /v1/admin/converts behind authenticate + authorize('admin').
 */
router.get(
  '/:convertId/stage',
  validate(convertIdParamSchema),
  asyncHandler(adminStageController.getStage.bind(adminStageController))
);

router.post(
  '/:convertId/stage/transition',
  validate(transitionStageSchema),
  asyncHandler(adminStageController.transition.bind(adminStageController))
);

router.post(
  '/:convertId/holy-spirit',
  validate(holySpiritSchema),
  asyncHandler(adminStageController.setHolySpirit.bind(adminStageController))
);

export { router as adminStageRoutes };
