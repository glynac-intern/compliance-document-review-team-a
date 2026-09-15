"use client";

import * as React from "react";
import {
  Layers2,
  File,
  BarChart2,
  History,
  Settings,
  PanelLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerityLogo, VerityMark } from "@/components/ui/verity-logo";

// Standard document upload icon matching hand-drawn sketch:
// - Filled document body in primary theme color (#1e4c77)
// - Folded corner in accent brand blue (#2575bc)
// - Prominent, thick white (+) add button
function NewSubmissionDocIcon({
  className,
  isActive,
}: {
  className?: string;
  isActive?: boolean;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-105", className)}
      aria-hidden="true"
    >
      {/* Main theme colored document body */}
      <path
        d="M4.5 3C4.5 2.45 4.95 2 5.5 2H14.5L19.5 7V21C19.5 21.55 19.05 22 18.5 22H5.5C4.95 22 4.5 21.55 4.5 21V3Z"
        fill={isActive ? "#ffffff" : "#1e4c77"}
      />
      {/* Crisp folded corner */}
      <path
        d="M14.5 2L19.5 7H14.5V2Z"
        fill={isActive ? "#ebf4fb" : "#2575bc"}
        stroke={isActive ? "#1e4c77" : "#ffffff"}
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      {/* Big, bold, clearly visible white (+) add button */}
      <path
        d="M12 8.5V17.5M7.5 13H16.5"
        stroke={isActive ? "#1e4c77" : "#ffffff"}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNewSubmissionClick?: () => void;
  onHistoryClick?: () => void;
  onActivityHistoryClick?: () => void;
  onMetricsClick?: () => void;
  activeView?: "overview" | "my_submissions" | "new_submission" | "history" | "metrics" | "settings";
  onSelectView?: (view: "overview" | "my_submissions" | "new_submission" | "history" | "metrics" | "settings") => void;
  userName?: string | null;
  onSettingsClick?: () => void;
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onNewSubmissionClick,
  onHistoryClick,
  onActivityHistoryClick,
  onMetricsClick,
  activeView = "overview",
  onSelectView,
  userName,
  onSettingsClick,
}: SidebarProps) {
  const handleHistory = onHistoryClick || onActivityHistoryClick;

  // Single unified navigation list with exact requested order:
  // 1. Overview
  // 2. New submission
  // 3. My submission
  // 4. Metrics
  // 5. History
  const navItems = [
    {
      id: "overview" as const,
      label: "Overview",
      icon: Layers2,
      onClick: () => {
        onSelectView?.("overview");
        onCloseMobile();
      },
    },
    {
      id: "new_submission" as const,
      label: "New Submission",
      icon: NewSubmissionDocIcon,
      isAction: true,
      onClick: () => {
        onSelectView?.("new_submission");
        onNewSubmissionClick?.();
        onCloseMobile();
      },
    },
    {
      id: "my_submissions" as const,
      label: "My Submissions",
      icon: File,
      onClick: () => {
        onSelectView?.("my_submissions");
        onCloseMobile();
      },
    },
    {
      id: "metrics" as const,
      label: "Metrics",
      icon: BarChart2,
      onClick: () => {
        onSelectView?.("metrics");
        onMetricsClick?.();
        onCloseMobile();
      },
    },
    {
      id: "history" as const,
      label: "History",
      icon: History,
      onClick: () => {
        onSelectView?.("history");
        handleHistory?.();
        onCloseMobile();
      },
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-4 select-none font-inter">

      {/* Top Header Section */}
      <div>
        {/* Brand Bar with Bigger Logo & Functional Collapse Button */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          {!isCollapsed ? (
            <div className="min-w-0 flex-1 pr-2 flex items-center">
              <VerityLogo
                size={36}
                markClassName="text-[#1e4c77]"
                wordmarkClassName="text-slate-900 text-[21px] font-extrabold tracking-[0.16em] leading-none font-inter"
              />
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-2">
              <VerityMark size={32} className="text-[#1e4c77]" />
            </div>
          )}

          {/* Interactive and functional collapse button using PanelLeft icon style */}
          {!isCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse sidebar (Ctrl+B)"
              aria-label="Collapse sidebar"
              className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5"
            >
              <PanelLeft className="h-5 w-5 stroke-[1.8]" />
            </button>
          ) : null}

          {/* Close Mobile Drawer */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden h-8 w-8 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* When collapsed: Expand Button at top of icon rail using PanelLeft */}
        {isCollapsed && (
          <div className="pt-2 pb-2 flex justify-center border-b border-slate-100">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar (Ctrl+B)"
              aria-label="Expand sidebar"
              className="h-9 w-9 rounded-xl text-slate-500 hover:text-[#1e4c77] hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
            >
              <PanelLeft className="h-5 w-5 stroke-[1.8]" />
            </button>
          </div>
        )}

        {/* Workspace Navigation Group (Consolidated single list with exact order) */}
        <div className="mt-5">
          {!isCollapsed && (
            <p className="px-2.5 text-xs text-slate-400 font-normal font-inter mb-1.5 tracking-normal">
              Workspace
            </p>
          )}

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "group w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] transition-all duration-150 cursor-pointer text-left font-inter",
                    isActive
                      ? "bg-[#1e4c77] text-white shadow-xs font-medium"
                      : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 font-normal",
                    isCollapsed && "justify-center px-0 py-2.5"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-105",
                      isActive ? "text-white" : "text-[#1e4c77]"
                    )}
                    strokeWidth={1.8}
                    {...(item.id === "new_submission" ? { isActive } : {})}
                  />
                  {!isCollapsed && <span className="truncate tracking-normal font-inter">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* BOTTOM FOOTER */}
      <div className="border-t border-slate-100 pt-3">
        <div
          className={cn(
            "flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100/90",
            isCollapsed && "justify-center p-1.5 bg-transparent border-transparent"
          )}
        >
          {/* Avatar and Name — derived from authenticated user */}
          {(() => {
            const displayName = userName || "User";
            const parts = displayName.trim().split(/\s+/);
            const initials = parts.length >= 2
              ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
              : parts[0].slice(0, 2).toUpperCase();
            const firstName = parts[0];

            return (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-[#1e4c77] text-white font-medium text-[11px] flex items-center justify-center shrink-0 shadow-xs font-inter">
                  {initials}
                </div>
                {!isCollapsed && (
                  <span className="text-[13px] font-normal text-slate-800 truncate font-inter">
                    {firstName}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Setting gear icon — opens Settings view */}
          <button
            type="button"
            onClick={() => {
              onSettingsClick?.();
              onSelectView?.("settings");
            }}
            title="Settings"
            aria-label="Settings"
            className={cn(
              "h-7 w-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer shrink-0",
              isCollapsed && "mt-1"
            )}
          >
            <Settings className="h-4 w-4 stroke-[1.8]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out shrink-0 h-screen sticky top-0 z-20",
          isCollapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl border-r border-slate-200 z-10 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
