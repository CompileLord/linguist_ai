import { api } from "./api";

export interface ProfileResponse {
  user_id: string;
  target_language_code: string;
  native_language_code: string;
  current_level: string | null;
  placement_score: number | null;
  daily_goal_minutes: number;
  streak_count: number;
  total_xp: number;
  onboarding_completed: boolean;
}

export interface PlacementQuestion {
  question_text: string;
  options: string[];
  correct_answer_index: number;
  difficulty_level: string;
  explanation: string;
}

export interface PlacementStepResult {
  is_correct: boolean;
  explanation: string;
  next_question: PlacementQuestion | null;
  current_estimate: string;
}

export interface PlacementResult {
  final_level: string;
  score: number;
  questions_answered: number;
  correct_count: number;
  accuracy: number;
  level_description: string;
  recommended_starting_topics: string[];
}

export const onboardingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    setupProfile: builder.mutation<
      ProfileResponse,
      {
        target_language_code: string;
        native_language_code: string;
        daily_goal_minutes?: number;
        goals: string[];
      }
    >({
      query: (body) => ({
        url: "/profile/setup",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),
    updateGoals: builder.mutation<any, string[]>({
      query: (goals) => ({
        url: "/profile/goals",
        method: "PUT",
        body: { goals },
      }),
      invalidatesTags: ["Profile"],
    }),
    startPlacementTest: builder.mutation<PlacementQuestion, void>({
      query: () => ({
        url: "/profile/placement/start",
        method: "POST",
      }),
    }),
    answerPlacementQuestion: builder.mutation<
      PlacementStepResult,
      { answer_index: number }
    >({
      query: (body) => ({
        url: "/profile/placement/answer",
        method: "POST",
        body,
      }),
    }),
    getPlacementResult: builder.query<PlacementResult, void>({
      query: () => "/profile/placement/result",
    }),
  }),
});

export const {
  useSetupProfileMutation,
  useUpdateGoalsMutation,
  useStartPlacementTestMutation,
  useAnswerPlacementQuestionMutation,
  useGetPlacementResultQuery,
} = onboardingApi;
