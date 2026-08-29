import { Types } from 'mongoose';
import { User, toPublicProfile } from '../user/user.model';
import { UserPublicProfile } from '../user/user.types';
import { Role } from '../../shared/constants/roles';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { assertBranchAccess } from '../../shared/access/branch-scope';
import { branchService } from '../branch/branch.service';

type Requester = { userId: string; role: string; branchId: string | null };

class AdminConvertService {
  /**
   * Move a convert to a different branch. `super_admin`-only (enforced at the
   * route). Mentors and cohorts are themselves branch-scoped, so any existing
   * mentor/cohort assignment is cleared by the move — we never leave a
   * cross-branch assignment behind.
   */
  async changeBranch(
    requester: Requester,
    convertId: string,
    branchId: string
  ): Promise<UserPublicProfile> {
    const convert = await User.findOne({
      _id: convertId,
      role: Role.CONVERT,
      isActive: true,
    });
    if (!convert) throw new NotFoundError('Convert', convertId);

    // Requester must have access to the convert's current branch...
    assertBranchAccess(requester, convert.branchId?.toString());
    // ...and the target branch must exist and be active.
    await branchService.assertActiveBranch(branchId);

    if (convert.branchId?.toString() === branchId) {
      throw new ConflictError('Convert already belongs to this branch');
    }

    convert.branchId = new Types.ObjectId(branchId);
    convert.mentorId = null;
    convert.cohortId = null;
    await convert.save();

    return toPublicProfile(convert);
  }
}

export const adminConvertService = new AdminConvertService();
