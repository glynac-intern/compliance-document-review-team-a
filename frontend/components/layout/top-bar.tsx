"use client";

import * as React from "react";
import Link from "next/link";
import {
  RotateCw,
  Bell,
  Calendar as CalendarIcon,
  ChevronRight,
  Menu,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  breadcrumbs?: { label: string; href?: string; onClick?: () => void }[];
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TopBar({
  breadcrumbs = [
    { label: "Workspace", href: "/advisor" },
    { label: "Overview" },
  ],
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
    <header className="sticky top-0 z-30 h-16 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md flex items-center justify-between px-5 sm:px-8 transition-all font-inter">
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
        <nav aria-label="Breadcrumbs" className="flex items-center gap-2.5 text-[15px] font-inter select-none">
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
                ) : crumb.onClick ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className="text-slate-400 font-normal hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {crumb.label}
                  </button>
                ) : crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-slate-400 font-normal hover:text-slate-600 transition-colors"
                  >
                    {crumb.label}
                  </Link>
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

      {/* Right: Refined Institutional Utility Toolbar — Sleek segmented control dock */}
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100/90 border border-slate-200/80 shadow-2xs">
          {/* Refresh Icon Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh compliance queue"
            className={cn(
              "h-8 w-8 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-2xs",
              isRefreshing && "bg-white text-[#1e4c77] shadow-2xs"
            )}
          >
            <RotateCw
              className={cn(
                "h-4 w-4 stroke-[1.8] transition-transform",
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
                "h-8 w-8 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-2xs",
                showCalendar && "bg-white text-[#1e4c77] shadow-2xs"
              )}
            >
              <CalendarIcon className="h-4 w-4 stroke-[1.8]" />
            </button>

            {/* Calendar Popover */}
            {showCalendar && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-200/90 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150 font-inter">
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
                      className="p-2.5 rounded-lg border border-slate-100 bg-[#f8fafc] hover:border-slate-200 transition-colors"
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

          {/* Hairline Divider */}
          <div className="h-3.5 w-px bg-slate-200/90 mx-0.5" />

          {/* Notification Bell with Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
              className={cn(
                "relative h-8 w-8 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-2xs",
                showNotifications && "bg-white text-[#1e4c77] shadow-2xs"
              )}
            >
              <Bell className="h-4 w-4 stroke-[1.8]" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#1e4c77] ring-2 ring-white"
                />
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200/90 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150 font-inter">
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
      </div>
    </div>
  </header>
  );
}
