import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store/store';
import { logout, setCredentials } from '../store/authSlice';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    let token = (getState() as RootState).auth.token;
    if (!token && typeof window !== "undefined") {
      token = localStorage.getItem("access_token");
    }
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

let pendingRefresh: Promise<any> | null = null;

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
    if (refreshToken) {
      // Deduplicate: all concurrent 401s share one refresh call
      if (!pendingRefresh) {
        pendingRefresh = Promise.resolve(
          baseQuery(
            { url: '/auth/refresh', method: 'POST', body: { refresh_token: refreshToken } },
            api,
            extraOptions
          )
        ).finally(() => { pendingRefresh = null; });
      }
      const refreshResult = await pendingRefresh;
      if (refreshResult.data) {
        const data = refreshResult.data as any;
        const state = api.getState() as RootState;
        api.dispatch(setCredentials({
          token: data.access_token,
          refreshToken: data.refresh_token,
          user: state.auth.user ?? {
            id: data.user?.id ?? '',
            username: data.user?.full_name ?? data.user?.email ?? 'User',
            ui_language: (state.auth.user as any)?.ui_language ?? 'en',
          },
        }));
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logout());
      }
    } else {
      api.dispatch(logout());
    }
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Profile'],
  endpoints: () => ({}),
});
