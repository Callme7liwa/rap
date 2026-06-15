export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<TItem> {
  data: TItem[];
  meta: PaginationMeta;
}
