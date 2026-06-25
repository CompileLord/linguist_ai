import { api } from './api';

export interface DailyCountResponse {
  date: string;
  count: number;
}

export interface ReviewStatsResponse {
  total_due_today: number;
  completed_today: number;
  streak_days: number;
  daily_counts: DailyCountResponse[];
  mastery_distribution: Record<string, number>;
}

export const reviewApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getReviewStats: builder.query<ReviewStatsResponse, void>({
      /*
       * MOCK API FALLBACK:
       * Endpoint: GET /review/stats
       *
       * How to replace with real backend:
       * 1. Ensure the backend implements GET /review/stats returning ReviewStatsResponse.
       * 2. Remove this queryFn completely and replace it with:
       *    query: () => '/review/stats'
       */
      async queryFn(_arg, _queryApi, _extraOptions, fetchWithBQ) {
        const result = await fetchWithBQ('/review/stats');
        if (result.error && result.error.status === 404) {
          return {
            data: {
              total_due_today: 52, // Mocked fallback
              completed_today: 10,
              streak_days: 7,
              daily_counts: [],
              mastery_distribution: {}
            }
          };
        }
        return result.data 
          ? { data: result.data as ReviewStatsResponse } 
          : { error: result.error as import('@reduxjs/toolkit/query').FetchBaseQueryError };
      },
      providesTags: ['Profile'],
      keepUnusedDataFor: 300,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetReviewStatsQuery,
} = reviewApi;
