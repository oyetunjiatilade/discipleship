import apiClient from './client';
import type { ApiSuccessResponse } from '@/types/api';
import type {
  Quiz,
  AttemptResult,
  AttemptSummary,
  SubmitQuizPayload,
} from '@/types/models';

/**
 * Quiz API — convert-facing quiz access and submission.
 *
 * Routes:  GET  /v1/quizzes/lesson/:lessonId
 *          POST /v1/quizzes/lesson/:lessonId/submit
 *          GET  /v1/quizzes/lesson/:lessonId/attempts
 *          GET  /v1/quizzes/attempts/:attemptId
 */
export const quizApi = {
  /** GET /v1/quizzes/lesson/:lessonId — quiz without correct answers */
  getQuizForLesson: async (lessonId: string): Promise<Quiz> => {
    const { data } = await apiClient.get<ApiSuccessResponse<Quiz>>(
      `/v1/quizzes/lesson/${lessonId}`
    );
    return data.data;
  },

  /** POST /v1/quizzes/lesson/:lessonId/submit — submit answers, get graded result */
  submitQuiz: async (
    lessonId: string,
    payload: SubmitQuizPayload
  ): Promise<AttemptResult> => {
    const { data } = await apiClient.post<ApiSuccessResponse<AttemptResult>>(
      `/v1/quizzes/lesson/${lessonId}/submit`,
      payload
    );
    return data.data;
  },

  /** GET /v1/quizzes/lesson/:lessonId/attempts — own attempt history */
  getAttempts: async (lessonId: string): Promise<AttemptSummary[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<AttemptSummary[]>>(
      `/v1/quizzes/lesson/${lessonId}/attempts`
    );
    return data.data;
  },

  /** GET /v1/quizzes/attempts/:attemptId — detailed single attempt */
  getAttemptDetail: async (attemptId: string): Promise<AttemptResult> => {
    const { data } = await apiClient.get<ApiSuccessResponse<AttemptResult>>(
      `/v1/quizzes/attempts/${attemptId}`
    );
    return data.data;
  },
};
