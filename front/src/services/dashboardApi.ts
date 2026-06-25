import { api } from './api';

export interface GamificationStats {
  total_xp: number;
  current_game_level: number;
  current_streak: number;
}

export interface Achievement {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  xp: string;
}

export interface NextLesson {
  id: string;
  topic: string;
  moduleName: string;
  progressPercent: number;
  isReady: boolean;
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
      transformResponse: (response: any[]) => response.map((ach) => ({
        id: ach.achievement_id,
        title: ach.title,
        subtitle: ach.description,
        icon: 'workspace_premium',
        xp: '+100 XP',
      })),
      providesTags: ['Profile'],
      keepUnusedDataFor: 300,
    }),

    getNextLesson: builder.query<NextLesson, void>({
      query: () => '/lessons/next',
      transformResponse: (response: any) => ({
        id: response.id,
        topic: response.topic,
        moduleName: `Level ${response.cefr_level} - ${response.title || response.topic}`,
        progressPercent: 0,
        isReady: true,
      }),
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

