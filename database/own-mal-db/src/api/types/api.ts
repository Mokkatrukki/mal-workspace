/**
 * Standardized API response types for v1 API
 */

export type ResponseFormat = 'standard' | 'clean' | 'compact';

export interface ApiMeta {
  format?: ResponseFormat;
  page?: number;
  limit?: number;
  total?: number;
  note?: string;
  [key: string]: any;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: ApiMeta;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;