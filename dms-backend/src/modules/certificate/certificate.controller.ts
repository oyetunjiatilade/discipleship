import { Request, Response } from 'express';
import { certificateService } from './certificate.service';
import { User } from '../user/user.model';
import { Role } from '../../shared/constants/roles';
import { NotFoundError } from '../../shared/errors';
import { assertBranchAccess } from '../../shared/access/branch-scope';

class CertificateController {
  // GET /v1/certificate — own certificate
  async own(req: Request, res: Response): Promise<void> {
    const { buffer, filename } = await certificateService.getCertificate(req.user!.userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  }

  // GET /v1/admin/converts/:convertId/certificate — any convert in the admin's branch
  async forConvert(req: Request, res: Response): Promise<void> {
    const convertId = req.params.convertId;
    const convert = await User.findOne({
      _id: convertId,
      role: Role.CONVERT,
      isActive: true,
    }).select('branchId');
    if (!convert) throw new NotFoundError('Convert', convertId);
    assertBranchAccess(req.user!, convert.branchId?.toString());

    const { buffer, filename } = await certificateService.getCertificate(convertId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  }
}

export const certificateController = new CertificateController();
