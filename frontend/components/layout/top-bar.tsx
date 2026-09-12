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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

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
  const { logout } = useAuth();
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

      {/* Right: Reusable Utility Action Cluster — Elegant rounded-2xl buttons matching Screenshot 1 */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Refresh Icon Button (Sleek reload transition and theme active state) */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh compliance queue"
          className={cn(
            "h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 border shadow-2xs",
            isRefreshing
              ? "bg-[#1e4c77] text-white border-[#1e4c77] shadow-xs scale-[0.98]"
              : "bg-white border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:bg-[#1e4c77] active:text-white active:scale-95"
          )}
        >
          <RotateCw
            className={cn(
              "h-[18px] w-[18px] stroke-[1.8] transition-transform",
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
              "h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer border shadow-2xs",
              showCalendar
                ? "bg-[#1e4c77] text-white border-[#1e4c77] shadow-xs"
                : "bg-white border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:bg-[#1e4c77] active:text-white active:scale-95"
            )}
          >
            <CalendarIcon className="h-[18px] w-[18px] stroke-[1.8]" />
          </button>

          {/* Calendar Popover */}
          {showCalendar && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150 font-inter">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-[#1e4c77] stroke-[1.8]" />
                  <h3 className="text-[13px] font-normal text-slate-800 font-inter">
                    Regulatory Deadlines
                  </h3>
                </div>
                <span className="text-[11px] font-normal text-slate-400 font-inter">
                  Q1 2026
                </span>
              </div>

              <div className="space-y-2 pt-2.5">
                {calendarEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-slate-100 bg-[#f8fafc] hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-normal text-[#1e4c77] font-inter">
                        {evt.type}
                      </span>
                      <span className="text-[11px] font-normal text-slate-500 font-numbers tabular-nums">
                        {evt.date}
                      </span>
                    </div>
                    <p className="text-[12px] font-normal text-slate-700 leading-snug font-inter">
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
              "relative h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer border shadow-2xs",
              showNotifications
                ? "bg-[#1e4c77] text-white border-[#1e4c77] shadow-xs"
                : "bg-white border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:bg-[#1e4c77] active:text-white active:scale-95"
            )}
          >
            <Bell className="h-[18px] w-[18px] stroke-[1.8]" />
            {unreadCount > 0 && (
              <span
                className={cn(
                  "absolute top-2 right-2 h-2.5 w-2.5 rounded-full transition-colors",
                  showNotifications
                    ? "bg-white ring-2 ring-[#1e4c77]"
                    : "bg-[#1e4c77] ring-2 ring-white"
                )}
              />
            )}
          </button>

          {/* Notifications Popover */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150 font-inter">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-normal text-slate-800 font-inter">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-[#ebf4fb] px-2 py-0.5 text-[10px] font-normal text-[#1e4c77] font-inter">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setUnreadCount(0)}
                    className="text-[11px] font-normal text-[#1e4c77] hover:underline font-inter cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pt-1 font-inter">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 px-1 hover:bg-slate-50/80 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px]",
                          item.type === "warning" && "bg-amber-50 text-amber-800 border border-amber-200",
                          item.type === "success" && "bg-emerald-50 text-emerald-800 border border-emerald-200",
                          item.type === "info" && "bg-blue-50 text-[#1e4c77] border border-blue-200"
                        )}
                      >
                        {item.type === "warning" && <AlertCircle className="h-3 w-3 stroke-[1.8]" />}
                        {item.type === "success" && <Check className="h-3 w-3 stroke-[2]" />}
                        {item.type === "info" && <Clock className="h-3 w-3 stroke-[1.8]" />}
                      </div>
                      <div className="flex-1 min-w-0 font-inter">
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] font-normal text-slate-800 truncate font-inter">
                            {item.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0 font-inter font-normal">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 font-inter font-normal">
                          {item.document}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-inter font-normal">
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

        {/* TA-61: real logout -- clears the session and returns to /login */}
        <button
          type="button"
          onClick={logout}
          title="Log out"
          className="h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer border shadow-2xs bg-white border-slate-200/90 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 active:scale-95"
        >
          <LogOut className="h-[18px] w-[18px] stroke-[1.8]" />
        </button>
      </div>
    </header>
  );
}
