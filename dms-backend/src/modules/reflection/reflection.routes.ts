import { Router } from 'express';
import { reflectionController } from './reflection.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  lessonIdParamSchema,
  upsertReflectionSchema,
  convertIdParamSchema,
} from './reflection.validation';

/** Convert-facing reflection routes — mounted at /v1/reflections. */
export const reflectionConvertRoutes = Router();

reflectionConvertRoutes.get(
  '/lessons/:lessonId',
  validate(lessonIdParamSchema),
  asyncHandler(reflectionController.getOwn.bind(reflectionController))
);
reflectionConvertRoutes.put(
  '/lessons/:lessonId',
  validate(upsertReflectionSchema),
  asyncHandler(reflectionController.upsert.bind(reflectionController))
);

/** Mentor/admin view — mounted at /v1/mentor. */
export const reflectionMentorRoutes = Router();

reflectionMentorRoutes.get(
  '/converts/:convertId/reflections',
  validate(convertIdParamSchema),
  asyncHandler(reflectionController.listForConvert.bind(reflectionController))
);
