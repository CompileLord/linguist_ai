import { api } from './api';
import { VocabularyItem } from './vocabularyApi';

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

export interface SpacedRepetitionItemResponse {
  id: string;
  user_id: string;
  item_type: 'vocab' | 'grammar';
  item_id: string;
  learned_at: string;
  last_reviewed_at?: string;
  next_review_at: string;
  interval_days: number;
  repetition_number: number;
  ease_factor: number;
  mastery_percent: number;
  detail?: VocabularyItem;
}

export const reviewApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getReviewStats: builder.query<ReviewStatsResponse, void>({
      query: () => '/review/stats',
      providesTags: ['Profile'],
      keepUnusedDataFor: 300,
    }),
    getReviewQueue: builder.query<SpacedRepetitionItemResponse[], { item_type?: 'vocab' | 'grammar'; batch_size?: number }>({
      query: (params) => ({
        url: '/review/queue',
        params,
      }),
      providesTags: ['Profile'],
    }),
    respondToReviewItem: builder.mutation<
      SpacedRepetitionItemResponse,
      { itemId: string; quality: number }
    >({
      query: ({ itemId, quality }) => ({
        url: `/review/${itemId}/respond`,
        method: 'POST',
        body: { quality },
      }),
      invalidatesTags: ['Profile'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetReviewStatsQuery,
  useGetReviewQueueQuery,
  useRespondToReviewItemMutation,
} = reviewApi;
