/* ------------------------------------------------------------------ */
/*  Local-storage–backed display/appearance settings                   */
/*                                                                      */
/*  Shared by components/common/settings-view.tsx (where they're set)  */
/*  and anything that needs to actually apply one (sidebar-collapse    */
/*  default, compact table rows, ...). SSR-safe: loadSettings() always */
/*  returns DEFAULT_SETTINGS on the server, so callers should read the */
/*  real value in a useEffect after mount, not during initial render,  */
/*  to avoid a hydration mismatch.                                     */
/* ------------------------------------------------------------------ */

export type ThemeMode = "light" | "dark" | "system";

export interface UserSettings {
  theme: ThemeMode;
  // TA-119: "In-app notifications" moved to a real per-user server
  // preference (User.in_app_notifications_enabled via GET/PATCH
  // /auth/me) since the backend has to know it, not just the browser --
  // no longer stored here. "Email notifications" was removed entirely:
  // this backend has no email-sending code at all, so there was
  // nothing for that toggle to control.
  compactRows: boolean;
  sidebarCollapsed: boolean;
}

export const SETTINGS_KEY = "verity-user-settings";

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "light",
  compactRows: false,
  sidebarCollapsed: false,
};

export function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: UserSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}
