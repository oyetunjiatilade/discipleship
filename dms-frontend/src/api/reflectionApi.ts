import apiClient from './client';
import type { ApiSuccessResponse } from '@/types/api';
import type { Reflection, ReflectionWithLesson } from '@/types/engagement';

export const reflectionApi = {
  /** GET /v1/reflections/lessons/:lessonId */
  getForLesson: async (lessonId: string): Promise<Reflection | null> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ reflection: Reflection | null }>>(
      `/v1/reflections/lessons/${lessonId}`
    );
    return data.data.reflection;
  },

  /** PUT /v1/reflections/lessons/:lessonId */
  save: async (
    lessonId: string,
    payload: { text?: string; actionStepDone?: boolean }
  ): Promise<Reflection> => {
    const { data } = await apiClient.put<ApiSuccessResponse<{ reflection: Reflection }>>(
      `/v1/reflections/lessons/${lessonId}`,
      payload
    );
    return data.data.reflection;
  },

  /** GET /v1/mentor/converts/:convertId/reflections (mentor/admin) */
  listForConvert: async (convertId: string): Promise<ReflectionWithLesson[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ reflections: ReflectionWithLesson[] }>>(
      `/v1/mentor/converts/${convertId}/reflections`
    );
    return data.data.reflections;
  },
};
