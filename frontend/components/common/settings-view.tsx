"use client";

import * as React from "react";
import {
  User,
  Palette,
  Bell,
  Monitor,
  LogOut,
  Sun,
  Moon,
  Laptop,
  Pencil,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { authApi, ApiError } from "@/lib/api-client";
import {
  type ThemeMode,
  type UserSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  applyTheme,
} from "@/lib/user-settings";

/* ------------------------------------------------------------------ */
/*  Reusable sub-components                                            */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e4c77]/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
        checked ? "bg-[#1e4c77]" : "bg-slate-200 dark:bg-slate-700"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out",
          checked ? "translate-x-[18px]" : "translate-x-0"
        )}
      />
    </button>
  );
}

function SettingsRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 px-1">
      <p className="text-[13px] font-normal text-slate-800 dark:text-slate-200 font-inter">
        {label}
      </p>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-1">
        <Icon className="h-4 w-4 text-[#1e4c77]" strokeWidth={1.8} />
        <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 font-inter tracking-tight">
          {title}
        </h3>
      </div>
      <div className="px-5 pb-4 divide-y divide-slate-100 dark:divide-slate-800">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Editable Profile Field                                             */
/* ------------------------------------------------------------------ */

function EditableField({
  label,
  value,
  onSave,
  type = "text",
}: {
  label: string;
  value: string;
  onSave: (newValue: string) => Promise<void>;
  type?: "text" | "email";
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync draft when value changes externally
  React.useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  React.useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError(`${label} cannot be empty`);
      return;
    }
    if (trimmed === value) {
      setIsEditing(false);
      setError(null);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-4 py-3 px-1 group">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-inter font-normal mb-0.5">
            {label}
          </p>
          <p className="text-[13px] text-slate-800 dark:text-slate-200 font-inter font-normal truncate">
            {value}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="h-7 w-7 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100"
          aria-label={`Edit ${label}`}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  return (
    <div className="py-3 px-1">
      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-inter font-normal mb-1.5">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="flex-1 h-8 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] font-inter font-normal text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1e4c77] focus:ring-2 focus:ring-[#1e4c77]/15 transition-all disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="h-8 px-3 rounded-lg bg-[#1e4c77] hover:bg-[#163e63] text-white text-[12px] font-inter font-normal transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
          Save
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[12px] font-inter font-normal transition-all cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-red-500 dark:text-red-400 mt-1.5 font-inter">{error}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Settings View                                                 */
/* ------------------------------------------------------------------ */

export function SettingsView() {
  const { user, logout, refreshUser } = useAuth();
  const [settings, setSettings] = React.useState<UserSettings>(DEFAULT_SETTINGS);

  // Hydrate from localStorage on mount and apply current theme
  React.useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    applyTheme(loaded.theme);
  }, []);

  // Listen for OS theme changes when mode is "system"
  React.useEffect(() => {
    if (settings.theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings.theme]);

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      if (key === "theme") applyTheme(value as ThemeMode);
      return next;
    });
  };

  // Profile update handlers — hit the real backend, then refresh global state
  const handleNameSave = async (newName: string) => {
    await authApi.updateMe({ name: newName });
    await refreshUser();
  };

  const handleEmailSave = async (newEmail: string) => {
    await authApi.updateMe({ email: newEmail });
    await refreshUser();
  };

  // TA-119: "In-app notifications" is a real server-side preference
  // (gates whether the backend creates a Notification row for this
  // user at all), not a local/cosmetic setting -- so it's driven by
  // `user`, with an optimistic local override while the round-trip is
  // in flight, reverted on failure.
  const [inAppNotifOverride, setInAppNotifOverride] = React.useState<boolean | null>(null);
  const inAppNotificationsEnabled = inAppNotifOverride ?? user?.in_app_notifications_enabled ?? true;

  const handleInAppNotificationsToggle = async (next: boolean) => {
    setInAppNotifOverride(next);
    try {
      await authApi.updateMe({ in_app_notifications_enabled: next });
      await refreshUser();
    } catch {
      // Silently revert -- consistent with how other notification
      // actions in this app (e.g. top-bar's mark-as-read) fail quiet.
    } finally {
      setInAppNotifOverride(null);
    }
  };

  // Derive user info
  const displayName = user?.name || "User";
  const email = user?.email || "—";
  const role = user?.role || "advisor";
  const nameParts = displayName.trim().split(/\s+/);
  const initials =
    nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : nameParts[0].slice(0, 2).toUpperCase();

  const themeOptions: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Laptop },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-3xl sm:text-4xl font-normal text-slate-800 dark:text-slate-100 tracking-tight font-inter leading-tight">
          Settings
        </h1>
      </div>

      {/* ── Profile ── */}
      <SettingsSection icon={User} title="Profile">
        {/* Avatar + role badge */}
        <div className="flex items-center gap-4 py-4 px-1">
          <div className="h-12 w-12 rounded-full bg-[#1e4c77] text-white font-semibold text-sm flex items-center justify-center shrink-0 shadow-sm font-inter">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100 font-inter truncate">
              {displayName}
            </p>
            <p className="text-[12px] text-slate-400 dark:text-slate-500 font-inter font-normal truncate">
              {email}
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#1e4c77]/8 dark:bg-[#1e4c77]/20 text-[11px] font-medium text-[#1e4c77] dark:text-[#7fb2e3] font-inter capitalize">
              {role}
            </span>
          </div>
        </div>

        {/* Editable fields */}
        <EditableField
          label="Name"
          value={displayName}
          onSave={handleNameSave}
        />
        <EditableField
          label="Email"
          value={email}
          onSave={handleEmailSave}
          type="email"
        />
      </SettingsSection>

      {/* ── Appearance ── */}
      <SettingsSection icon={Palette} title="Appearance">
        <SettingsRow label="Theme">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {themeOptions.map(({ value, label, icon: ThemeIcon }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateSetting("theme", value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-inter font-normal transition-all duration-150 cursor-pointer",
                  settings.theme === value
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-600"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <ThemeIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* ── Notifications ── */}
      <SettingsSection icon={Bell} title="Notifications">
        <SettingsRow label="In-app notifications">
          <Toggle
            checked={inAppNotificationsEnabled}
            onChange={handleInAppNotificationsToggle}
            label="In-app notifications"
          />
        </SettingsRow>
      </SettingsSection>

      {/* ── Display ── */}
      <SettingsSection icon={Monitor} title="Display">
        <SettingsRow label="Compact rows">
          <Toggle
            checked={settings.compactRows}
            onChange={(v) => updateSetting("compactRows", v)}
            label="Compact rows"
          />
        </SettingsRow>
        <SettingsRow label="Collapse sidebar by default">
          <Toggle
            checked={settings.sidebarCollapsed}
            onChange={(v) => updateSetting("sidebarCollapsed", v)}
            label="Collapse sidebar by default"
          />
        </SettingsRow>
      </SettingsSection>

      {/* ── Account ── */}
      <SettingsSection icon={LogOut} title="Account">
        <div className="py-4 px-1">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs font-normal font-inter transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>Sign out</span>
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}
