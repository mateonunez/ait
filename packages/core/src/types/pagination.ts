export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  counts: Record<string, number>;
}

export function buildPaginatedResponse<T>(data: T[], params: PaginationParams, total: number): PaginatedResponse<T> {
  const page = params.page || 1;
  const limit = params.limit || 50;
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function getPaginationOffset(params: PaginationParams): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = params.page || 1;
  const limit = params.limit || 50;
  return { page, limit, offset: (page - 1) * limit };
}
