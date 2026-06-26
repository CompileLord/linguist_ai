import { api } from './api';

export interface GamificationStats {
  total_xp: number;
  current_game_level: number;
  current_streak: number;
}

export interface Achievement {
  achievement_id: string;
  code: string;
  title: string;
  description: string;
  unlocked_at: string;
}

export interface NextLesson {
  id: string;
  topic: string;
  cefr_level: string;
  title: string;
}



export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getGamificationStats: builder.query<GamificationStats, void>({
      query: () => '/gamification/stats',
      providesTags: ['Profile'],
      keepUnusedDataFor: 300,
    }),
    
    getRecentActivity: builder.query<Achievement[], void>({
      query: () => '/achievements/recent',
      providesTags: ['Profile'],
      keepUnusedDataFor: 300,
    }),

    getNextLesson: builder.query<NextLesson, void>({
      query: () => '/lessons/next',
      providesTags: ['Profile'],
      keepUnusedDataFor: 300,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGamificationStatsQuery,
  useGetRecentActivityQuery,
  useGetNextLessonQuery,
} = dashboardApi;

