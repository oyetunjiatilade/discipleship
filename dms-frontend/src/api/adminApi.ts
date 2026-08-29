import apiClient from './client';
import type { ApiSuccessResponse, PaginationMeta } from '@/types/api';
import type {
  AdminLesson,
  ConvertReportRow,
  DashboardStats,
  DiscipleshipStats,
  StageSummary,
  Notification,
  Course,
  QuizAdminView,
} from '@/types/models';
import type { DiscipleshipStage } from '@/constants/enums';
import type { ConvertStageInfo, FollowUpRow } from '@/types/care';

// ──────────────────────────────────────────────
// REQUEST TYPES — exact match of backend validation
// ──────────────────────────────────────────────

export interface ConvertReportFilters {
  stage?: DiscipleshipStage;
  search?: string;
  salvationDateFrom?: string; // YYYY-MM-DD
  salvationDateTo?: string;   // YYYY-MM-DD
  gender?: 'male' | 'female';
  isHolySpiritFilled?: boolean;
  /** Only meaningful for a super_admin caller — ignored for a plain admin. */
  branchId?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface CreateLessonPayload {
  courseId?: string;
  title: string;
  description: string;
  sortOrder: number;
  videoUrl: string;
  videoPublicId: string;
  notesUrl: string;
  notesPublicId: string;
  estimatedMinutes?: number;
  memoryVerse?: string | null;
  actionStep?: string | null;
  transcript?: string | null;
  notesMarkdown?: string | null;
  isPublished?: boolean;
}

export interface UpdateLessonPayload {
  title?: string;
  description?: string;
  videoUrl?: string;
  videoPublicId?: string;
  notesUrl?: string;
  notesPublicId?: string;
  estimatedMinutes?: number | null;
  memoryVerse?: string | null;
  actionStep?: string | null;
  transcript?: string | null;
  notesMarkdown?: string | null;
  isPublished?: boolean;
}

export interface ReorderItem {
  lessonId: string;
  sortOrder: number;
}

export interface SendNotificationPayload {
  convertId: string;
  title: string;
  message: string;
}

export interface BroadcastPayload {
  title: string;
  message: string;
  stage?: DiscipleshipStage;
}

export interface AdminCreateConvertPayload {
  firstName: string;
  lastName: string;
  phone: string;
  gender?: 'male' | 'female';
  invitedBy?: string;
  /** Only meaningful for a super_admin caller — ignored for a plain admin. */
  branchId?: string;
}

// ── Quiz Admin Types ──

export interface QuestionInput {
  questionText: string;
  options: { label: string; text: string }[];
  correctLabel: string;
  sortOrder: number;
}

export interface CreateQuizPayload {
  lessonId: string;
  title: string;
  description?: string;
  questions: QuestionInput[];
  passingScore?: number;
  maxAttempts?: number;
}

export interface UpdateQuizPayload {
  title?: string;
  description?: string;
  questions?: QuestionInput[];
  passingScore?: number;
  maxAttempts?: number;
  isActive?: boolean;
}

// ──────────────────────────────────────────────
// RESPONSE TYPES — exact match of backend shapes
// ──────────────────────────────────────────────

interface ConvertReportData {
  converts: ConvertReportRow[];
  summary: {
    totalConverts: number;
    stageBreakdown: StageSummary[];
    averageCompletion: number;
  };
}

// ──────────────────────────────────────────────
// ADMIN API
// ──────────────────────────────────────────────

export const adminApi = {
  // ── Reports ──

  /** GET /v1/admin/reports/dashboard */
  getDashboardStats: async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<ApiSuccessResponse<DashboardStats>>(
      '/v1/admin/reports/dashboard'
    );
    return data.data;
  },

  /** GET /v1/admin/reports/discipleship — funnel counts + rates */
  getDiscipleshipStats: async (): Promise<DiscipleshipStats> => {
    const { data } = await apiClient.get<ApiSuccessResponse<DiscipleshipStats>>(
      '/v1/admin/reports/discipleship'
    );
    return data.data;
  },

