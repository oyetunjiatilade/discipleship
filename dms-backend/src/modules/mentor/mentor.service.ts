import { Types } from 'mongoose';
import { User, toPublicProfile } from '../user/user.model';
import { UserPublicProfile } from '../user/user.types';
import { Role } from '../../shared/constants/roles';
import { DiscipleshipStage, STAGE_LABELS } from '../../shared/constants/stages';
import { authService } from '../auth/auth.service';
import { progressService } from '../progress/progress.service';
import { notificationService } from '../notification/notification.service';
import { NotFoundError, ConflictError, AppError, ForbiddenError } from '../../shared/errors';
import { MentorNote, MentorNoteView, toMentorNoteView } from './mentor-note.model';
import { reflectionService } from '../reflection/reflection.service';
import { stageService } from '../stage/stage.service';
import { Cohort } from '../cohort/cohort.model';
import { branchFilter, assertBranchAccess } from '../../shared/access/branch-scope';

type Requester = { userId: string; role: string; branchId: string | null };

/** Health status of a convert from a shepherding perspective. */
export type FlockStatus = 'new' | 'active' | 'stuck' | 'dark' | 'done';

export interface FlockMember {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  currentStage: DiscipleshipStage;
  stageLabel: string;
  isHolySpiritFilled: boolean;
  percentComplete: number;
  completedLessons: number;
  totalLessons: number;
  lastActivityAt: Date | null;
  daysSinceActive: number | null;
  status: FlockStatus;
}

const DARK_DAYS = 7; // no activity for a week → needs a check-in

