import { Request, Response } from 'express';
import { stageService } from '../stage/stage.service';
import { DiscipleshipStage } from '../../shared/constants/stages';
import { sendSuccess } from '../../shared/utils/response';
import { User } from '../user/user.model';
import { Role } from '../../shared/constants/roles';
import { NotFoundError } from '../../shared/errors';
import { assertBranchAccess } from '../../shared/access/branch-scope';

/**
 * Admin controller for manual stage management.
 *
 * Exposes the previously-unreachable stage engine over HTTP so admins can
 * advance converts to Baptized / Member Transferred and confirm Holy Spirit
 * filling — the gaps called out in the review.
 */
class AdminStageController {
  /** Every handler here takes a raw convertId from the URL — verify branch access first. */
  private async assertConvertAccess(req: Request, convertId: string): Promise<void> {
    const convert = await User.findOne({
      _id: convertId,
      role: Role.CONVERT,
      isActive: true,
    }).select('branchId');
    if (!convert) throw new NotFoundError('Convert', convertId);
    assertBranchAccess(req.user!, convert.branchId?.toString());
  }

  // GET /v1/admin/converts/:convertId/stage
  async getStage(req: Request, res: Response): Promise<void> {
    const { convertId } = req.params;
    await this.assertConvertAccess(req, convertId);
    const [current, available, history] = await Promise.all([
      stageService.getCurrentStage(convertId),
      stageService.getAvailableTransitions(convertId),
      stageService.getStageHistory(convertId),
    ]);

    sendSuccess(res, 200, {
      current,
      availableTransitions: available.availableTransitions,
      history,
    });
  }

  // POST /v1/admin/converts/:convertId/stage/transition
  async transition(req: Request, res: Response): Promise<void> {
    const { convertId } = req.params;
    await this.assertConvertAccess(req, convertId);
    const { targetStage, reason } = req.body;
    const adminId = req.user!.userId;

    const result = await stageService.transition({
      userId: convertId,
      targetStage: targetStage as DiscipleshipStage,
      trigger: 'admin_manual',
      triggeredBy: adminId,
      reason,
    });

    sendSuccess(res, 200, { transition: result });
  }

  // POST /v1/admin/converts/:convertId/holy-spirit
  async setHolySpirit(req: Request, res: Response): Promise<void> {
    const { convertId } = req.params;
    await this.assertConvertAccess(req, convertId);
    const { filled } = req.body;
    const adminId = req.user!.userId;

    const result = await stageService.setHolySpiritFilled(convertId, filled, adminId);
    sendSuccess(res, 200, result);
  }
}

export const adminStageController = new AdminStageController();
