import { api } from './api';

export interface VoiceItem {
  id: string;
  name: string;
}

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    getMe: builder.query<any, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    getVoices: builder.query<VoiceItem[], void>({
      query: () => '/auth/voices',
    }),
    refresh: builder.mutation<{ access_token: string; refresh_token: string; token_type: string; user: any }, { refresh_token: string }>({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useGetMeQuery,
  useGetVoicesQuery,
  useRefreshMutation,
} = authApi;

