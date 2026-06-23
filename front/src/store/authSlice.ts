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
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    setUiLanguage: (state, action: PayloadAction<'en' | 'ru' | 'tg'>) => {
      if (state.user) {
        state.user.ui_language = action.payload;
      }
    },
  },
});

export const { setCredentials, logout, setUiLanguage } = authSlice.actions;

export default authSlice.reducer;
