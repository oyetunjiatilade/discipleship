// ──────────────────────────────────────────────
// Standard API response envelope
// Mirrors: src/shared/utils/response.ts
// ──────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Mirrors: src/shared/types/express.d.ts → PaginationMeta
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
