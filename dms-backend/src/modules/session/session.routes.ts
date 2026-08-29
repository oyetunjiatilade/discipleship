import { Router } from 'express';
import { sessionController } from './session.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  createSessionSchema,
  updateSessionSchema,
  sessionIdParamSchema,
  markAttendanceSchema,
  rsvpSchema,
} from './session.validation';

/** Admin session management — mounted at /v1/admin/sessions. */
export const sessionAdminRoutes = Router();
sessionAdminRoutes.get('/', asyncHandler(sessionController.list.bind(sessionController)));
sessionAdminRoutes.post('/', validate(createSessionSchema), asyncHandler(sessionController.create.bind(sessionController)));
sessionAdminRoutes.patch('/:sessionId', validate(updateSessionSchema), asyncHandler(sessionController.update.bind(sessionController)));
sessionAdminRoutes.delete('/:sessionId', validate(sessionIdParamSchema), asyncHandler(sessionController.remove.bind(sessionController)));
sessionAdminRoutes.get('/:sessionId/attendance', validate(sessionIdParamSchema), asyncHandler(sessionController.attendance.bind(sessionController)));
sessionAdminRoutes.post('/:sessionId/attendance', validate(markAttendanceSchema), asyncHandler(sessionController.markAttendance.bind(sessionController)));

/** Convert sessions — mounted at /v1/sessions. */
export const sessionConvertRoutes = Router();
sessionConvertRoutes.get('/', asyncHandler(sessionController.upcoming.bind(sessionController)));
sessionConvertRoutes.post('/:sessionId/rsvp', validate(rsvpSchema), asyncHandler(sessionController.rsvp.bind(sessionController)));
