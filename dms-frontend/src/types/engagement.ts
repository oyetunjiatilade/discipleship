export interface Reflection {
  lessonId: string;
  text: string;
  actionStepDone: boolean;
  updatedAt: string;
}

export interface ReflectionWithLesson extends Reflection {
  lessonTitle: string;
}

export interface Cohort {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  memberCount?: number;
}

export type PostType = 'prayer' | 'praise' | 'message';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  type: PostType;
  text: string;
  amenCount: number;
  amenedByMe: boolean;
  createdAt: string;
}

export type RsvpStatus = 'going' | 'not_going';

export interface LiveSession {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl: string;
  cohortId: string | null;
  goingCount?: number;
  attendedCount?: number;
  myRsvp?: RsvpStatus | null;
}

export interface Attendee {
  userId: string;
  name: string;
  phone: string;
  rsvp: RsvpStatus | null;
  attended: boolean;
}