function daysBetween(from: Date | null, to: Date): number | null {
  if (!from) return null;
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

class MentorService {
  /**
   * List all mentors with the size of each mentor's flock.
   */
  async listMentors(
    requester: Requester
  ): Promise<Array<UserPublicProfile & { flockCount: number }>> {
    const mentors = await User.find({
      role: Role.MENTOR,
      isActive: true,
      ...branchFilter(requester),
    }).sort({ firstName: 1 });

    const counts = await User.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          role: Role.CONVERT,
          isActive: true,
          mentorId: { $ne: null },
          ...branchFilter(requester),
        },
      },
      { $group: { _id: '$mentorId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    return mentors.map((m) => ({
      ...toPublicProfile(m),
      flockCount: countMap.get(m._id.toString()) ?? 0,
    }));
  }

  /**
   * Create a mentor account (logs in with email + password, like an admin).
   * `branchId` is required — a plain admin's own branch, or a branch chosen
   * by a super_admin (decided by the controller, mirroring auth.controller.createAdmin).
   */
  async createMentor(input: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    password: string;
    branchId: string | null;
  }): Promise<UserPublicProfile> {
    return authService.createAdmin({
      ...input,
      role: Role.MENTOR,
      mustChangePassword: true,
    });
  }

  /**
   * Assign a convert to a mentor. Both must belong to the same branch, and
   * that branch must be one the requester has access to.
   */
  async assignConvert(
    requester: Requester,
    convertId: string,
    mentorId: string
  ): Promise<UserPublicProfile> {
    if (!Types.ObjectId.isValid(convertId) || !Types.ObjectId.isValid(mentorId)) {
      throw new AppError('Invalid ID', 400, 'INVALID_ID');
    }

    const mentor = await User.findOne({
      _id: mentorId,
      role: Role.MENTOR,
      isActive: true,
    });
    if (!mentor) throw new NotFoundError('Mentor', mentorId);
    assertBranchAccess(requester, mentor.branchId?.toString());

    const convert = await User.findOne({
      _id: convertId,
      role: Role.CONVERT,
      isActive: true,
    });
    if (!convert) throw new NotFoundError('Convert', convertId);
    assertBranchAccess(requester, convert.branchId?.toString());

    if (convert.branchId?.toString() !== mentor.branchId?.toString()) {
      throw new AppError('Mentor and convert must belong to the same branch', 400, 'BRANCH_MISMATCH');
    }

    if (convert.mentorId && convert.mentorId.toString() === mentorId) {
      throw new ConflictError('Convert is already assigned to this mentor');
    }

    convert.mentorId = new Types.ObjectId(mentorId);
    await convert.save();

    // Let the convert know a mentor is walking with them (fire-and-forget).
    notificationService
      .create({
        recipientId: convertId,
        type: 'admin_message',
        title: 'You have a mentor',
        message: `${mentor.firstName} ${mentor.lastName} is here to walk alongside you. Reach out any time.`,
      })
      .catch((err) => console.error('[Mentor] assign notification failed:', err));

    return toPublicProfile(convert);
  }

  /**
   * Remove a convert's mentor assignment.
   */
  async unassignConvert(requester: Requester, convertId: string): Promise<UserPublicProfile> {
    const convert = await User.findOne({
      _id: convertId,
      role: Role.CONVERT,
      isActive: true,
    });
    if (!convert) throw new NotFoundError('Convert', convertId);
    assertBranchAccess(requester, convert.branchId?.toString());

    convert.mentorId = null;
    await convert.save();
    return toPublicProfile(convert);
  }

  /**
   * Get a mentor's flock — the converts assigned to them, each enriched with
   * progress and a shepherding health status. Sorted so the people who need
   * attention most (longest silence) come first.
   */
  async getFlock(requester: Requester, mentorId: string): Promise<FlockMember[]> {
    const mentor = await User.findOne({ _id: mentorId, role: Role.MENTOR, isActive: true });
    if (!mentor) throw new NotFoundError('Mentor', mentorId);
    assertBranchAccess(requester, mentor.branchId?.toString());

    const converts = await User.find({
      role: Role.CONVERT,
      isActive: true,
      mentorId: new Types.ObjectId(mentorId),
    });

    const now = new Date();

    const members = await Promise.all(
      converts.map(async (c): Promise<FlockMember> => {
        const summary = await progressService.getProgressSummary(c._id.toString());
        const lastActivityAt = summary.lastActivityAt ?? c.lastLoginAt ?? null;
        const daysSinceActive = daysBetween(lastActivityAt, now);
        const stage = c.currentStage as DiscipleshipStage;

        let status: FlockStatus;
        if (
          stage === DiscipleshipStage.CLASS_COMPLETED ||
          stage === DiscipleshipStage.BAPTIZED ||
          stage === DiscipleshipStage.MEMBER_TRANSFERRED
        ) {
          status = 'done';
        } else if (stage === DiscipleshipStage.NEW_CONVERT && summary.completedLessons === 0) {
          status = daysSinceActive !== null && daysSinceActive > DARK_DAYS ? 'dark' : 'new';
        } else if (daysSinceActive === null || daysSinceActive > DARK_DAYS) {
          status = summary.completedLessons > 0 ? 'stuck' : 'dark';
        } else {
          status = 'active';
        }

        return {
          id: c._id.toString(),
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          currentStage: stage,
          stageLabel: STAGE_LABELS[stage] ?? stage,
          isHolySpiritFilled: c.isHolySpiritFilled ?? false,
          percentComplete: summary.percentComplete,
          completedLessons: summary.completedLessons,
          totalLessons: summary.totalLessons,
          lastActivityAt,
          daysSinceActive,
          status,
        };
      })
    );

    // Most-silent first; nulls (never active) at the very top.
    return members.sort((a, b) => {
      const da = a.daysSinceActive ?? Number.MAX_SAFE_INTEGER;
      const db = b.daysSinceActive ?? Number.MAX_SAFE_INTEGER;
      return db - da;
    });
  }

  /**
   * Full detail for one convert (mentor's convert-detail screen): profile,
   * progress, their reflections, stage history, and notes. Notes are private —
   * a mentor sees only their own; an admin sees all.
   */
  async getConvertDetail(requester: { userId: string; role: string }, convertId: string) {
    const convert = await User.findOne({
      _id: convertId,
      role: Role.CONVERT,
      isActive: true,
    });
    if (!convert) throw new NotFoundError('Convert', convertId);

    const [summary, reflections, stageHistory] = await Promise.all([
      progressService.getProgressSummary(convertId),
      reflectionService.listForConvert(convertId),
      stageService.getStageHistory(convertId),
    ]);

    const cohort = convert.cohortId
      ? await Cohort.findById(convert.cohortId).select('name')
      : null;

    const noteFilter: Record<string, unknown> = { convertId: new Types.ObjectId(convertId) };
    if (requester.role === Role.MENTOR) {
      noteFilter.mentorId = new Types.ObjectId(requester.userId);
    }
    const notes = await MentorNote.find(noteFilter).sort({ createdAt: -1 });

    const stage = convert.currentStage as DiscipleshipStage;

    return {
      convert: {
        id: convert._id.toString(),
        firstName: convert.firstName,
        lastName: convert.lastName,
        phone: convert.phone,
        currentStage: stage,
        stageLabel: STAGE_LABELS[stage] || stage,
        isHolySpiritFilled: convert.isHolySpiritFilled ?? false,
        department: convert.department ?? null,
        departmentStatus: convert.departmentStatus ?? null,
        cohortName: cohort?.name ?? null,
        lastLoginAt: convert.lastLoginAt ?? null,
      },
      progress: {
        percentComplete: summary.percentComplete,
        completedLessons: summary.completedLessons,
        totalLessons: summary.totalLessons,
        lastActivityAt: summary.lastActivityAt,
      },
      reflections,
      stageHistory,
      notes: notes.map(toMentorNoteView),
    };
  }

  /** Add a private note about a convert. */
  async addNote(mentorId: string, convertId: string, text: string): Promise<MentorNoteView> {
    const note = await MentorNote.create({
      mentorId: new Types.ObjectId(mentorId),
      convertId: new Types.ObjectId(convertId),
      text: text.trim(),
    });
    return toMentorNoteView(note);
  }

  /** Delete a note (author-only; admins may delete any note in their own branch; super_admin any). */
  async deleteNote(requester: Requester, noteId: string): Promise<void> {
    const note = await MentorNote.findById(noteId);
    if (!note) throw new NotFoundError('Note', noteId);

    if (requester.role === Role.SUPER_ADMIN) {
      await note.deleteOne();
      return;
    }

    if (requester.role === Role.ADMIN) {
      const convert = await User.findOne({ _id: note.convertId, role: Role.CONVERT }).select(
        'branchId'
      );
      assertBranchAccess(requester, convert?.branchId?.toString());
      await note.deleteOne();
      return;
    }

    if (note.mentorId.toString() !== requester.userId) {
      throw new ForbiddenError('You can only delete your own notes.');
    }
    await note.deleteOne();
  }
}

export const mentorService = new MentorService();
