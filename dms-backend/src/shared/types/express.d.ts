import { Types } from 'mongoose';

/**
 * Augment Express Request with our authenticated user payload.
 * After JWT middleware runs, `req.user` is guaranteed to be populated.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * JWT payload structure embedded in every access token.
 */
export interface AuthPayload {
  userId: string;
  role: UserRole;
  /** Null only for super_admin, who is not scoped to a single branch. */
  branchId: string | null;
  iat?: number;
  exp?: number;
}

/**
 * System roles — discriminator for access control.
 */
export type UserRole = 'convert' | 'admin' | 'mentor' | 'super_admin';

/**
 * Standard paginated query parameters (after Zod parsing).
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sort: string;
}

/**
 * Standard API success response envelope.
 */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/**
 * Pagination metadata included in list responses.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standard API error response envelope.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * MongoDB document base fields (present on all documents).
 */
export interface BaseDocument {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
