import { api } from './api';

export interface Mission {
  id: string;
  title: string;
  description: string;
  icon: string;
  cefr_level: string;
  is_locked: boolean;
}

export interface MissionSession {
  session_id: string;
  attempt_id: string;
}

export interface MissionFeedback {
  score: number;
  xp_earned: number;
  what_went_well: string[];
  corrections: Array<{ original: string; suggestion: string }>;
}

export const missionsApi = api.injectEndpoints({
  endpoints: (b) => ({
    getMissions: b.query<Mission[], void>({
      query: () => '/missions',
    }),
    startMission: b.mutation<MissionSession, string>({
      query: (id) => ({
        url: `/missions/${id}/start`,
        method: 'POST',
      }),
    }),
    completeMission: b.mutation<MissionFeedback, { id: string; attempt_id: string }>({
      query: ({ id, attempt_id }) => ({
        url: `/missions/${id}/complete`,
        method: 'POST',
        body: { attempt_id },
      }),
      transformResponse: (response: any) => {
        let feedbackObj: any = {};
        try {
          if (response.feedback) {
            feedbackObj = JSON.parse(response.feedback);
          }
        } catch (e) {
          console.error("Failed to parse feedback string:", e);
        }

        const corrections: Array<{ original: string; suggestion: string }> = [];
        
        // Map weaknesses
        if (Array.isArray(feedbackObj.weaknesses)) {
          feedbackObj.weaknesses.forEach((w: string) => {
            const parts = w.split("->");
            if (parts.length > 1) {
              corrections.push({ original: parts[0].trim(), suggestion: parts[1].trim() });
            } else {
              corrections.push({ original: "Phrase correction", suggestion: w.trim() });
            }
          });
        } else if (typeof feedbackObj.weaknesses === "string" && feedbackObj.weaknesses) {
          corrections.push({ original: "Weakness suggestion", suggestion: feedbackObj.weaknesses });
        }

        // Map improvement suggestions
        if (Array.isArray(feedbackObj.improvement_suggestions)) {
          feedbackObj.improvement_suggestions.forEach((s: string) => {
            const parts = s.split("->");
            if (parts.length > 1) {
              corrections.push({ original: parts[0].trim(), suggestion: parts[1].trim() });
            } else {
              corrections.push({ original: "Alternative phrasing", suggestion: s.trim() });
            }
          });
        }

        const what_went_well = Array.isArray(feedbackObj.strengths)
          ? feedbackObj.strengths
          : (feedbackObj.summary ? [feedbackObj.summary] : ["Communicative goal achieved!"]);

        return {
          score: response.score !== null ? response.score : (feedbackObj.score || 0),
          xp_earned: 100, // XP is credited on backend, show 100 on client
          what_went_well,
          corrections,
        };
      }
    }),
  }),
  overrideExisting: false,
});

export const { useGetMissionsQuery, useStartMissionMutation, useCompleteMissionMutation } = missionsApi;
