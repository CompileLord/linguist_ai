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
  icon?: string;
  icon_color?: string;
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
    getLatestCoachReport: b.query<CoachReport, void>({ query: () => '/coach/reports/latest' }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllBadgesQuery,
  useGetUserBadgesQuery,
  useGetCoachReportsQuery,
  useGetLatestCoachReportQuery,
} = progressApi;
