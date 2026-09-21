"use client";

import * as React from "react";
import {
  ClipboardList,
  ClipboardCheck,
  BarChart2,
  History,
  Settings,
  PanelLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerityLogo, VerityMark } from "@/components/ui/verity-logo";

export type OfficerView = "review_queue" | "my_reviews" | "metrics" | "audit_log" | "settings";

interface OfficerSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  activeView?: OfficerView;
  onSelectView?: (view: OfficerView) => void;
  userName?: string | null;
}

export function OfficerSidebar({
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  activeView = "review_queue",
  onSelectView,
  userName,
}: OfficerSidebarProps) {
  const navItems: {
    id: OfficerView;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { strokeWidth?: number }>;
  }[] = [
    {
      id: "review_queue",
      label: "Review Queue",
      icon: ClipboardList,
    },
    {
      id: "my_reviews",
      label: "My Reviews",
      icon: ClipboardCheck,
    },
    {
      id: "metrics",
      label: "Metrics",
      icon: BarChart2,
    },
    {
      id: "audit_log",
      label: "Audit Log",
      icon: History,
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-4 select-none font-inter">
      {/* Top Header Section */}
      <div>
        {/* Brand Bar */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          {!isCollapsed ? (
            <button
              type="button"
              onClick={() => onSelectView?.("review_queue")}
              title="Go to Review Queue"
              className="min-w-0 flex-1 pr-2 flex items-center text-left cursor-pointer hover:opacity-85 transition-opacity bg-transparent border-none p-0"
            >
              <VerityLogo
                size={36}
                markClassName="text-[#1e4c77]"
                wordmarkClassName="text-slate-900 dark:text-white text-[21px] font-extrabold tracking-[0.16em] leading-none font-inter"
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectView?.("review_queue")}
              title="Go to Review Queue"
              className="w-full flex flex-col items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity bg-transparent border-none p-0"
            >
              <VerityMark size={32} className="text-[#1e4c77]" />
            </button>
          )}

          {/* Collapse toggle */}
          {!isCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse sidebar (Ctrl+B)"
              aria-label="Collapse sidebar"
              className="h-9 w-9 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5"
            >
              <PanelLeft className="h-5 w-5 stroke-[1.8]" />
            </button>
          ) : null}

          {/* Close Mobile Drawer */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden h-8 w-8 rounded-lg text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Collapsed expand button */}
        {isCollapsed && (
          <div className="pt-2 pb-2 flex justify-center border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar (Ctrl+B)"
              aria-label="Expand sidebar"
              className="h-9 w-9 rounded-xl text-slate-500 dark:text-slate-400 hover:text-[#1e4c77] hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 flex items-center justify-center transition-all cursor-pointer"
            >
              <PanelLeft className="h-5 w-5 stroke-[1.8]" />
            </button>
          </div>
        )}

        {/* Workspace Navigation Group */}
        <div className="mt-5">
          {!isCollapsed && (
            <p className="px-2.5 text-xs text-slate-500 dark:text-slate-300 font-normal font-inter mb-1.5 tracking-normal">
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
                  onClick={() => {
                    onSelectView?.(item.id);
                    onCloseMobile();
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "group w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] transition-all duration-150 cursor-pointer text-left font-inter",
                    isActive
                      ? "bg-[#1e4c77] text-white shadow-xs font-medium"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/90 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-normal",
                    isCollapsed && "justify-center px-0 py-2.5"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-105",
                      isActive ? "text-white" : "text-[#1e4c77]"
                    )}
                    strokeWidth={1.8}
                  />
                  {!isCollapsed && (
                    <span className="truncate tracking-normal font-inter">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Footer — Officer Profile */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
        <div
          className={cn(
            "flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/90 dark:border-slate-800",
            isCollapsed && "justify-center p-1.5 bg-transparent border-transparent"
          )}
        >
          {/* Avatar and Name — derived from authenticated user */}
          {(() => {
            const displayName = userName || "Officer";
            const parts = displayName.trim().split(/\s+/);
            const initials =
              parts.length >= 2
                ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                : parts[0].slice(0, 2).toUpperCase();

            return (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-[#1e4c77] text-white font-medium text-[11px] flex items-center justify-center shrink-0 shadow-xs font-inter">
                  {initials}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <span className="text-[13px] font-normal text-slate-800 dark:text-slate-200 truncate block font-inter">
                      {displayName}
                    </span>
                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-300 truncate block font-inter">
                      Compliance Officer
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Settings icon — opens Settings view */}
          <button
            type="button"
            onClick={() => {
              onSelectView?.("settings");
              onCloseMobile();
            }}
            title="Settings"
            aria-label="Settings"
            className={cn(
              "h-7 w-7 rounded-lg text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 flex items-center justify-center transition-colors cursor-pointer shrink-0",
              activeView === "settings" && "text-[#1e4c77] dark:text-[#7fb2e3] bg-slate-200/60 dark:bg-slate-700/60",
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
          "hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out shrink-0 h-screen sticky top-0 z-20",
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
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl border-r border-slate-200 dark:border-slate-800 z-10 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
