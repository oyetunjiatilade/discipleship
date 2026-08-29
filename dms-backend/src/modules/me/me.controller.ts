import { Request, Response } from 'express';
import { meService } from './me.service';
import { sendSuccess } from '../../shared/utils/response';

class MeController {
  // GET /v1/me
  async getProfile(req: Request, res: Response): Promise<void> {
    const profile = await meService.getProfile(req.user!.userId);
    sendSuccess(res, 200, { user: profile });
  }

  // PATCH /v1/me
  async updateProfile(req: Request, res: Response): Promise<void> {
    const profile = await meService.updateProfile(req.user!.userId, req.body);
    sendSuccess(res, 200, { user: profile });
  }
}

export const meController = new MeController();
