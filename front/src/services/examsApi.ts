import { api } from './api';

export interface WritingPrompt {
  id: string;
  title: string;
  prompt: string;
  time_limit_minutes: number;
}

export interface WritingResult {
  overall_score: number;
  criteria: Array<{ name: string; score: number; label: string }>;
  corrections: Array<{ original: string; corrected: string; explanation: string }>;
}

export interface ListeningExam {
  id: string;
  title: string;
  audio_url: string;
  questions: Array<{ id: string; text: string; options: string[] }>;
}

export interface ListeningQuestionResult {
  question_index: number;
  correct: boolean;
  correct_answer_index: number;
  explanation: string;
}

export interface ListeningResult {
  score: number;
  results: ListeningQuestionResult[];
}

export const examsApi = api.injectEndpoints({
  endpoints: (b) => ({
    getWritingPrompt: b.query<WritingPrompt, void>({
      query: () => '/exams/writing/prompt',
      transformResponse: (response: any) => ({
        id: response.exam_id,
        title: "Writing Assessment Topic",
        prompt: response.prompt_text,
        time_limit_minutes: response.suggested_time_minutes || 45,
      }),
    }),
    submitWritingExam: b.mutation<WritingResult, { exam_id: string; submitted_text: string }>({
      query: (body) => ({
        url: '/exams/writing/submit',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => {
        const scores = response.scores || {};
        const getLabel = (score: number) => {
          if (score >= 90) return "Excellent";
          if (score >= 80) return "Proficient";
          if (score >= 70) return "Good";
          if (score >= 50) return "Adequate";
          return "Needs Work";
        };
        
        // Parse feedback_text markdown
        const corrections: Array<{ original: string; corrected: string; explanation: string }> = [];
        const feedbackText = response.feedback_text || "";
        
        // Match: - [CRITERION] Issue: ... \n  Recommendation: ... \n  Corrected Example: "..."
        const regex = /-\s*\[(.*?)\]\s*Issue:\s*(.*?)\n\s*Recommendation:\s*(.*?)\n\s*Corrected Example:\s*"(.*?)"/gi;
        let match;
        while ((match = regex.exec(feedbackText)) !== null) {
          const [, criterion, issue, recommendation, corrected] = match;
          corrections.push({
            original: `[${criterion}] ${issue}`,
            corrected: corrected,
            explanation: recommendation
          });
        }

        if (corrections.length === 0 && feedbackText) {
          corrections.push({
            original: "AI Feedback Summary",
            corrected: "Check detailed report",
            explanation: feedbackText
          });
        }

        return {
          overall_score: response.overall_score || 0,
          criteria: [
            { name: "Grammar", score: scores.grammar || 0, label: getLabel(scores.grammar || 0) },
            { name: "Vocabulary", score: scores.vocabulary || 0, label: getLabel(scores.vocabulary || 0) },
            { name: "Cohesion", score: scores.cohesion || 0, label: getLabel(scores.cohesion || 0) },
            { name: "Naturalness", score: scores.naturalness || 0, label: getLabel(scores.naturalness || 0) },
            { name: "Style", score: scores.style || 0, label: getLabel(scores.style || 0) },
          ],
          corrections,
        };
      }
    }),
    getListeningExam: b.query<ListeningExam, string>({
      query: (id) => `/exams/listening/${id}/audio`,
      transformResponse: (response: any) => ({
        id: response.id,
        title: `Listening Comprehension · ${response.level}`,
        audio_url: response.audio_url || "",
        questions: (response.questions || []).map((q: any, index: number) => ({
          id: String(index),
          text: q.question_text,
          options: q.options,
        })),
      }),
    }),
    submitListeningExam: b.mutation<ListeningResult, { id: string; answers: Record<number, number> }>({
      query: ({ id, answers }) => ({
        url: `/exams/listening/${id}/submit`,
        method: 'POST',
        body: { answers },
      }),
    }),
    getListeningTranscript: b.query<{ transcript: string }, string>({
      query: (id) => `/exams/listening/${id}/transcript`,
      transformResponse: (response: any) => ({
        transcript: response.script_text,
      }),
    }),
    getAvailableListeningExams: b.query<PaginatedListeningExamAvailableResponse, { language_id: string; level: string }>({
      query: ({ language_id, level }) => `/exams/listening/available?language_id=${language_id}&level=${level}`,
    }),
    getWritingHistory: b.query<PaginatedWritingExamHistoryResponse, { page?: number; per_page?: number } | void>({
      query: (params) => {
        const page = params?.page ?? 1;
        const per_page = params?.per_page ?? 10;
        return `/exams/writing/history?page=${page}&per_page=${per_page}`;
      },
    }),
  }),
  overrideExisting: false,
});

export interface ListeningExamAvailableItem {
  exam_id: string;
  level: string;
  scenario_type: string | null;
  question_count: number;
}

export interface PaginatedListeningExamAvailableResponse {
  items: ListeningExamAvailableItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface WritingExamHistoryItem {
  exam_id: string;
  prompt_snippet: string;
  overall_score: number | null;
  created_at: string;
}

export interface PaginatedWritingExamHistoryResponse {
  items: WritingExamHistoryItem[];
  total: number;
  page: number;
  per_page: number;
}

export const {
  useGetWritingPromptQuery,
  useSubmitWritingExamMutation,
  useGetListeningExamQuery,
  useSubmitListeningExamMutation,
  useGetListeningTranscriptQuery,
  useGetAvailableListeningExamsQuery,
  useGetWritingHistoryQuery,
} = examsApi;
