import { api } from './api';

export interface LessonExample {
  source_text: string;
  translation: string;
  context?: string;
  difficulty?: string;
}

export interface LessonVocabulary {
  word: string;
  translation: string;
  pronunciation?: string;
  part_of_speech?: string;
  example_sentence?: string;
  audio_url?: string;
}

export interface LessonExercise {
  type: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  hints?: string[];
}

export interface LessonTestQuestion {
  question: string;
  options: string[];
  correct_index: number;
  points?: number;
}

export interface SpeakingTask {
  prompt: string;
  expected_response_keywords?: string[];
  difficulty?: string;
  duration_seconds?: number;
}

export interface ReadingText {
  title: string;
  content: string;
  comprehension_questions?: string[];
}

export interface ListeningScriptQuestion {
  question: string;
  options: string[];
  correct_index: number;
}

export interface ListeningScript {
  script_text: string;
  questions: ListeningScriptQuestion[];
  audio_url?: string;
}

export interface LessonContent {
  theory: {
    title: string;
    explanation: string;
    key_points: string[];
    grammar_notes?: string;
  };
  examples: LessonExample[];
  vocabulary: LessonVocabulary[];
  exercises: LessonExercise[];
  test: LessonTestQuestion[];
  speaking_task?: SpeakingTask;
  reading_text?: ReadingText;
  listening_script?: ListeningScript;
}

export interface LessonResponse {
  id: string;
  language_id: string;
  cefr_level: string;
  topic: string;
  title: string;
  content: LessonContent;
  audio_urls?: {
    theory?: string;
  };
}

export interface LessonCompletionRequest {
  exercise_answers: string[];
  test_answers: number[];
  time_spent_seconds: number;
}

export interface LessonCompletionResponse {
  score: number;
  xp_earned: number;
  exercises_correct: number;
  exercises_total: number;
  accuracy: number;
  level_up: boolean;
}

export interface LessonSummaryResponse {
  id: string;
  lesson_id: string;
  title: string;
  topic: string;
  status: string;
  score: number | null;
  xp_earned: number;
  completed_at: string | null;
}

export const lessonApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getLessonById: builder.query<LessonResponse, string>({
      query: (lessonId) => `/lessons/${lessonId}`,
      providesTags: (result, error, arg) => [{ type: 'Profile', id: arg }],
    }),
    completeLesson: builder.mutation<
      LessonCompletionResponse,
      { lessonId: string; body: LessonCompletionRequest }
    >({
      query: ({ lessonId, body }) => ({
        url: `/lessons/${lessonId}/complete`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
    getLessonsHistory: builder.query<LessonSummaryResponse[], { limit?: number; offset?: number } | void>({
      query: (params) => {
        const limit = params?.limit ?? 10;
        const offset = params?.offset ?? 0;
        return `/lessons/history?limit=${limit}&offset=${offset}`;
      },
    }),
    getNextLesson: builder.query<LessonResponse, void>({
      query: () => '/lessons/next',
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetLessonByIdQuery,
  useCompleteLessonMutation,
  useGetLessonsHistoryQuery,
  useGetNextLessonQuery,
} = lessonApi;
