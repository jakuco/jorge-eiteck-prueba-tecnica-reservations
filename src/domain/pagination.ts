export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function normalizePagination(params?: PaginationParams): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const page = Math.max(1, params?.page ?? DEFAULT_PAGE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params?.pageSize ?? DEFAULT_PAGE_SIZE),
  );
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}