import { Request, Response } from 'express';
import { cohortService } from './cohort.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response';
import { AppError } from '../../shared/errors';

class CohortController {
  // ── Admin ──
  async list(req: Request, res: Response): Promise<void> {
    const cohorts = await cohortService.listCohorts(req.user!);
    sendSuccess(res, 200, { cohorts });
  }
  // A plain admin's cohort is always in their own branch; a super_admin must
  // specify branchId in the body (mirrors auth.controller.createAdmin).
  async create(req: Request, res: Response): Promise<void> {
    const caller = req.user!;
    const branchId = caller.role === 'super_admin' ? req.body.branchId : caller.branchId;
    if (!branchId) {
      throw new AppError('branchId is required', 400, 'BRANCH_REQUIRED');
    }
    const cohort = await cohortService.createCohort({ ...req.body, branchId });
    sendCreated(res, { cohort });
  }
  async update(req: Request, res: Response): Promise<void> {
    const cohort = await cohortService.updateCohort(req.user!, req.params.cohortId, req.body);
    sendSuccess(res, 200, { cohort });
  }
  async assign(req: Request, res: Response): Promise<void> {
    await cohortService.assignConvert(req.user!, req.params.convertId, req.body.cohortId);
    sendSuccess(res, 200, { message: 'Convert assigned to cohort.' });
  }

  // ── Convert ──
  async feed(req: Request, res: Response): Promise<void> {
    const data = await cohortService.getFeed(req.user!.userId);
    sendSuccess(res, 200, data);
  }
  async createPost(req: Request, res: Response): Promise<void> {
    const post = await cohortService.createPost(req.user!.userId, req.body);
    sendCreated(res, { post });
  }
  async toggleAmen(req: Request, res: Response): Promise<void> {
    const post = await cohortService.toggleAmen(req.user!.userId, req.params.postId);
    sendSuccess(res, 200, { post });
  }
  async deletePost(req: Request, res: Response): Promise<void> {
    await cohortService.deletePost(req.user!.userId, req.params.postId);
    sendSuccess(res, 200, { message: 'Post deleted.' });
  }
}

export const cohortController = new CohortController();
