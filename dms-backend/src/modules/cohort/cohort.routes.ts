import { Router } from 'express';
import { cohortController } from './cohort.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  createCohortSchema,
  updateCohortSchema,
  assignCohortSchema,
  createPostSchema,
  postIdParamSchema,
} from './cohort.validation';

/** Admin cohort management — mounted at /v1/admin. */
export const cohortAdminRoutes = Router();
cohortAdminRoutes.get('/cohorts', asyncHandler(cohortController.list.bind(cohortController)));
cohortAdminRoutes.post('/cohorts', validate(createCohortSchema), asyncHandler(cohortController.create.bind(cohortController)));
cohortAdminRoutes.patch('/cohorts/:cohortId', validate(updateCohortSchema), asyncHandler(cohortController.update.bind(cohortController)));
cohortAdminRoutes.post('/converts/:convertId/assign-cohort', validate(assignCohortSchema), asyncHandler(cohortController.assign.bind(cohortController)));

/** Convert community feed — mounted at /v1/community. */
export const cohortConvertRoutes = Router();
cohortConvertRoutes.get('/', asyncHandler(cohortController.feed.bind(cohortController)));
cohortConvertRoutes.post('/posts', validate(createPostSchema), asyncHandler(cohortController.createPost.bind(cohortController)));
cohortConvertRoutes.post('/posts/:postId/amen', validate(postIdParamSchema), asyncHandler(cohortController.toggleAmen.bind(cohortController)));
cohortConvertRoutes.delete('/posts/:postId', validate(postIdParamSchema), asyncHandler(cohortController.deletePost.bind(cohortController)));
