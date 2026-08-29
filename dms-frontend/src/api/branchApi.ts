import apiClient from './client';
import type { ApiSuccessResponse } from '@/types/api';
import type { Branch } from '@/types/models';

export interface CreateBranchPayload {
  name: string;
}

export interface UpdateBranchPayload {
  name?: string;
  isActive?: boolean;
}

export const branchApi = {
  /** GET /v1/branches — public, active branches only (registration dropdown). */
  listPublicBranches: async (): Promise<Branch[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ branches: Branch[] }>>(
      '/v1/branches'
    );
    return data.data.branches;
  },

  /** GET /v1/admin/branches — super_admin, all branches. */
  listBranches: async (): Promise<Branch[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ branches: Branch[] }>>(
      '/v1/admin/branches'
    );
    return data.data.branches;
  },

  /** POST /v1/admin/branches — super_admin. */
  createBranch: async (payload: CreateBranchPayload): Promise<Branch> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ branch: Branch }>>(
      '/v1/admin/branches',
      payload
    );
    return data.data.branch;
  },

  /** PATCH /v1/admin/branches/:branchId — super_admin. */
  updateBranch: async (branchId: string, payload: UpdateBranchPayload): Promise<Branch> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<{ branch: Branch }>>(
      `/v1/admin/branches/${branchId}`,
      payload
    );
    return data.data.branch;
  },
};
