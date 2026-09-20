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
  emailNotifications: boolean;
  inAppNotifications: boolean;
  compactRows: boolean;
  sidebarCollapsed: boolean;
}

export const SETTINGS_KEY = "verity-user-settings";

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "light",
  emailNotifications: true,
  inAppNotifications: true,
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
