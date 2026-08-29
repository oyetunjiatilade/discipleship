import { Router } from 'express';
import { mentorController } from './mentor.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  createMentorSchema,
  assignConvertSchema,
  convertIdOnlySchema,
  flockQuerySchema,
  convertDetailParamSchema,
  addNoteSchema,
  noteIdParamSchema,
} from './mentor.validation';

/**
 * Admin-scoped mentor management.
 * Mounted at /v1/admin/mentors and /v1/admin/converts behind authorize('admin').
 */
export const mentorAdminRoutes = Router();

mentorAdminRoutes.get(
  '/mentors',
  asyncHandler(mentorController.listMentors.bind(mentorController))
);
mentorAdminRoutes.post(
  '/mentors',
  validate(createMentorSchema),
  asyncHandler(mentorController.createMentor.bind(mentorController))
);
mentorAdminRoutes.post(
  '/converts/:convertId/assign-mentor',
  validate(assignConvertSchema),
  asyncHandler(mentorController.assignConvert.bind(mentorController))
);
mentorAdminRoutes.post(
  '/converts/:convertId/unassign-mentor',
  validate(convertIdOnlySchema),
  asyncHandler(mentorController.unassignConvert.bind(mentorController))
);

/**
 * Mentor-scoped self routes.
 * Mounted at /v1/mentor behind authorize('mentor', 'admin').
 */
export const mentorSelfRoutes = Router();

mentorSelfRoutes.get(
  '/flock',
  validate(flockQuerySchema),
  asyncHandler(mentorController.getFlock.bind(mentorController))
);
mentorSelfRoutes.get(
  '/converts/:convertId',
  validate(convertDetailParamSchema),
  asyncHandler(mentorController.getConvertDetail.bind(mentorController))
);
mentorSelfRoutes.post(
  '/converts/:convertId/notes',
  validate(addNoteSchema),
  asyncHandler(mentorController.addNote.bind(mentorController))
);
mentorSelfRoutes.delete(
  '/notes/:noteId',
  validate(noteIdParamSchema),
  asyncHandler(mentorController.deleteNote.bind(mentorController))
);
