import { Types } from 'mongoose';

/**
 * Generic service result for operations that may fail with domain errors.
 * Forces callers to handle both success and failure paths.
 */
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/**
 * Utility type to represent a MongoDB ObjectId or its string form.
 */
export type ObjectIdLike = Types.ObjectId | string;

/**
 * Sorting direction for queries.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Generic query filter builder input.
 */
export interface QueryFilter {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  [key: string]: unknown;
}
