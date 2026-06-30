const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

let pendingRefresh: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newAccess: string = data.access_token;
    const newRefresh: string | undefined = data.refresh_token;
    localStorage.setItem("access_token", newAccess);
    if (newRefresh) localStorage.setItem("refresh_token", newRefresh);
    return newAccess;
  } catch {
    return null;
  }
}

/**
 * Drop-in replacement for fetch() that automatically refreshes the access token
 * on a 401 response and retries the request once. Falls back to returning the
 * original 401 Response if refresh fails (caller should treat it as logged-out).
 */
export async function fetchWithAuth(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("access_token");
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers });
  if (res.status !== 401) return res;

  // Deduplicate concurrent 401s — only one refresh flight at a time.
  if (!pendingRefresh) {
    pendingRefresh = tryRefresh().finally(() => {
      pendingRefresh = null;
    });
  }
  const newToken = await pendingRefresh;
  if (!newToken) return res; // refresh failed → caller sees 401

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set("Authorization", `Bearer ${newToken}`);
  return fetch(url, { ...init, headers: retryHeaders });
}
