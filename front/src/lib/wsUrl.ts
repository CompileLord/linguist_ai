/**
 * Returns the WebSocket origin (e.g. "wss://host" or "ws://localhost:8000").
 *
 * The socket MUST hit the same backend that issued the auth token. If the HTTP
 * API and the WebSocket point at different hosts, the token minted by one server
 * is rejected by the other and every socket closes with 4001. To make that
 * impossible, we derive the WS origin from NEXT_PUBLIC_API_URL unless an explicit
 * NEXT_PUBLIC_WS_URL override is provided.
 */
export function getWsBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const api = process.env.NEXT_PUBLIC_API_URL;
  if (api) {
    try {
      const u = new URL(api);
      const proto = u.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${u.host}`;
    } catch {
      /* malformed URL — fall through to runtime/default */
    }
  }

  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.hostname}:8000`;
  }
  return "ws://localhost:8000";
}