  /** POST /v1/admin/reports/converts/:convertId/contact — log a call */
  logContact: async (convertId: string, note?: string): Promise<{ lastContactedAt: string }> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ lastContactedAt: string }>>(
      `/v1/admin/reports/converts/${convertId}/contact`,
      { note }
    );
    return data.data;
  },

  /** GET /v1/admin/reports/converts — paginated with filters */
  getConvertReport: async (
    filters: ConvertReportFilters = {}
  ): Promise<{ data: ConvertReportData; meta: PaginationMeta }> => {
    const params: Record<string, string> = {};
    if (filters.stage) params.stage = filters.stage;
    if (filters.search) params.search = filters.search;
    if (filters.salvationDateFrom) params.salvationDateFrom = filters.salvationDateFrom;
    if (filters.salvationDateTo) params.salvationDateTo = filters.salvationDateTo;
    if (filters.gender) params.gender = filters.gender;
    if (filters.isHolySpiritFilled !== undefined)
      params.isHolySpiritFilled = String(filters.isHolySpiritFilled);
    if (filters.branchId) params.branchId = filters.branchId;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);
    if (filters.sort) params.sort = filters.sort;

    const { data } = await apiClient.get<ApiSuccessResponse<ConvertReportData>>(
      '/v1/admin/reports/converts',
      { params }
    );
    return { data: data.data, meta: data.meta! };
  },

  /** GET /v1/admin/reports/converts/csv — triggers file download */
  downloadCsv: async (filters: Omit<ConvertReportFilters, 'page' | 'limit' | 'sort'> = {}): Promise<void> => {
    const params: Record<string, string> = {};
    if (filters.stage) params.stage = filters.stage;
    if (filters.search) params.search = filters.search;
    if (filters.salvationDateFrom) params.salvationDateFrom = filters.salvationDateFrom;
    if (filters.salvationDateTo) params.salvationDateTo = filters.salvationDateTo;
    if (filters.gender) params.gender = filters.gender;
    if (filters.isHolySpiritFilled !== undefined)
      params.isHolySpiritFilled = String(filters.isHolySpiritFilled);
    if (filters.branchId) params.branchId = filters.branchId;

    const response = await apiClient.get('/v1/admin/reports/converts/csv', {
      params,
      responseType: 'blob',
    });

    // Extract filename from Content-Disposition header or use default
    const disposition = response.headers['content-disposition'] || '';
    const filenameMatch = disposition.match(/filename="?(.+?)"?$/);
    const filename = filenameMatch?.[1] || `converts-report-${new Date().toISOString().split('T')[0]}.csv`;

    // Trigger browser download
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // ── Lessons (Admin CRUD) ──

  /** GET /v1/admin/lessons — all lessons including unpublished */
  getLessons: async (courseId?: string): Promise<AdminLesson[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<AdminLesson[]>>(
      '/v1/admin/lessons',
      { params: courseId ? { courseId } : {} }
    );
    return data.data;
  },

  /** GET /v1/admin/lessons/:lessonId */
  getLesson: async (lessonId: string): Promise<AdminLesson> => {
    const { data } = await apiClient.get<ApiSuccessResponse<AdminLesson>>(
      `/v1/admin/lessons/${lessonId}`
    );
    return data.data;
  },

  /** POST /v1/admin/lessons — create lesson (returns 201) */
  createLesson: async (payload: CreateLessonPayload): Promise<AdminLesson> => {
    const { data } = await apiClient.post<ApiSuccessResponse<AdminLesson>>(
      '/v1/admin/lessons',
      payload
    );
    return data.data;
  },

  /** PATCH /v1/admin/lessons/:lessonId */
  updateLesson: async (
    lessonId: string,
    payload: UpdateLessonPayload
  ): Promise<AdminLesson> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<AdminLesson>>(
      `/v1/admin/lessons/${lessonId}`,
      payload
    );
    return data.data;
  },

  /** DELETE /v1/admin/lessons/:lessonId — 204 No Content */
  deleteLesson: async (lessonId: string): Promise<void> => {
    await apiClient.delete(`/v1/admin/lessons/${lessonId}`);
  },

  /** PATCH /v1/admin/lessons/reorder */
  reorderLessons: async (lessons: ReorderItem[], courseId?: string): Promise<void> => {
    await apiClient.patch('/v1/admin/lessons/reorder', { lessons, courseId });
  },

  /** PATCH /v1/admin/lessons/course — update course metadata */
  updateCourse: async (payload: { title?: string; description?: string }): Promise<Course> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<Course>>(
      '/v1/admin/lessons/course',
      payload
    );
    return data.data;
  },

  // ── Notifications (Admin) ──

  /** POST /v1/admin/notifications/send */
  sendNotification: async (payload: SendNotificationPayload): Promise<Notification> => {
    const { data } = await apiClient.post<ApiSuccessResponse<Notification>>(
      '/v1/admin/notifications/send',
      payload
    );
    return data.data;
  },

  /** POST /v1/admin/notifications/broadcast */
  broadcast: async (
    payload: BroadcastPayload
  ): Promise<{ sent: number; message: string }> => {
    const { data } = await apiClient.post<
      ApiSuccessResponse<{ sent: number; message: string }>
    >('/v1/admin/notifications/broadcast', payload);
    return data.data;
  },

  // ── Convert Management ──

  /** POST /v1/admin/reports/converts — create convert (bypass OTP) */
  createConvert: async (payload: AdminCreateConvertPayload): Promise<ConvertReportRow> => {
    const { data } = await apiClient.post<ApiSuccessResponse<ConvertReportRow>>(
      '/v1/admin/reports/converts',
      payload
    );
    return data.data;
  },

  /** PATCH /v1/admin/converts/:convertId/branch — move a convert to another branch (super_admin only) */
  changeConvertBranch: async (convertId: string, branchId: string): Promise<void> => {
    await apiClient.patch(`/v1/admin/converts/${convertId}/branch`, { branchId });
  },

  // ── Quiz Admin CRUD ──

  // ── File Upload ──

  /** POST /v1/admin/upload/video — upload video file to Cloudinary */
  uploadVideo: async (file: File, onProgress?: (pct: number) => void): Promise<{ url: string; publicId: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<ApiSuccessResponse<{ url: string; publicId: string }>>(
      '/v1/admin/upload/video',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      }
    );
    return data.data;
  },

  /** POST /v1/admin/upload/notes-file — upload PDF to Cloudinary */
  uploadNotesFile: async (file: File, onProgress?: (pct: number) => void): Promise<{ url: string; publicId: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<ApiSuccessResponse<{ url: string; publicId: string }>>(
      '/v1/admin/upload/notes-file',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      }
    );
    return data.data;
  },

  /** POST /v1/admin/upload/notes-text — convert text to PDF and upload */
  uploadNotesText: async (title: string, content: string): Promise<{ url: string; publicId: string }> => {
    const { data } = await apiClient.post<ApiSuccessResponse<{ url: string; publicId: string }>>(
      '/v1/admin/upload/notes-text',
      { title, content }
    );
    return data.data;
  },

  // ── Quiz Admin CRUD ──

  /** GET /v1/admin/quizzes — list all quizzes */
  getQuizzes: async (): Promise<QuizAdminView[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<QuizAdminView[]>>(
      '/v1/admin/quizzes'
    );
    return data.data;
  },

  /** GET /v1/admin/quizzes/lesson/:lessonId — get quiz for lesson */
  getQuizForLesson: async (lessonId: string): Promise<QuizAdminView | null> => {
    try {
      const { data } = await apiClient.get<ApiSuccessResponse<QuizAdminView>>(
        `/v1/admin/quizzes/lesson/${lessonId}`
      );
      return data.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  /** POST /v1/admin/quizzes — create quiz */
  createQuiz: async (payload: CreateQuizPayload): Promise<QuizAdminView> => {
    const { data } = await apiClient.post<ApiSuccessResponse<QuizAdminView>>(
      '/v1/admin/quizzes',
      payload
    );
    return data.data;
  },

  /** PATCH /v1/admin/quizzes/:quizId — update quiz */
  updateQuiz: async (
    quizId: string,
    payload: UpdateQuizPayload
  ): Promise<QuizAdminView> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<QuizAdminView>>(
      `/v1/admin/quizzes/${quizId}`,
      payload
    );
    return data.data;
  },

  /** DELETE /v1/admin/quizzes/:quizId — 204 No Content */
  deleteQuiz: async (quizId: string): Promise<void> => {
    await apiClient.delete(`/v1/admin/quizzes/${quizId}`);
  },

  // ── Stage management ──

  /** GET /v1/admin/converts/:convertId/stage */
  getConvertStage: async (convertId: string): Promise<ConvertStageInfo> => {
    const { data } = await apiClient.get<ApiSuccessResponse<ConvertStageInfo>>(
      `/v1/admin/converts/${convertId}/stage`
    );
    return data.data;
  },

  /** POST /v1/admin/converts/:convertId/stage/transition */
  transitionStage: async (
    convertId: string,
    targetStage: DiscipleshipStage,
    reason?: string
  ): Promise<void> => {
    await apiClient.post(`/v1/admin/converts/${convertId}/stage/transition`, {
      targetStage,
      reason,
    });
  },

  /** POST /v1/admin/converts/:convertId/holy-spirit */
  setHolySpirit: async (
    convertId: string,
    filled: boolean
  ): Promise<{ isHolySpiritFilled: boolean; stageChanged: boolean }> => {
    const { data } = await apiClient.post<
      ApiSuccessResponse<{ isHolySpiritFilled: boolean; stageChanged: boolean }>
    >(`/v1/admin/converts/${convertId}/holy-spirit`, { filled });
    return data.data;
  },

  // ── Follow-up (pastoral care) ──

  /** GET /v1/admin/reports/follow-up */
  getFollowUp: async (
    opts: { days?: number; limit?: number } = {}
  ): Promise<FollowUpRow[]> => {
    const params: Record<string, string> = {};
    if (opts.days !== undefined) params.days = String(opts.days);
    if (opts.limit !== undefined) params.limit = String(opts.limit);
    const { data } = await apiClient.get<
      ApiSuccessResponse<{ followUp: FollowUpRow[]; total: number }>
    >('/v1/admin/reports/follow-up', { params });
    return data.data.followUp;
  },
};
