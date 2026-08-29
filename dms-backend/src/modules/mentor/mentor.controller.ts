import { Request, Response } from 'express';
import { mentorService } from './mentor.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response';
import { ForbiddenError, AppError } from '../../shared/errors';
import { assertMentorAccessToConvert } from './access';

class MentorController {
  // GET /v1/admin/mentors
  async listMentors(req: Request, res: Response): Promise<void> {
    const mentors = await mentorService.listMentors(req.user!);
    sendSuccess(res, 200, { mentors });
  }

  // POST /v1/admin/mentors
  // A plain admin's new mentor is always in their own branch; a super_admin
  // must specify branchId in the body (mirrors auth.controller.createAdmin).
  async createMentor(req: Request, res: Response): Promise<void> {
    const caller = req.user!;
    const branchId = caller.role === 'super_admin' ? (req.body.branchId ?? null) : caller.branchId;
    const mentor = await mentorService.createMentor({ ...req.body, branchId });
    sendCreated(res, { mentor });
  }

  // POST /v1/admin/converts/:convertId/assign-mentor
  async assignConvert(req: Request, res: Response): Promise<void> {
    const { convertId } = req.params;
    const { mentorId } = req.body;
    const convert = await mentorService.assignConvert(req.user!, convertId, mentorId);
    sendSuccess(res, 200, { convert });
  }

  // POST /v1/admin/converts/:convertId/unassign-mentor
  async unassignConvert(req: Request, res: Response): Promise<void> {
    const { convertId } = req.params;
    const convert = await mentorService.unassignConvert(req.user!, convertId);
    sendSuccess(res, 200, { convert });
  }

  // GET /v1/mentor/flock  (mentor sees own flock; admin/super_admin must pass ?mentorId=)
  async getFlock(req: Request, res: Response): Promise<void> {
    const requester = req.user!;
    let mentorId: string;

    if (requester.role === 'mentor') {
      mentorId = requester.userId;
    } else if (requester.role === 'admin' || requester.role === 'super_admin') {
      const q = req.query.mentorId;
      if (!q || typeof q !== 'string') {
        throw new AppError('Admins must specify ?mentorId=', 400, 'MENTOR_ID_REQUIRED');
      }
      mentorId = q;
    } else {
      throw new ForbiddenError('Only mentors and admins can view a flock');
    }

    const flock = await mentorService.getFlock(requester, mentorId);
    sendSuccess(res, 200, { flock, total: flock.length });
  }

  // GET /v1/mentor/converts/:convertId  (own flock only; admins any)
  async getConvertDetail(req: Request, res: Response): Promise<void> {
    const requester = req.user!;
    const { convertId } = req.params;
    await assertMentorAccessToConvert(requester, convertId);
    const detail = await mentorService.getConvertDetail(requester, convertId);
    sendSuccess(res, 200, detail);
  }

  // POST /v1/mentor/converts/:convertId/notes
  async addNote(req: Request, res: Response): Promise<void> {
    const requester = req.user!;
    const { convertId } = req.params;
    await assertMentorAccessToConvert(requester, convertId);
    const note = await mentorService.addNote(requester.userId, convertId, req.body.text);
    sendCreated(res, { note });
  }

  // DELETE /v1/mentor/notes/:noteId
  async deleteNote(req: Request, res: Response): Promise<void> {
    await mentorService.deleteNote(req.user!, req.params.noteId);
    sendSuccess(res, 200, { message: 'Note deleted.' });
  }
}

export const mentorController = new MentorController();
