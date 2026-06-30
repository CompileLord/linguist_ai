/**
 * Extracts a human-readable message from an RTK Query / fetch error.
 *
 * The backend returns errors as `{ "error": { "code", "message", "details" } }`,
 * but some endpoints (and FastAPI defaults) use `{ "detail": ... }`. This walks
 * the known shapes and always returns a string, so the UI never shows raw JSON.
 */
export function getApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const e = err as {
    data?: {
      error?: { message?: string } | string;
      detail?: unknown;
      message?: string;
    };
    error?: string;
    message?: string;
  };

  const data = e?.data;
  const candidates: unknown[] = [
    typeof data?.error === "object" ? data?.error?.message : data?.error,
    data?.detail,
    data?.message,
    e?.error,
    e?.message,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return fallback;
}
