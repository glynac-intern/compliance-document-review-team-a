"use client";

import * as React from "react";
import {
  RotateCw,
  Bell,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronDown,
  Menu,
  Check,
  Clock,
  AlertCircle,
  PanelLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  breadcrumbs?: { label: string; href?: string }[];
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TopBar({
  breadcrumbs = [
    { label: "workspace", href: "/advisor" },
    { label: "overview" },
  ],
  onToggleSidebar,
  onToggleMobileSidebar,
  onRefresh,
  isRefreshing = false,
}: TopBarProps) {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(2);

  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const calendarRef = React.useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        calendarRef.current &&
        !calendarRef.current.contains(e.target as Node)
      ) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifications = [
    {
      id: "n-1",
      title: "Revision Requested",
      document: "Q1 2026 Alpha Growth Fund Presentation",
      officer: "Sarah Jenkins",
      time: "25m ago",
      type: "warning",
      unread: true,
    },
    {
      id: "n-2",
      title: "Document Approved",
      document: "Fixed Income Yield Advantage Flyer",
      officer: "Sarah Jenkins",
      time: "2h ago",
      type: "success",
      unread: true,
    },
    {
      id: "n-3",
      title: "Review Started",
      document: "Retirement Horizons Newsletter (v2)",
      officer: "Compliance Queue",
      time: "Yesterday",
      type: "info",
      unread: false,
    },
  ];

  const calendarEvents = [
    {
      date: "Mar 15, 2026",
      title: "Q1 Marketing Filing Deadline",
      type: "SEC Reg. Cutoff",
      urgent: true,
    },
    {
      date: "Mar 20, 2026",
      title: "FINRA Rule 2210 Annual Attestation",
      type: "Firm Compliance",
      urgent: false,
    },
  ];

  return (
    // Taller vertically (h-16 = 64px, +8px from previous h-14), providing airy, elevated feel
    <header className="sticky top-0 z-30 h-16 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md flex items-center justify-between px-5 sm:px-8 transition-all font-sans">
      {/* Left: Sidebar Toggle Button + Breadcrumbs */}
      <div className="flex items-center gap-3.5">
        {/* Mobile menu trigger */}
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Open mobile menu"
            className="lg:hidden h-9 w-9 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Breadcrumb Trail matching Image 1: 'Workspace  >  My submissions' */}
        <nav aria-label="Breadcrumbs" className="flex items-center gap-2.5 text-[15px] font-elegant select-none">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {idx > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 stroke-[1.8]" />
                )}
                {isLast ? (
                  <span className="font-medium text-slate-800 tracking-tight">
                    {crumb.label}
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal hover:text-slate-600 transition-colors">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right: Reusable Utility Action Cluster — Bigger buttons with more space between them */}
      <div className="flex items-center gap-3 sm:gap-3.5">
        {/* Refresh Icon Button (Sleek reload transition and theme active state) */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh compliance queue"
          className={cn(
            "h-9.5 w-9.5 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 border",
            isRefreshing
              ? "bg-[#1e4c77] text-white border-[#1e4c77] shadow-xs scale-[0.98]"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-[#1e4c77] active:text-white active:scale-95 border-transparent hover:border-slate-200"
          )}
        >
          <RotateCw
            className={cn(
              "h-4 w-4 stroke-[2.2] transition-transform",
              isRefreshing && "animate-sleek-spin"
            )}
          />
        </button>

        {/* Regulatory Calendar Button */}
        <div className="relative" ref={calendarRef}>
          <button
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            title="Regulatory Calendar & Deadlines"
            className={cn(
              "h-9.5 w-9.5 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border",
              showCalendar
                ? "bg-[#1e4c77] text-white border-[#1e4c77] shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-[#1e4c77] active:text-white active:scale-95 border-transparent hover:border-slate-200"
            )}
          >
            <CalendarIcon className="h-4 w-4 stroke-[2]" />
          </button>

          {/* Calendar Popover */}
          {showCalendar && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-[#2575bc]" />
                  <h3 className="text-[13px] font-bold text-slate-900">
                    Regulatory Deadlines
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Q1 2026
                </span>
              </div>

              <div className="space-y-2.5 pt-2.5">
                {calendarEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-slate-100 bg-[#f8fafc] hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold tracking-wider text-[#1e4c77] uppercase font-roboto">
                        {evt.type}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 font-sans tabular-nums">
                        {evt.date}
                      </span>
                    </div>
                    <p className="text-[12px] font-medium text-slate-900 leading-snug">
                      {evt.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            className={cn(
              "relative h-9.5 w-9.5 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border",
              showNotifications
                ? "bg-[#1e4c77] text-white border-[#1e4c77] shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-[#1e4c77] active:text-white active:scale-95 border-transparent hover:border-slate-200"
            )}
          >
            <Bell className="h-4 w-4 stroke-[2]" />
            {unreadCount > 0 && (
              <span
                className={cn(
                  "absolute top-2 right-2 h-2 w-2 rounded-full transition-colors",
                  showNotifications
                    ? "bg-white ring-2 ring-[#1e4c77]"
                    : "bg-[#1e4c77] ring-2 ring-white"
                )}
              />
            )}
          </button>

          {/* Notifications Popover */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-bold text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-[#2575bc]/10 px-2 py-0.5 text-[10px] font-bold text-[#2575bc]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setUnreadCount(0)}
                    className="text-[11px] font-medium text-[#2575bc] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pt-1">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 px-1 hover:bg-slate-50/80 rounded-lg transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px]",
                          item.type === "warning" && "bg-amber-100 text-amber-800",
                          item.type === "success" && "bg-emerald-100 text-emerald-800",
                          item.type === "info" && "bg-blue-100 text-[#1e4c77]"
                        )}
                      >
                        {item.type === "warning" && <AlertCircle className="h-3 w-3" />}
                        {item.type === "success" && <Check className="h-3 w-3" />}
                        {item.type === "info" && <Clock className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] font-semibold text-slate-900 truncate">
                            {item.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0 font-roboto">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                          {item.document}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Officer: {item.officer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
