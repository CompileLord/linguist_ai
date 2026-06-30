"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setCredentials, setUiLanguage, setInitialized, logout } from "@/store/authSlice";
import { useGetMeQuery } from "@/services/authApi";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      const uiLanguage = localStorage.getItem("ui_language") as "en" | "ru" | "tg" | null;
      
      if (token) {
        // Optimistically set the token so the initial requests have it
        dispatch(
          setCredentials({
            token,
            user: { id: "", username: "User", ui_language: uiLanguage || "en" },
          })
        );
      } else {
        // Mark initialization as finished if no token exists
        dispatch(setInitialized());
      }
      if (uiLanguage) {
        dispatch(setUiLanguage(uiLanguage));
      }
    }
  }, [dispatch]);

  // Fetch /me to get actual user details if we have a token
  // skip the query if there is no token in localStorage
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("access_token");
  const { data: user, error } = useGetMeQuery(undefined, { skip: !hasToken });

  useEffect(() => {
    if (user && hasToken) {
      const token = localStorage.getItem("access_token");
      const uiLanguage = localStorage.getItem("ui_language") as "en" | "ru" | "tg" | null;
      if (token) {
        dispatch(
          setCredentials({
            token,
            user: {
              id: user.id,
              username: user.full_name || user.email.split("@")[0],
              ui_language: uiLanguage || "en",
            },
          })
        );
      }
    }
  }, [user, dispatch, hasToken]);

  // If the stored token is rejected (e.g. the user no longer exists, or it was
  // issued by a different backend), drop it so the app falls back to login
  // instead of staying optimistically "authenticated" with a dead token.
  useEffect(() => {
    if (!error || !hasToken) return;
    const status = (error as { status?: number | string }).status;
    if (status === 401 || status === 403 || status === 404) {
      dispatch(logout());
    }
    dispatch(setInitialized());
  }, [error, hasToken, dispatch]);

  return <>{children}</>;
}
