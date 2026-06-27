import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  username: string;
  ui_language: 'en' | 'ru' | 'tg';
  current_level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string; refreshToken?: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      state.isAuthenticated = true;
      state.isInitialized = true;
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", action.payload.token);
        if (action.payload.refreshToken) {
          localStorage.setItem("refresh_token", action.payload.refreshToken);
        }
        if (action.payload.user?.ui_language) {
          localStorage.setItem("ui_language", action.payload.user.ui_language);
        }
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
    },
    setUiLanguage: (state, action: PayloadAction<'en' | 'ru' | 'tg'>) => {
      if (state.user) {
        state.user.ui_language = action.payload;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("ui_language", action.payload);
      }
    },
    setInitialized: (state) => {
      state.isInitialized = true;
    },
  },
});

export const { setCredentials, logout, setUiLanguage, setInitialized } = authSlice.actions;

export default authSlice.reducer;
