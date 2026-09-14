/**
 * TA-61: Single typed API client wrapping the backend.
 *
 * - Attaches the session token to every authenticated request.
 * - A 401 from ANY call drops the session and redirects to /login --
 *   handled centrally here, not something every caller has to remember.
 * - Base URL comes from configuration (NEXT_PUBLIC_API_BASE_URL), never
 *   a hardcoded string.
 *
 * Scope note: this ticket builds the CLIENT INFRASTRUCTURE (the
 * generic authenticated-fetch wrapper, session handling, the 401
 * behavior) plus the concrete auth methods needed for login. Per-
 * resource typed methods (documents, reviews, notifications, etc.)
 * are added incrementally as each screen is wired to the real
 * backend -- not all built here, to keep this ticket's scope honest
 * and reviewable rather than guessing at every screen's exact needs
 * up front.
 */

// A missing env var falls back to localhost ONLY in development --
// convenient for a teammate who hasn't set up .env.local yet. In
// production, a misconfigured deployment must still fail loudly
// (TA-61's original intent) rather than silently point at the wrong
// backend with no warning.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : undefined);

if (!API_BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL is not set. Copy .env.example to .env.local and set it."
  );
}

const SESSION_STORAGE_KEY = "verity_session_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null; // SSR guard
  return window.localStorage.getItem(SESSION_STORAGE_KEY);
}

export function storeToken(token: string): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Called by the API client whenever a 401 is received. Set once by
 * the auth context on mount, so this module doesn't need to import
 * React/Next router directly (keeps this a plain, testable module).
 */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  isFormData?: boolean;
  skipAuth?: boolean; // for login/signup, which have no token yet
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, isFormData = false, skipAuth = false } = options;

  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    // A 401 on an UNauthenticated call (login/signup) means bad
    // credentials, not an expired session -- there was no session to
    // begin with. Only trigger the session-expired/redirect behavior
    // for calls that actually HAD a token attached (skipAuth=false).
    // Caught via TA-62: a wrong-password login was silently showing
    // "Session expired" instead of the real "Invalid email or password".
    if (!skipAuth) {
      clearStoredToken();
      if (onUnauthorized) onUnauthorized();
      throw new ApiError(401, "Session expired. Please log in again.");
    }
    // Fall through to the generic error handling below, which reads
    // the REAL backend message (e.g. "Invalid email or password").
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const errorBody = await response.json();
      if (errorBody?.detail) {
        detail = typeof errorBody.detail === "string"
          ? errorBody.detail
          : JSON.stringify(errorBody.detail);
      }
    } catch {
      // response body wasn't JSON -- keep the generic message
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// --- Types matching the backend's actual response shapes ---

export type UserRole = "advisor" | "officer";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// --- Auth endpoints ---

export const authApi = {
  login: (email: string, password: string): Promise<TokenResponse> =>
    apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      skipAuth: true,
    }),

  signup: (name: string, email: string, password: string, role: UserRole): Promise<UserResponse> =>
    apiFetch<UserResponse>("/auth/signup", {
      method: "POST",
      body: { name, email, password, role },
      skipAuth: true,
    }),

  getMe: (): Promise<UserResponse> => apiFetch<UserResponse>("/auth/me"),

  logout: (): Promise<{ detail: string }> =>
    apiFetch<{ detail: string }>("/auth/logout", {
      method: "POST",
    }),
};

/**
 * TA-67: fetches a file's raw bytes as a Blob, for rendering a
 * protected document in an <iframe> (blob URLs, not the raw
 * Authorization-requiring endpoint URL directly -- browsers can't
 * attach custom headers to a plain iframe src). Reuses the same
 * auth-header and 401 handling as apiFetch, just returns a Blob
 * instead of parsed JSON.
 */
async function fetchFileBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });

  if (response.status === 401) {
    clearStoredToken();
    if (onUnauthorized) onUnauthorized();
    throw new ApiError(401, "Session expired. Please log in again.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, `Failed to load file (${response.status})`);
  }

  return response.blob();
}

export { apiFetch, fetchFileBlob, API_BASE_URL };
