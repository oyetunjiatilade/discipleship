import apiClient from './client';
import type { ApiSuccessResponse } from '@/types/api';
import type { FlockMember, MentorSummary, MentorConvertDetail, MentorNote } from '@/types/care';
import type { UserPublicProfile } from '@/types/auth';

export interface CreateMentorPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  /** Only meaningful when the caller is super_admin. */
  branchId?: string;
}

export const mentorApi = {
  /** GET /v1/mentor/flock (admins may pass mentorId) */
  getFlock: async (mentorId?: string): Promise<FlockMember[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ flock: FlockMember[]; total: number }>>(
      '/v1/mentor/flock',
      { params: mentorId ? { mentorId } : {} }
    );
    return data.data.flock;
  },

  /** GET /v1/admin/mentors */
  listMentors: async (): Promise<MentorSummary[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ mentors: MentorSummary[] }>>(
      '/v1/admin/mentors'
    );
    return data.data.mentors;
  },

  /** POST /v1/admin/mentors */
  createMentor: async (payload: CreateMentorPayload): Promise<UserPublicProfile> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ mentor: UserPublicProfile }>>(
      '/v1/admin/mentors',
      payload
    );
    return data.data.mentor;
  },

  /** POST /v1/admin/converts/:convertId/assign-mentor */
  assignConvert: async (convertId: string, mentorId: string): Promise<void> => {
    await apiClient.post(`/v1/admin/converts/${convertId}/assign-mentor`, { mentorId });
  },

  /** POST /v1/admin/converts/:convertId/unassign-mentor */
  unassignConvert: async (convertId: string): Promise<void> => {
    await apiClient.post(`/v1/admin/converts/${convertId}/unassign-mentor`);
  },

  /** GET /v1/mentor/converts/:convertId — full detail for a convert in my flock */
  getConvertDetail: async (convertId: string): Promise<MentorConvertDetail> => {
    const { data } = await apiClient.get<ApiSuccessResponse<MentorConvertDetail>>(
      `/v1/mentor/converts/${convertId}`
    );
    return data.data;
  },

  /** POST /v1/mentor/converts/:convertId/notes */
  addNote: async (convertId: string, text: string): Promise<MentorNote> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ note: MentorNote }>>(
      `/v1/mentor/converts/${convertId}/notes`,
      { text }
    );
    return data.data.note;
  },

  /** DELETE /v1/mentor/notes/:noteId */
  deleteNote: async (noteId: string): Promise<void> => {
    await apiClient.delete(`/v1/mentor/notes/${noteId}`);
  },
};
