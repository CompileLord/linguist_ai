/**
 * Clears persisted auth credentials. Call this when a request/socket is rejected
 * because the token is invalid (e.g. the user no longer exists in the DB), so the
 * app can fall back to the login flow instead of retrying a doomed token.
 */
export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}
