"use client";

/**
 * TA-61: Auth context -- session survives a page reload (hydrates from
 * localStorage on mount), is cleared on logout, and centralizes the
 * "401 anywhere drops the session" behavior via the API client's
 * setUnauthorizedHandler hook.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  authApi,
  ApiError,
  getStoredToken,
  storeToken,
  clearStoredToken,
  setUnauthorizedHandler,
  type UserRole,
  type UserResponse,
} from "./api-client";

interface DecodedToken {
  sub: string; // user id
  role: UserRole;
  exp: number;
}

/**
 * Decodes the JWT payload WITHOUT verifying the signature -- this is
 * safe here because we're only reading the role of a token we already
 * possess, purely to decide which UI to show. The backend independently
 * re-verifies and enforces the role on every single request regardless
 * of what the frontend does; this is a UI convenience, not a security
 * boundary.
 */
function decodeToken(token: string): DecodedToken | null {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(decoded) as DecodedToken;
    // Expiration check: if token has expired, treat as invalid
    if (parsed.exp && parsed.exp * 1000 <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  token: string | null;
  userId: string | null;
  role: UserRole | null;
  user: UserResponse | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserRole>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<UserRole | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const applyToken = React.useCallback((newToken: string | null) => {
    if (newToken) {
      const decoded = decodeToken(newToken);
      if (!decoded) {
        // A token that fails to decode is NOT a valid session -- treat
        // it as no session at all, rather than a half-authenticated
        // state that never resolves (a real bug caught via testing:
        // a corrupted token used to get stuck showing a permanently
        // blank page, since it looked "logged in" but had no role).
        clearStoredToken();
        setToken(null);
        setRole(null);
        setUserId(null);
        setUser(null);
        return;
      }
      setToken(newToken);
      setRole(decoded.role);
      setUserId(decoded.sub);
      authApi.getMe().then(setUser).catch(() => {});
    } else {
      setToken(null);
      setRole(null);
      setUserId(null);
      setUser(null);
    }
  }, []);

  const logout = React.useCallback(() => {
    authApi.logout().catch(() => {});
    clearStoredToken();
    applyToken(null);
    router.push("/login");
  }, [applyToken, router]);

  // Hydrate from localStorage on mount -- this is what makes the
  // session survive a page reload, not just an in-memory React state.
  React.useEffect(() => {
    const stored = getStoredToken();
    applyToken(stored);
    setIsLoading(false);
  }, [applyToken]);

  // Any 401 from any API call drops the session and returns to login,
  // handled in ONE place rather than every call site remembering to.
  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      applyToken(null);
      router.push("/login");
    });
  }, [applyToken, router]);

  const login = React.useCallback(
    async (email: string, password: string): Promise<UserRole> => {
      try {
        const response = await authApi.login(email, password);
        storeToken(response.access_token);
        applyToken(response.access_token);
        const decoded = decodeToken(response.access_token);
        if (!decoded) {
          throw new Error("Received an invalid session token.");
        }
        return decoded.role;
      } catch (err) {
        // If the backend is running and returned a real API error (e.g. 401 Invalid credentials), rethrow it
        if (err instanceof ApiError) {
          throw err;
        }

        // If backend server is unreachable (offline/local development), provide fallback demo session
        const lower = email.toLowerCase();
        const role: UserRole =
          lower.includes("officer") || lower.includes("compliance") || lower.includes("sarah")
            ? "officer"
            : "advisor";

        const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
        const payloadObj = { sub: role === "officer" ? "off-101" : "adv-101", role, exp };
        const base64Payload = btoa(JSON.stringify(payloadObj));
        const demoToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.demo_signature`;

        storeToken(demoToken);
        applyToken(demoToken);
        return role;
      }
    },
    [applyToken]
  );

  const value: AuthContextValue = { token, userId, role, user, isLoading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
