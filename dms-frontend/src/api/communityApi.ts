import apiClient from './client';
import type { ApiSuccessResponse } from '@/types/api';
import type { Cohort, Post, PostType } from '@/types/engagement';

export const communityApi = {
  /** GET /v1/community — my cohort + feed */
  getFeed: async (): Promise<{ cohort: Cohort | null; posts: Post[] }> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ cohort: Cohort | null; posts: Post[] }>>(
      '/v1/community'
    );
    return data.data;
  },

  /** POST /v1/community/posts */
  createPost: async (payload: { type?: PostType; text: string }): Promise<Post> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ post: Post }>>(
      '/v1/community/posts',
      payload
    );
    return data.data.post;
  },

  /** POST /v1/community/posts/:postId/amen */
  toggleAmen: async (postId: string): Promise<Post> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ post: Post }>>(
      `/v1/community/posts/${postId}/amen`
    );
    return data.data.post;
  },

  /** DELETE /v1/community/posts/:postId */
  deletePost: async (postId: string): Promise<void> => {
    await apiClient.delete(`/v1/community/posts/${postId}`);
  },

  // ── Admin cohort management ──
  listCohorts: async (): Promise<Cohort[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ cohorts: Cohort[] }>>(
      '/v1/admin/cohorts'
    );
    return data.data.cohorts;
  },
  createCohort: async (payload: { name: string; description?: string }): Promise<Cohort> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ cohort: Cohort }>>(
      '/v1/admin/cohorts',
      payload
    );
    return data.data.cohort;
  },
  updateCohort: async (
    cohortId: string,
    payload: { name?: string; description?: string; isActive?: boolean }
  ): Promise<Cohort> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<{ cohort: Cohort }>>(
      `/v1/admin/cohorts/${cohortId}`,
      payload
    );
    return data.data.cohort;
  },
  assignCohort: async (convertId: string, cohortId: string): Promise<void> => {
    await apiClient.post(`/v1/admin/converts/${convertId}/assign-cohort`, { cohortId });
  },
};
