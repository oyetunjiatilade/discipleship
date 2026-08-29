import mongoose, { Schema, Document, Types } from 'mongoose';

export type RsvpStatus = 'going' | 'not_going';

/** A scheduled live discipleship session (e.g. a Google Meet class). */
export interface ILiveSession extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingUrl: string;
  cohortId: Types.ObjectId | null; // null = for everyone (within the branch)
  branchId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** One convert's RSVP + attendance for a session. */
export interface ISessionAttendance extends Document {
  _id: Types.ObjectId;
  sessionId: Types.ObjectId;
  userId: Types.ObjectId;
  rsvp: RsvpStatus | null;
  attended: boolean;
  updatedAt: Date;
  createdAt: Date;
}

export interface SessionView {
  id: string;
  title: string;
  description: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingUrl: string;
  cohortId: string | null;
  branchId: string;
  goingCount?: number;
  attendedCount?: number;
  myRsvp?: RsvpStatus | null;
}

export interface AttendeeView {
  userId: string;
  name: string;
  phone: string;
  rsvp: RsvpStatus | null;
  attended: boolean;
}

const sessionSchema = new Schema<ILiveSession>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 60, min: 5, max: 600 },
    meetingUrl: { type: String, required: true, trim: true, maxlength: 1000 },
    cohortId: { type: Schema.Types.ObjectId, ref: 'Cohort', default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { transform(_d, r: Record<string, unknown>) { delete r.__v; return r; } } }
);

const attendanceSchema = new Schema<ISessionAttendance>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'LiveSession', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rsvp: { type: String, enum: ['going', 'not_going'], default: null },
    attended: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { transform(_d, r: Record<string, unknown>) { delete r.__v; return r; } } }
);

attendanceSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

export function toSessionView(s: ILiveSession, extra: Partial<SessionView> = {}): SessionView {
  return {
    id: s._id.toString(),
    title: s.title,
    description: s.description,
    scheduledAt: s.scheduledAt,
    durationMinutes: s.durationMinutes,
    meetingUrl: s.meetingUrl,
    cohortId: s.cohortId ? s.cohortId.toString() : null,
    branchId: s.branchId.toString(),
    ...extra,
  };
}

export const LiveSession = mongoose.model<ILiveSession>('LiveSession', sessionSchema);
export const SessionAttendance = mongoose.model<ISessionAttendance>('SessionAttendance', attendanceSchema);
