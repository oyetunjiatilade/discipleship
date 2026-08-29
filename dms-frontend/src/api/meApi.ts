import apiClient from './client';
import type { ApiSuccessResponse } from '@/types/api';
import type { UserPublicProfile } from '@/types/auth';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  address?: string;
  profileImageUrl?: string;
  department?: string | null;
  departmentStatus?: 'member' | 'interested' | null;
  lowDataMode?: boolean;
}

export const meApi = {
  /** GET /v1/me */
  getProfile: async (): Promise<UserPublicProfile> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ user: UserPublicProfile }>>(
      '/v1/me'
    );
    return data.data.user;
  },

  /** PATCH /v1/me */
  updateProfile: async (payload: UpdateProfilePayload): Promise<UserPublicProfile> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<{ user: UserPublicProfile }>>(
      '/v1/me',
      payload
    );
    return data.data.user;
  },
};
