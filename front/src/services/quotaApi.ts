import { api } from './api';

export interface QuotaItem {
  function_name: string;
  daily_limit: number;
  current_usage: number;
  remaining: number;
  reset_at: string;
}

export interface QuotaStatus {
  quotas: QuotaItem[];
}

export const quotaApi = api.injectEndpoints({
  endpoints: (b) => ({
    getQuotaStatus: b.query<QuotaStatus, void>({
      query: () => '/quota/status',
      providesTags: ['Profile'],
      keepUnusedDataFor: 60,
    }),
  }),
  overrideExisting: false,
});

export const { useGetQuotaStatusQuery } = quotaApi;
