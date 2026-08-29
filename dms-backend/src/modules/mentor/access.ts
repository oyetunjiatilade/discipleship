import { Types } from 'mongoose';
import { User } from '../user/user.model';
import { Role } from '../../shared/constants/roles';
import { ForbiddenError, NotFoundError, AppError } from '../../shared/errors';

/**
 * Ensure the requester may access this convert.
 * Super admins can access anyone; admins can access anyone in their own branch;
 * a mentor may only access converts in their flock.
 */
export async function assertMentorAccessToConvert(
  requester: { userId: string; role: string; branchId?: string | null },
  convertId: string
): Promise<void> {
  if (requester.role === Role.SUPER_ADMIN) return;
  if (!Types.ObjectId.isValid(convertId)) {
    throw new AppError('Invalid convert ID', 400, 'INVALID_ID');
  }
  const convert = await User.findOne({
    _id: convertId,
    role: Role.CONVERT,
    isActive: true,
  }).select('mentorId branchId');
  if (!convert) throw new NotFoundError('Convert', convertId);

  if (requester.role === Role.ADMIN) {
    if (!convert.branchId || convert.branchId.toString() !== requester.branchId) {
      throw new ForbiddenError('This convert belongs to a different branch.');
    }
    return;
  }

  if (!convert.mentorId || convert.mentorId.toString() !== requester.userId) {
    throw new ForbiddenError('This convert is not in your flock.');
  }
}
