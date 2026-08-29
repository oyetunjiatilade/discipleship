import { Router } from 'express';
import { meController } from './me.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { updateProfileSchema } from './me.validation';

const router = Router();

/**
 * GET /v1/me — get own profile
 * PATCH /v1/me — update own profile
 *
 * Mounted behind `authenticate` in app.ts (both converts and admins).
 */
router.get('/', asyncHandler(meController.getProfile.bind(meController)));

router.patch(
  '/',
  validate(updateProfileSchema),
  asyncHandler(meController.updateProfile.bind(meController))
);

export { router as meRoutes };
