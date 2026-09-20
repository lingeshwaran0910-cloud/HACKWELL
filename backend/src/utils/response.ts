export interface SingleResponse<T> {
  success: true;
  data: T;
}

export interface CollectionMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CollectionResponse<T> {
  success: true;
  data: T[];
  meta: CollectionMeta;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function formatSingle<T>(data: T): SingleResponse<T> {
  return {
    success: true,
    data,
  };
}

export function formatCollection<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): CollectionResponse<T> {
  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
