import { Request, Response } from 'express';
import { adminConvertService } from './convert.service';
import { sendSuccess } from '../../shared/utils/response';

class AdminConvertController {
  // PATCH /v1/admin/converts/:convertId/branch
  async changeBranch(req: Request, res: Response): Promise<void> {
    const convert = await adminConvertService.changeBranch(
      req.user!,
      req.params.convertId,
      req.body.branchId
    );
    sendSuccess(res, 200, { convert });
  }
}

export const adminConvertController = new AdminConvertController();
