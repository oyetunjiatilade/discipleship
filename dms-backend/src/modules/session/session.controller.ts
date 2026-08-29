import { Request, Response } from 'express';
import { sessionService } from './session.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response';
import { AppError } from '../../shared/errors';

class SessionController {
  // ── Admin ──
  async list(req: Request, res: Response): Promise<void> {
    const sessions = await sessionService.listSessions(req.user!);
    sendSuccess(res, 200, { sessions });
  }
  // A plain admin's session is always in their own branch; a super_admin must
  // specify branchId in the body (mirrors auth.controller.createAdmin).
  async create(req: Request, res: Response): Promise<void> {
    const caller = req.user!;
    const branchId = caller.role === 'super_admin' ? req.body.branchId : caller.branchId;
    if (!branchId) {
      throw new AppError('branchId is required', 400, 'BRANCH_REQUIRED');
    }
    const session = await sessionService.createSession({ ...req.body, branchId }, caller.userId);
    sendCreated(res, { session });
  }
  async update(req: Request, res: Response): Promise<void> {
    const session = await sessionService.updateSession(req.user!, req.params.sessionId, req.body);
    sendSuccess(res, 200, { session });
  }
  async remove(req: Request, res: Response): Promise<void> {
    await sessionService.deleteSession(req.user!, req.params.sessionId);
    sendSuccess(res, 200, { message: 'Session deleted.' });
  }
  async attendance(req: Request, res: Response): Promise<void> {
    const attendees = await sessionService.getAttendance(req.user!, req.params.sessionId);
    sendSuccess(res, 200, { attendees });
  }
  async markAttendance(req: Request, res: Response): Promise<void> {
    await sessionService.markAttendance(
      req.user!,
      req.params.sessionId,
      req.body.userId,
      req.body.attended
    );
    sendSuccess(res, 200, { message: 'Attendance updated.' });
  }

  // ── Convert ──
  async upcoming(req: Request, res: Response): Promise<void> {
    const sessions = await sessionService.listUpcoming(req.user!.userId);
    sendSuccess(res, 200, { sessions });
  }
  async rsvp(req: Request, res: Response): Promise<void> {
    const session = await sessionService.rsvp(req.user!.userId, req.params.sessionId, req.body.rsvp);
    sendSuccess(res, 200, { session });
  }
}

export const sessionController = new SessionController();
