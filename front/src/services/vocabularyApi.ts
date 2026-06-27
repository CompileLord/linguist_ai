import { api } from './api';

export interface VocabularyItem {
  id: string;
  language_id: string;
  word: string;
  translation_context: Record<string, string>; // e.g. {"ru": "привет", "en": "hello", "tg": "салом"}
  transcription?: string;
  audio_url?: string;
  cefr_level: string;
  frequency_rank?: number;
  created_at: string;
  updated_at: string;
}

export interface UserVocabularyItem {
  id: string;
  user_id: string;
  vocabulary_id: string;
  is_known: boolean;
  repetitions_count: number;
  errors_count: number;
  last_reviewed_at?: string;
  created_at: string;
  vocabulary?: VocabularyItem;
}

export interface PaginatedVocabularyResponse {
  items: VocabularyItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface PaginatedUserVocabularyResponse {
  items: UserVocabularyItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface VocabularySearchParams {
  language_id: string;
  cefr_level?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface UserVocabularySearchParams {
  is_known?: boolean;
  sort_by?: 'last_reviewed_at' | 'errors_count' | 'repetitions_count';
  page?: number;
  per_page?: number;
}

export interface AddWordRequest {
  language_id: string;
  word: string;
  translation_context: Record<string, string>;
  cefr_level: string;
}

export const vocabularyApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getVocabularyList: builder.query<PaginatedVocabularyResponse, VocabularySearchParams>({
      query: (params) => ({
        url: '/vocabulary',
        params,
      }),
      providesTags: ['Profile'],
    }),
    getUserVocabulary: builder.query<PaginatedUserVocabularyResponse, UserVocabularySearchParams>({
      query: (params) => ({
        url: '/vocabulary/user',
        params,
      }),
      providesTags: ['Profile'],
    }),
    addUserWord: builder.mutation<UserVocabularyItem, AddWordRequest>({
      query: (body) => ({
        url: '/vocabulary',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
    reviewUserWord: builder.mutation<
      UserVocabularyItem,
      { vocabularyId: string; quality: number; responseTimeMs?: number }
    >({
      query: ({ vocabularyId, quality, responseTimeMs }) => ({
        url: `/vocabulary/${vocabularyId}/review`,
        method: 'POST',
        body: { quality, response_time_ms: responseTimeMs },
      }),
      invalidatesTags: ['Profile'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetVocabularyListQuery,
  useGetUserVocabularyQuery,
  useAddUserWordMutation,
  useReviewUserWordMutation,
} = vocabularyApi;
