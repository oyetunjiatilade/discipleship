import { User, toPublicProfile } from '../user/user.model';
import { UserPublicProfile, ConvertProfileUpdate } from '../user/user.types';
import { NotFoundError } from '../../shared/errors';

/**
 * Self-service profile module.
 *
 * Lets an authenticated user (convert or admin) read and edit their own
 * profile. Only a safe subset of fields is editable — role, stage, phone,
 * and auth fields are intentionally NOT updatable here.
 */
class MeService {
  /**
   * Get the current user's profile.
   */
  async getProfile(userId: string): Promise<UserPublicProfile> {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundError('User', userId);
    }
    return toPublicProfile(user);
  }

  /**
   * Update the current user's own profile.
   * Only whitelisted fields are applied.
   */
  async updateProfile(
    userId: string,
    update: ConvertProfileUpdate
  ): Promise<UserPublicProfile> {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundError('User', userId);
    }

    if (update.firstName !== undefined) user.firstName = update.firstName.trim();
    if (update.lastName !== undefined) user.lastName = update.lastName.trim();
    if (update.dateOfBirth !== undefined) user.dateOfBirth = update.dateOfBirth;
    if (update.gender !== undefined) user.gender = update.gender;
    if (update.address !== undefined) user.address = update.address?.trim();
    if (update.profileImageUrl !== undefined) user.profileImageUrl = update.profileImageUrl;
    if (update.department !== undefined) user.department = update.department?.trim() || null;
    if (update.departmentStatus !== undefined) user.departmentStatus = update.departmentStatus;
    if (update.lowDataMode !== undefined) user.lowDataMode = update.lowDataMode;

    await user.save();
    return toPublicProfile(user);
  }
}

export const meService = new MeService();
