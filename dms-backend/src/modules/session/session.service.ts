import { Types } from 'mongoose';
import {
  LiveSession,
  SessionAttendance,
  SessionView,
  AttendeeView,
  RsvpStatus,
  toSessionView,
} from './session.model';
import { User } from '../user/user.model';
import { NotFoundError } from '../../shared/errors';
import { branchFilter, assertBranchAccess } from '../../shared/access/branch-scope';

type Requester = { userId: string; role: string; branchId: string | null };

interface CreateSessionInput {
  title: string;
  description?: string;
  scheduledAt: Date;
  durationMinutes?: number;
  meetingUrl: string;
  cohortId?: string | null;
  branchId: string;
}

class SessionService {
  // ── Admin ──
  async listSessions(requester: Requester): Promise<SessionView[]> {
    const sessions = await LiveSession.find({ ...branchFilter(requester) }).sort({
      scheduledAt: -1,
    });
    if (sessions.length === 0) return [];
    const ids = sessions.map((s) => s._id);
    const agg = await SessionAttendance.aggregate<{
      _id: Types.ObjectId;
      going: number;
      attended: number;
    }>([
      { $match: { sessionId: { $in: ids } } },
      {
        $group: {
          _id: '$sessionId',
          going: { $sum: { $cond: [{ $eq: ['$rsvp', 'going'] }, 1, 0] } },
          attended: { $sum: { $cond: ['$attended', 1, 0] } },
        },
      },
    ]);
    const map = new Map(agg.map((a) => [a._id.toString(), a]));
    return sessions.map((s) => {
      const a = map.get(s._id.toString());
      return toSessionView(s, { goingCount: a?.going ?? 0, attendedCount: a?.attended ?? 0 });
    });
  }

  async createSession(input: CreateSessionInput, adminId: string): Promise<SessionView> {
    const s = await LiveSession.create({
      title: input.title.trim(),
      description: input.description?.trim() || '',
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes ?? 60,
      meetingUrl: input.meetingUrl.trim(),
      cohortId: input.cohortId ? new Types.ObjectId(input.cohortId) : null,
      branchId: input.branchId,
      createdBy: new Types.ObjectId(adminId),
    });
    return toSessionView(s, { goingCount: 0, attendedCount: 0 });
  }

  async updateSession(
    requester: Requester,
    sessionId: string,
    input: Partial<CreateSessionInput>
  ): Promise<SessionView> {
    const s = await LiveSession.findById(sessionId);
    if (!s) throw new NotFoundError('Session', sessionId);
    assertBranchAccess(requester, s.branchId?.toString());
    if (input.title !== undefined) s.title = input.title.trim();
    if (input.description !== undefined) s.description = input.description.trim();
    if (input.scheduledAt !== undefined) s.scheduledAt = input.scheduledAt;
    if (input.durationMinutes !== undefined) s.durationMinutes = input.durationMinutes;
    if (input.meetingUrl !== undefined) s.meetingUrl = input.meetingUrl.trim();
    if (input.cohortId !== undefined) {
      s.cohortId = input.cohortId ? new Types.ObjectId(input.cohortId) : null;
    }
    await s.save();
    return toSessionView(s);
  }

  async deleteSession(requester: Requester, sessionId: string): Promise<void> {
    const s = await LiveSession.findById(sessionId);
    if (!s) throw new NotFoundError('Session', sessionId);
    assertBranchAccess(requester, s.branchId?.toString());
    await SessionAttendance.deleteMany({ sessionId: s._id });
    await s.deleteOne();
  }

  async getAttendance(requester: Requester, sessionId: string): Promise<AttendeeView[]> {
    const session = await LiveSession.findById(sessionId);
    if (!session) throw new NotFoundError('Session', sessionId);
    assertBranchAccess(requester, session.branchId?.toString());

    const records = await SessionAttendance.find({ sessionId }).sort({ updatedAt: -1 });
    if (records.length === 0) return [];
    const userIds = records.map((r) => r.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName phone');
    const umap = new Map(users.map((u) => [u._id.toString(), u]));
    return records.map((r) => {
      const u = umap.get(r.userId.toString());
      return {
        userId: r.userId.toString(),
        name: u ? `${u.firstName} ${u.lastName}` : 'Unknown',
        phone: u?.phone ?? '',
        rsvp: r.rsvp,
        attended: r.attended,
      };
    });
  }

  async markAttendance(
    requester: Requester,
    sessionId: string,
    userId: string,
    attended: boolean
  ): Promise<void> {
    const session = await LiveSession.findById(sessionId);
    if (!session) throw new NotFoundError('Session', sessionId);
    assertBranchAccess(requester, session.branchId?.toString());
    await SessionAttendance.findOneAndUpdate(
      { sessionId: new Types.ObjectId(sessionId), userId: new Types.ObjectId(userId) },
      { $set: { attended } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  // ── Convert ──
  async listUpcoming(userId: string): Promise<SessionView[]> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    // Include sessions starting from 2h ago (so an in-progress meeting still shows).
    const start = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const cohortClause: Record<string, unknown>[] = [{ cohortId: null }];
    if (user.cohortId) cohortClause.push({ cohortId: user.cohortId });

    const filter: Record<string, unknown> = {
      scheduledAt: { $gte: start },
      branchId: user.branchId,
      $or: cohortClause,
    };
    const sessions = await LiveSession.find(filter).sort({ scheduledAt: 1 }).limit(50);

    const ids = sessions.map((s) => s._id);
    const myRecs = await SessionAttendance.find({
      sessionId: { $in: ids },
      userId: new Types.ObjectId(userId),
    });
    const rmap = new Map(myRecs.map((r) => [r.sessionId.toString(), r.rsvp]));

    return sessions.map((s) => toSessionView(s, { myRsvp: rmap.get(s._id.toString()) ?? null }));
  }

  async rsvp(userId: string, sessionId: string, rsvp: RsvpStatus): Promise<SessionView> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const session = await LiveSession.findById(sessionId);
    if (!session) throw new NotFoundError('Session', sessionId);
    if (session.branchId.toString() !== user.branchId?.toString()) {
      throw new NotFoundError('Session', sessionId);
    }
    await SessionAttendance.findOneAndUpdate(
      { sessionId: new Types.ObjectId(sessionId), userId: new Types.ObjectId(userId) },
      { $set: { rsvp } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return toSessionView(session, { myRsvp: rsvp });
  }
}

export const sessionService = new SessionService();
