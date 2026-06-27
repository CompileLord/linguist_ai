import { api } from './api';

export interface TutorSessionResponse {
  id: string;
  user_id: string;
  title: string;
  topic_context?: Record<string, any> | null;
  active_lesson_id?: string | null;
  started_at: string;
  ended_at?: string | null;
  is_active: boolean;
  message_count: number;
}

export interface TutorMessageResponse {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface TutorSessionCreate {
  title: string;
  active_lesson_id?: string;
  topic_context?: Record<string, any>;
}

export const tutorApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTutorSessions: builder.query<TutorSessionResponse[], { skip?: number; limit?: number; include_ended?: boolean }>({
      query: (params) => ({
        url: '/tutor/sessions',
        params,
      }),
      providesTags: ['Profile'],
    }),
    getActiveTutorSession: builder.query<TutorSessionResponse | null, void>({
      query: () => '/tutor/sessions/active',
      providesTags: ['Profile'],
    }),
    createTutorSession: builder.mutation<TutorSessionResponse, TutorSessionCreate>({
      query: (body) => ({
        url: '/tutor/sessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
    endTutorSession: builder.mutation<TutorSessionResponse, string>({
      query: (sessionId) => ({
        url: `/tutor/sessions/${sessionId}/end`,
        method: 'POST',
      }),
      invalidatesTags: ['Profile'],
    }),
    getTutorMessages: builder.query<
      TutorMessageResponse[],
      { sessionId: string; limit?: number; offset?: number; order?: 'asc' | 'desc' }
    >({
      query: ({ sessionId, ...params }) => ({
        url: `/tutor/sessions/${sessionId}/messages`,
        params,
      }),
      providesTags: (result, error, arg) => [{ type: 'Profile', id: arg.sessionId }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetTutorSessionsQuery,
  useGetActiveTutorSessionQuery,
  useCreateTutorSessionMutation,
  useEndTutorSessionMutation,
  useGetTutorMessagesQuery,
  useLazyGetTutorMessagesQuery,
} = tutorApi;
