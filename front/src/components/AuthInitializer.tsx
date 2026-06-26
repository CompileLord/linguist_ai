"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setCredentials, setUiLanguage } from "@/store/authSlice";
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
      }
      if (uiLanguage) {
        dispatch(setUiLanguage(uiLanguage));
      }
    }
  }, [dispatch]);

  // Fetch /me to get actual user details if we have a token
  // skip the query if there is no token in localStorage
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("access_token");
  const { data: user } = useGetMeQuery(undefined, { skip: !hasToken });

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

  return <>{children}</>;
}
