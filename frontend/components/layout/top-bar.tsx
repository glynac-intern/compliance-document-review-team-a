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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { notificationsApi, type BackendNotification } from "@/lib/notifications-api";

interface TopBarProps {
  breadcrumbs?: { label: string; href?: string; onClick?: () => void }[];
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function formatNotificationTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
  const { logout } = useAuth();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [notifications, setNotifications] = React.useState<BackendNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const calendarRef = React.useRef<HTMLDivElement>(null);

  const loadNotifications = React.useCallback(async () => {
    try {
      const [list, countRes] = await Promise.all([
        notificationsApi.list(),
        notificationsApi.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(countRes.unread_count);
    } catch {
      // Offline fallback: keep harmless state
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  React.useEffect(() => {
    if (showNotifications || isRefreshing) {
      loadNotifications();
    }
  }, [showNotifications, isRefreshing, loadNotifications]);

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await Promise.all(unread.map((n) => notificationsApi.markAsRead(n.id)));
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (item: BackendNotification) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await notificationsApi.markAsRead(item.id);
      } catch {
        // ignore
      }
    }
  };

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
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-normal text-[#1e4c77] hover:underline font-inter cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pt-1 font-inter">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-inter">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((item) => {
                    const msg = item.message || "";
                    const isApproved = msg.toLowerCase().includes("approved");
                    const isRevision =
                      msg.toLowerCase().includes("revision") || msg.toLowerCase().includes("rejected");
                    const iconType = isApproved ? "success" : isRevision ? "warning" : "info";
                    const title = isApproved
                      ? "Document Approved"
                      : isRevision
                      ? "Needs Revision"
                      : "Compliance Update";

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={cn(
                          "py-2.5 px-2 hover:bg-slate-50/80 rounded-lg transition-colors cursor-pointer",
                          !item.is_read && "bg-blue-50/40"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              "mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px]",
                              iconType === "warning" && "bg-amber-50 text-amber-800 border border-amber-200",
                              iconType === "success" && "bg-emerald-50 text-emerald-800 border border-emerald-200",
                              iconType === "info" && "bg-blue-50 text-[#1e4c77] border border-blue-200"
                            )}
                          >
                            {iconType === "warning" && <AlertCircle className="h-3 w-3 stroke-[1.8]" />}
                            {iconType === "success" && <Check className="h-3 w-3 stroke-[2]" />}
                            {iconType === "info" && <Clock className="h-3 w-3 stroke-[1.8]" />}
                          </div>
                          <div className="flex-1 min-w-0 font-inter">
                            <div className="flex items-center justify-between">
                              <p className="text-[12px] font-medium text-slate-800 truncate font-inter">
                                {title}
                              </p>
                              <span className="text-[10px] text-slate-400 shrink-0 font-inter font-normal">
                                {formatNotificationTime(item.created_at)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug mt-0.5 font-inter font-normal">
                              {msg}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
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
    </div>
  </header>
  );
}
