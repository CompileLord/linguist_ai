import { api } from './api';

export interface Badge {
  id: string;
  code: string;
  title: string;
  description: string;
  condition_type?: string;
  condition_value?: number;
  is_unlocked?: boolean;
  unlocked_at?: string;
}

export interface CoachReport {
  id: string;
  period_start: string;
  period_end: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
  generated_at?: string;
}

export interface LessonSummary {
  id: string;
  lesson_id: string;
  title: string;
  topic: string;
  status: string;
  score?: number | null;
  xp_earned: number;
  completed_at?: string | null;
}

export const progressApi = api.injectEndpoints({
  endpoints: (b) => ({
    getAllBadges: b.query<Badge[], void>({ query: () => '/achievements/all' }),
    getUserBadges: b.query<Badge[], void>({ query: () => '/achievements/user' }),
    getCoachReports: b.query<CoachReport[], void>({
      query: () => '/coach/reports',
      transformResponse: (response: any): CoachReport[] => {
        const items = response?.items ?? response ?? [];
        return items;
      },
    }),
    getCoachReport: b.query<CoachReport, string>({ query: (id) => `/coach/reports/${id}` }),
    getLatestCoachReport: b.query<CoachReport, void>({ query: () => '/coach/reports/latest' }),
    getLessonsHistory: b.query<LessonSummary[], { limit?: number; offset?: number }>({
      query: (params) => ({ url: '/lessons/history', params }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllBadgesQuery,
  useGetUserBadgesQuery,
  useGetCoachReportsQuery,
  useGetCoachReportQuery,
  useGetLatestCoachReportQuery,
  useGetLessonsHistoryQuery,
} = progressApi;
