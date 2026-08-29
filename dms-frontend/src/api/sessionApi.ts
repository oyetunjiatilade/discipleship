import apiClient from './client';
import type { ApiSuccessResponse } from '@/types/api';
import type { LiveSession, Attendee, RsvpStatus } from '@/types/engagement';

export interface CreateSessionPayload {
  title: string;
  description?: string;
  scheduledAt: string; // ISO
  durationMinutes?: number;
  meetingUrl: string;
  cohortId?: string | null;
}

export const sessionApi = {
  // ── Convert ──
  listUpcoming: async (): Promise<LiveSession[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ sessions: LiveSession[] }>>(
      '/v1/sessions'
    );
    return data.data.sessions;
  },
  rsvp: async (sessionId: string, rsvp: RsvpStatus): Promise<LiveSession> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ session: LiveSession }>>(
      `/v1/sessions/${sessionId}/rsvp`,
      { rsvp }
    );
    return data.data.session;
  },

  // ── Admin ──
  list: async (): Promise<LiveSession[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ sessions: LiveSession[] }>>(
      '/v1/admin/sessions'
    );
    return data.data.sessions;
  },
  create: async (payload: CreateSessionPayload): Promise<LiveSession> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ session: LiveSession }>>(
      '/v1/admin/sessions',
      payload
    );
    return data.data.session;
  },
  update: async (sessionId: string, payload: Partial<CreateSessionPayload>): Promise<LiveSession> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<{ session: LiveSession }>>(
      `/v1/admin/sessions/${sessionId}`,
      payload
    );
    return data.data.session;
  },
  remove: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/v1/admin/sessions/${sessionId}`);
  },
  getAttendance: async (sessionId: string): Promise<Attendee[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ attendees: Attendee[] }>>(
      `/v1/admin/sessions/${sessionId}/attendance`
    );
    return data.data.attendees;
  },
  markAttendance: async (sessionId: string, userId: string, attended: boolean): Promise<void> => {
    await apiClient.post(`/v1/admin/sessions/${sessionId}/attendance`, { userId, attended });
  },
};
