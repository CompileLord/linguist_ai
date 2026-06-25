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
      query: () => '/review/stats',
      providesTags: ['Profile'],
      keepUnusedDataFor: 300,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetReviewStatsQuery,
} = reviewApi;

