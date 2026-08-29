import { Request, Response } from 'express';
import { branchService } from './branch.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response';

class BranchController {
  // GET /v1/branches (public — registration dropdown)
  async listPublic(_req: Request, res: Response): Promise<void> {
    const branches = await branchService.listActiveBranches();
    sendSuccess(res, 200, { branches });
  }

  // GET /v1/admin/branches (super_admin)
  async list(_req: Request, res: Response): Promise<void> {
    const branches = await branchService.listAllBranches();
    sendSuccess(res, 200, { branches });
  }

  // POST /v1/admin/branches (super_admin)
  async create(req: Request, res: Response): Promise<void> {
    const branch = await branchService.createBranch(req.body);
    sendCreated(res, { branch });
  }

  // PATCH /v1/admin/branches/:branchId (super_admin)
  async update(req: Request, res: Response): Promise<void> {
    const branch = await branchService.updateBranch(req.params.branchId, req.body);
    sendSuccess(res, 200, { branch });
  }
}

export const branchController = new BranchController();
