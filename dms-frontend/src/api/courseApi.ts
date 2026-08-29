import apiClient from './client';
import type { ApiSuccessResponse } from '@/types/api';
import type { Course, Lesson, CourseWithProgress } from '@/types/models';

/**
 * Course API — convert-facing read-only endpoints.
 *
 * Routes:  GET /v1/course
 *          GET /v1/course/lessons
 *          GET /v1/course/lessons/:lessonId
 */
export const courseApi = {
  /** GET /v1/course — returns raw Mongoose doc (has _id + id virtual) */
  getCourse: async (): Promise<Course> => {
    const { data } = await apiClient.get<ApiSuccessResponse<Course>>('/v1/course');
    return data.data;
  },

  /** GET /v1/course/lessons — published lessons (optionally for a specific course) */
  getLessons: async (courseId?: string): Promise<Lesson[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<Lesson[]>>('/v1/course/lessons', {
      params: courseId ? { courseId } : {},
    });
    return data.data;
  },

  /** GET /v1/courses — all active courses with the convert's progress */
  getCourses: async (): Promise<CourseWithProgress[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ courses: CourseWithProgress[] }>>(
      '/v1/courses'
    );
    return data.data.courses;
  },

  /** GET /v1/course/lessons/:lessonId — single published lesson */
  getLesson: async (lessonId: string): Promise<Lesson> => {
    const { data } = await apiClient.get<ApiSuccessResponse<Lesson>>(
      `/v1/course/lessons/${lessonId}`
    );
    return data.data;
  },

  // ── Admin course management ──
  adminListCourses: async (): Promise<Course[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ courses: Course[] }>>(
      '/v1/admin/courses'
    );
    return data.data.courses;
  },
  createCourse: async (payload: { title: string; description: string }): Promise<Course> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ course: Course }>>(
      '/v1/admin/courses',
      payload
    );
    return data.data.course;
  },
  updateCourse: async (
    courseId: string,
    payload: { title?: string; description?: string; isActive?: boolean }
  ): Promise<Course> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<{ course: Course }>>(
      `/v1/admin/courses/${courseId}`,
      payload
    );
    return data.data.course;
  },
};
