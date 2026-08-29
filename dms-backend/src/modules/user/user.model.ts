import mongoose, { Schema, Model, CallbackError } from 'mongoose';
import bcrypt from 'bcryptjs';
import { DiscipleshipStage, STAGE_VALUES } from '../../shared/constants/stages';
import { Role, ROLE_VALUES } from '../../shared/constants/roles';
import { authConfig } from '../../config';
import { IUser, IUserMethods, UserPublicProfile } from './user.types';

// ─────────────────────────────────────────────
// Combined model type (document + methods)
// ─────────────────────────────────────────────
type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

// ─────────────────────────────────────────────
// Schema definition
// ─────────────────────────────────────────────
const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    // ── Shared fields ──
    role: {
      type: String,
      enum: ROLE_VALUES,
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    profileImageUrl: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // The branch (church location) this user belongs to. Null only for super_admin.
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    // ── Convert-specific fields ──
    currentStage: {
      type: String,
      enum: STAGE_VALUES,
      default: null,
    },
    stageUpdatedAt: {
      type: Date,
      default: null,
    },
    isHolySpiritFilled: {
      type: Boolean,
      default: false,
    },
    holySpiritFilledAt: {
      type: Date,
      default: null,
    },
    holySpiritConfirmedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    invitedBy: {
      type: String,
      trim: true,
      default: null,
    },
    // Church department the convert belongs to or wishes to join.
    department: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    // Whether they are already a 'member' of that department or 'interested' in joining.
    departmentStatus: {
      type: String,
      enum: ['member', 'interested'],
      default: null,
    },
    // The mentor (shepherd) assigned to walk alongside this convert.
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Last time we sent this convert a re-engagement nudge (spam guard).
    lastNudgeAt: {
      type: Date,
      default: null,
    },
    // Cohort (class intake) the convert belongs to, for group community.
    cohortId: {
      type: Schema.Types.ObjectId,
      ref: 'Cohort',
      default: null,
      index: true,
    },
    // Convert preference: reduce data usage (defer video, prefer transcript).
    lowDataMode: {
      type: Boolean,
      default: false,
    },
    // Last time an admin logged a call/contact with this convert.
    lastContactedAt: {
      type: Date,
      default: null,
    },

    // ── Admin-specific fields ──
    passwordHash: {
      type: String,
      select: false, // Never returned by default in queries
    },
    // Force a password change on next login (used for seeded/rotated admins)
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────

// Unique phone per role (converts have unique phones; admins might share phone with convert account)
userSchema.index(
  { phone: 1, role: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

// Unique email for admins
userSchema.index(
  { email: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { role: 'admin', isActive: true },
  }
);

// Admin dashboard queries: list converts by stage
userSchema.index({ role: 1, currentStage: 1, createdAt: -1 });

// Mentor flock queries: converts assigned to a mentor
userSchema.index({ mentorId: 1, isActive: 1 });

// Branch-scoped list/report queries (admin converts list, staff lists, etc.)
userSchema.index({ branchId: 1, role: 1, isActive: 1 });

// ─────────────────────────────────────────────
// Pre-save hooks
// ─────────────────────────────────────────────

/**
 * Set initial stage for new converts.
 */
userSchema.pre('save', function (next) {
  if (this.isNew && this.role === Role.CONVERT && !this.currentStage) {
    this.currentStage = DiscipleshipStage.NEW_CONVERT;
    this.stageUpdatedAt = new Date();
  }
  next();
});

/**
 * Hash admin password before saving.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return next();
  }

  // Only hash if the value is not already a bcrypt hash
  // (bcrypt hashes start with $2a$ or $2b$)
  if (this.passwordHash.startsWith('$2')) {
    return next();
  }

  try {
    this.passwordHash = await bcrypt.hash(this.passwordHash, authConfig.password.saltRounds);
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

// ─────────────────────────────────────────────
// Instance methods
// ─────────────────────────────────────────────

/**
 * Compare a candidate password against the stored hash.
 * Only meaningful for admin users.
 */
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

/**
 * Get full display name.
 */
userSchema.methods.fullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

// ─────────────────────────────────────────────
// Static helper to build a public-safe profile object
// ─────────────────────────────────────────────
export function toPublicProfile(user: IUser): UserPublicProfile {
  return {
    id: user._id.toString(),
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    profileImageUrl: user.profileImageUrl,
    currentStage: user.currentStage,
    stageUpdatedAt: user.stageUpdatedAt,
    isHolySpiritFilled: user.isHolySpiritFilled,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword ?? false,
    branchId: user.branchId ? user.branchId.toString() : null,
    mentorId: user.mentorId ? user.mentorId.toString() : null,
    department: user.department ?? null,
    departmentStatus: user.departmentStatus ?? null,
    cohortId: user.cohortId ? user.cohortId.toString() : null,
    lowDataMode: user.lowDataMode ?? false,
    createdAt: user.createdAt,
  };
}

// ─────────────────────────────────────────────
// Export model
// ─────────────────────────────────────────────
export const User = mongoose.model<IUser, UserModel>('User', userSchema);
