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
      /*
       * MOCK API FALLBACK:
       * Endpoint: GET /gamification/stats
       *
       * How to replace with real backend:
       * 1. Ensure the backend implements GET /gamification/stats returning GamificationStats.
       * 2. Remove this queryFn completely and replace it with:
       *    query: () => '/gamification/stats'
       */
      async queryFn(_arg, _queryApi, _extraOptions, fetchWithBQ) {
        // Try to fetch from real API first
        const result = await fetchWithBQ('/gamification/stats');
        if (result.error && result.error.status === 404) {
          // Mock data fallback if endpoint doesn't exist
          return {
            data: {
              total_xp: 1250,
              current_game_level: 4,
              current_streak: 7,
            }
          };
        }
        return result.data 
          ? { data: result.data as GamificationStats } 
          : { error: result.error as import('@reduxjs/toolkit/query').FetchBaseQueryError };
      },
      providesTags: ['Profile'],
      keepUnusedDataFor: 300,
    }),
    
    getRecentActivity: builder.query<Achievement[], void>({
      /*
       * MOCK API FALLBACK:
       * Endpoint: GET /dashboard/activity
       *
       * How to replace with real backend:
       * 1. Ensure the backend implements GET /dashboard/activity returning Achievement[].
       * 2. Remove this queryFn completely and replace it with:
       *    query: () => '/dashboard/activity'
       */
      async queryFn(_arg, _queryApi, _extraOptions, fetchWithBQ) {
        const result = await fetchWithBQ('/dashboard/activity');
        if (result.error && result.error.status === 404) {
          return {
            data: [
              { id: '1', title: 'Conversation Practice', subtitle: 'Restaurant Scenario', icon: 'chat_bubble', xp: '+150 XP' },
              { id: '2', title: 'Vocabulary Quiz', subtitle: 'Food & Drink', icon: 'quiz', xp: '+80 XP' },
              { id: '3', title: 'Listening Comprehension', subtitle: 'News Broadcast Excerpt', icon: 'hearing', xp: '+120 XP' }
            ]
          };
        }
        return result.data ? { data: result.data as Achievement[] } : { error: result.error as import('@reduxjs/toolkit/query').FetchBaseQueryError };
      },
      providesTags: ['Profile'],
      keepUnusedDataFor: 300,
    }),

    getNextLesson: builder.query<NextLesson, void>({
      /*
       * MOCK API FALLBACK:
       * Endpoint: GET /dashboard/next-lesson
       *
       * How to replace with real backend:
       * 1. Ensure the backend implements GET /dashboard/next-lesson returning NextLesson.
       * 2. Remove this queryFn completely and replace it with:
       *    query: () => '/dashboard/next-lesson'
       */
      async queryFn(_arg, _queryApi, _extraOptions, fetchWithBQ) {
        const result = await fetchWithBQ('/dashboard/next-lesson');
        if (result.error && result.error.status === 404) {
          return {
            data: {
              id: 'lesson_123',
              topic: 'Past Tense Mastery',
              moduleName: 'Module 4: Irregular Verbs in Narrative',
              progressPercent: 65,
              isReady: true,
            }
          };
        }
        return result.data ? { data: result.data as NextLesson } : { error: result.error as import('@reduxjs/toolkit/query').FetchBaseQueryError };
      },
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
