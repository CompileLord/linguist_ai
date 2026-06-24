import { api } from './api';

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation({
      // TODO: MOCK - Replace with actual backend integration (query: (credentials) => ({ url: '/auth/register', method: 'POST', body: credentials }))
      queryFn: async (credentials) => {
        console.log('Mock register with:', credentials);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { data: { access_token: 'mock-jwt-token', token_type: 'bearer' } };
      },
    }),
    login: builder.mutation({
      // TODO: MOCK - Replace with actual backend integration
      queryFn: async (credentials) => {
        console.log('Mock login with:', credentials);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { data: { access_token: 'mock-jwt-token', token_type: 'bearer' } };
      },
    }),
  }),
});

export const { useRegisterMutation, useLoginMutation } = authApi;
