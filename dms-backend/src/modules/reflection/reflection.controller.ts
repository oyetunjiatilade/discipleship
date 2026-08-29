import { Request, Response } from 'express';
import { reflectionService } from './reflection.service';
import { sendSuccess } from '../../shared/utils/response';
import { assertMentorAccessToConvert } from '../mentor/access';

class ReflectionController {
  // GET /v1/reflections/lessons/:lessonId
  async getOwn(req: Request, res: Response): Promise<void> {
    const reflection = await reflectionService.getOwn(req.user!.userId, req.params.lessonId);
    sendSuccess(res, 200, { reflection });
  }

  // PUT /v1/reflections/lessons/:lessonId
  async upsert(req: Request, res: Response): Promise<void> {
    const reflection = await reflectionService.upsert(
      req.user!.userId,
      req.params.lessonId,
      req.body
    );
    sendSuccess(res, 200, { reflection });
  }

  // GET /v1/mentor/converts/:convertId/reflections
  async listForConvert(req: Request, res: Response): Promise<void> {
    await assertMentorAccessToConvert(req.user!, req.params.convertId);
    const reflections = await reflectionService.listForConvert(req.params.convertId);
    sendSuccess(res, 200, { reflections });
  }
}

export const reflectionController = new ReflectionController();
