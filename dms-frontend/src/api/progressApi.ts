import apiClient from './client';
import type { ApiSuccessResponse } from '@/types/api';
import type {
  ProgressSummary,
  LessonProgress,
  StartLessonResponse,
  CompleteLessonResponse,
} from '@/types/models';

/**
 * Progress API — convert lesson start/complete and progress queries.
 *
 * Routes:  GET  /v1/progress/summary
 *          GET  /v1/progress/lessons
 *          POST /v1/progress/lessons/:lessonId/start
 *          POST /v1/progress/lessons/:lessonId/complete
 */
export const progressApi = {
  /** GET /v1/progress/summary */
  getSummary: async (courseId?: string): Promise<ProgressSummary> => {
    const { data } = await apiClient.get<ApiSuccessResponse<ProgressSummary>>(
      '/v1/progress/summary', { params: courseId ? { courseId } : {} }
    );
    return data.data;
  },

  /** GET /v1/progress/lessons — per-lesson progress for all published lessons */
  getLessonProgress: async (courseId?: string): Promise<LessonProgress[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<LessonProgress[]>>(
      '/v1/progress/lessons', { params: courseId ? { courseId } : {} }
    );
    return data.data;
  },

  /** POST /v1/progress/lessons/:lessonId/start */
  startLesson: async (lessonId: string): Promise<StartLessonResponse> => {
    const { data } = await apiClient.post<ApiSuccessResponse<StartLessonResponse>>(
      `/v1/progress/lessons/${lessonId}/start`
    );
    return data.data;
  },

  /** POST /v1/progress/lessons/:lessonId/complete */
  completeLesson: async (lessonId: string): Promise<CompleteLessonResponse> => {
    const { data } = await apiClient.post<ApiSuccessResponse<CompleteLessonResponse>>(
      `/v1/progress/lessons/${lessonId}/complete`
    );
    return data.data;
  },
};
