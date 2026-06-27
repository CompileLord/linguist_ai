import { api } from './api';

export type ErrorCategory = 'grammar' | 'vocabulary';

export interface UserError {
  id: string;
  user_id: string;
  category: ErrorCategory;
  error_text: string;
  correct_text: string;
  explanation: string;
  related_lesson_id?: string | null;
  occurrence_count: number;
  last_occurred_at: string;
  created_at: string;
  updated_at: string;
}

export interface ErrorSummary {
  total_errors: number;
  grammar_errors: number;
  vocabulary_errors: number;
  most_common_error_text?: string | null;
}

export interface PaginatedUserErrors {
  items: UserError[];
  total: number;
  page: number;
  per_page: number;
}

export const errorsApi = api.injectEndpoints({
  endpoints: (b) => ({
    getErrors: b.query<PaginatedUserErrors, { category?: ErrorCategory; sort_by?: 'recent' | 'frequent'; page?: number; per_page?: number }>({
      query: (params) => ({ url: '/errors', params }),
      providesTags: ['Profile'],
    }),
    getFrequentErrors: b.query<UserError[], { min_count?: number; limit?: number }>({
      query: (params) => ({ url: '/errors/frequent', params }),
      providesTags: ['Profile'],
    }),
    getErrorSummary: b.query<ErrorSummary, void>({
      query: () => '/errors/summary',
      providesTags: ['Profile'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetErrorsQuery, useGetFrequentErrorsQuery, useGetErrorSummaryQuery } = errorsApi;
