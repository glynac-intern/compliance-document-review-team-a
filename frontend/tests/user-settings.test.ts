import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  loadSettings,
  saveSettings,
  applyTheme,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
} from "@/lib/user-settings";

describe("user-settings module", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const localStorageMock = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };

    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", {
      matchMedia: vi.fn((query: string) => ({
        matches: query.includes("dark"),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns DEFAULT_SETTINGS when localStorage has no entry", () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.theme).toBe("light");
    expect(settings.compactRows).toBe(false);
  });

  it("merges stored settings with DEFAULT_SETTINGS for partial payloads", () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme: "dark" }));
    const settings = loadSettings();
    expect(settings.theme).toBe("dark");
    expect(settings.compactRows).toBe(false);
    expect(settings.sidebarCollapsed).toBe(false);
  });

  it("falls back to DEFAULT_SETTINGS when localStorage contains invalid JSON", () => {
    localStorage.setItem(SETTINGS_KEY, "{ broken json ... ");
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("saveSettings serializes settings correctly", () => {
    saveSettings({
      theme: "dark",
      compactRows: true,
      sidebarCollapsed: true,
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      SETTINGS_KEY,
      JSON.stringify({
        theme: "dark",
        compactRows: true,
        sidebarCollapsed: true,
      })
    );
  });

  it("applyTheme modifies document.documentElement classes", () => {
    const classList = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    vi.stubGlobal("document", {
      documentElement: { classList },
    });

    applyTheme("dark");
    expect(classList.add).toHaveBeenCalledWith("dark");

    applyTheme("light");
    expect(classList.remove).toHaveBeenCalledWith("dark");
  });
});
