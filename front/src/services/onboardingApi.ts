import { api } from './api';

export const onboardingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    updateGoals: builder.mutation({
      // TODO: MOCK - Replace with actual backend integration
      queryFn: async (goals: string[]) => {
        console.log('Mock update goals:', goals);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { data: { status: 'success', goals } };
      },
      invalidatesTags: ['Profile'],
    }),
    startPlacementTest: builder.mutation({
      // TODO: MOCK - Replace with actual backend integration
      queryFn: async () => {
        console.log('Mock start placement test');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          data: {
            session_id: 'mock-session-123',
            first_question: {
              id: 'q1',
              text: 'I _____ to the store yesterday.',
              options: ['go', 'went', 'gone', 'going'],
            },
          },
        };
      },
    }),
    answerPlacementQuestion: builder.mutation<any, any>({
      // TODO: MOCK - Replace with actual backend integration
      queryFn: async ({ sessionId, questionId, answer }) => {
        console.log('Mock answer placement:', { sessionId, questionId, answer });
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Simulate next question or completion
        if (questionId === 'q1') {
          return {
            data: {
              status: 'in_progress',
              next_question: {
                id: 'q2',
                text: 'She _____ English for five years.',
                options: ['has studying', 'has been studying', 'studies', 'study'],
              },
            },
          };
        } else {
          return {
            data: {
              status: 'completed',
              result: {
                cefr_level: 'B2',
                time_taken: '14:20',
                accuracy: 88,
              },
            },
          };
        }
      },
    }),
  }),
});

export const {
  useUpdateGoalsMutation,
  useStartPlacementTestMutation,
  useAnswerPlacementQuestionMutation,
} = onboardingApi;
