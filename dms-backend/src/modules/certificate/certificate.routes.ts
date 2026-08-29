import { Router } from 'express';
import { certificateController } from './certificate.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { z } from 'zod';

/** Convert self — mounted at /v1/certificate. */
export const certificateConvertRoutes = Router();
certificateConvertRoutes.get('/', asyncHandler(certificateController.own.bind(certificateController)));

/** Admin — mounted at /v1/admin/converts. */
export const certificateAdminRoutes = Router();
certificateAdminRoutes.get(
  '/:convertId/certificate',
  validate({ params: z.object({ convertId: z.string().regex(/^[0-9a-fA-F]{24}$/) }) }),
  asyncHandler(certificateController.forConvert.bind(certificateController))
);
