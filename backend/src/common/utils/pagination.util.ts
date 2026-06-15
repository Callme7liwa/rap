import { PaginationMeta } from '../interfaces/paginated-response.interface';

export function getPagination(page = 1, limit = 20) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
  };
}
