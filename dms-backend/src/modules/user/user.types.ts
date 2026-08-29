import { Types, Document } from 'mongoose';
import { DiscipleshipStage } from '../../shared/constants/stages';
import { Role } from '../../shared/constants/roles';

/**
 * Core user fields shared by both converts and admins.
 */
export interface IUserBase {
  role: Role;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  profileImageUrl?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  /** The branch this user belongs to. Null only for super_admin (all branches). */
  branchId?: Types.ObjectId | null;
}

/**
 * Convert-specific fields.
 * These only apply when role === 'convert'.
 */
export interface IConvertFields {
  currentStage: DiscipleshipStage;
  stageUpdatedAt: Date;
  isHolySpiritFilled: boolean;
  holySpiritFilledAt?: Date;
  holySpiritConfirmedBy?: Types.ObjectId;
  dateOfBirth?: Date;
  gender?: 'male' | 'female';
  address?: string;
  invitedBy?: string;
  mentorId?: Types.ObjectId | null;
  lastNudgeAt?: Date | null;
  department?: string | null;
  departmentStatus?: 'member' | 'interested' | null;
  cohortId?: Types.ObjectId | null;
  lowDataMode?: boolean;
  lastContactedAt?: Date | null;
}

/**
 * Admin-specific fields.
 * These only apply when role === 'admin'.
 */
export interface IAdminFields {
  email: string; // required for admin (override optional from base)
  passwordHash: string;
  mustChangePassword: boolean;
}

/**
 * Full user document interface (Mongoose document).
 */
export interface IUser extends IUserBase, Partial<IConvertFields>, Partial<IAdminFields>, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Instance methods available on user documents.
 */
export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
  fullName(): string;
}

/**
 * Safe user object for API responses — strips sensitive fields.
 */
export interface UserPublicProfile {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  profileImageUrl?: string;
  currentStage?: DiscipleshipStage;
  stageUpdatedAt?: Date;
  isHolySpiritFilled?: boolean;
  isActive: boolean;
  mustChangePassword?: boolean;
  branchId?: string | null;
  mentorId?: string | null;
  department?: string | null;
  departmentStatus?: 'member' | 'interested' | null;
  cohortId?: string | null;
  lowDataMode?: boolean;
  createdAt: Date;
}

/**
 * Fields that a convert can update on their own profile.
 */
export interface ConvertProfileUpdate {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female';
  address?: string;
  profileImageUrl?: string;
  department?: string | null;
  departmentStatus?: 'member' | 'interested' | null;
  cohortId?: Types.ObjectId | null;
  lowDataMode?: boolean;
  lastContactedAt?: Date | null;
}
