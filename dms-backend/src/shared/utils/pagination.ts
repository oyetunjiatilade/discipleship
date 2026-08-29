import { PaginationMeta } from '../types/express.d';

/**
 * Default pagination values.
 */
const DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
  SORT: '-createdAt',
} as const;

/**
 * Parsed pagination parameters ready for Mongoose queries.
 */
export interface ParsedPagination {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
  page: number;
}

/**
 * Parse raw query string parameters into Mongoose-ready pagination config.
 *
 * @example
 *   const { skip, limit, sort } = parsePagination({ page: '2', limit: '10', sort: '-name' });
 *   const results = await Model.find(filter).sort(sort).skip(skip).limit(limit);
 */
export function parsePagination(query: {
  page?: string | number;
  limit?: string | number;
  sort?: string;
}): ParsedPagination {
  const page = Math.max(1, Number(query.page) || DEFAULTS.PAGE);
  const limit = Math.min(
    DEFAULTS.MAX_LIMIT,
    Math.max(1, Number(query.limit) || DEFAULTS.LIMIT)
  );
  const skip = (page - 1) * limit;

  const sortField = query.sort || DEFAULTS.SORT;
  const sort: Record<string, 1 | -1> = {};
  const fields = sortField.split(',');

  for (const field of fields) {
    const trimmed = field.trim();
    if (trimmed.startsWith('-')) {
      sort[trimmed.slice(1)] = -1;
    } else {
      sort[trimmed] = 1;
    }
  }

  return { skip, limit, sort, page };
}

/**
 * Build pagination metadata for the response envelope.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
