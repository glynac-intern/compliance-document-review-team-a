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
import { notificationsApi, type AppNotification } from "@/lib/notifications-api";
import { useAuth } from "@/lib/auth-context";

interface TopBarProps {
  breadcrumbs?: { label: string; href?: string; onClick?: () => void }[];
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  // TA-71: opening a notification takes the advisor to the document.
  onNotificationClick?: (documentId: string) => void;
}

export function TopBar({
  breadcrumbs = [
    { label: "Workspace", href: "/advisor" },
    { label: "Overview" },
  ],
  onToggleMobileSidebar,
  onRefresh,
  isRefreshing = false,
  onNotificationClick,
}: TopBarProps) {
  const { logout } = useAuth();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showCalendar, setShowCalendar] = React.useState(false);

  // TA-71: real notifications and unread count -- fetched fresh each
  // time the dashboard loads ("next time they open their dashboard",
  // per this ticket's own framing; in-app only, not real-time push).
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    notificationsApi.list().then(setNotifications).catch(() => setNotifications([]));
    notificationsApi.getUnreadCount().then((r) => setUnreadCount(r.unread_count)).catch(() => setUnreadCount(0));
  }, []);

  const handleNotificationItemClick = async (notification: AppNotification) => {
    if (!notification.is_read) {
      try {
        await notificationsApi.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Marking as read is best-effort -- navigation should still
        // proceed even if this particular call fails.
      }
    }
    setShowNotifications(false);
    if (notification.document_id && onNotificationClick) {
      onNotificationClick(notification.document_id);
    }
  };

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
                    onClick={async () => {
                      const unread = notifications.filter((n) => !n.is_read);
                      await Promise.all(unread.map((n) => notificationsApi.markAsRead(n.id).catch(() => null)));
                      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                      setUnreadCount(0);
                    }}
                    className="text-[11px] font-normal text-[#1e4c77] hover:underline font-inter cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pt-1 font-inter">
                {notifications.length === 0 ? (
                  <p className="text-[12px] text-slate-400 text-center py-6">No notifications yet.</p>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationItemClick(item)}
                      className={cn(
                        "py-2.5 px-1 hover:bg-slate-50/80 rounded-lg transition-colors cursor-pointer",
                        !item.is_read && "bg-blue-50/40"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px] bg-blue-50 text-[#1e4c77] border border-blue-200">
                          {!item.is_read ? (
                            <AlertCircle className="h-3 w-3 stroke-[1.8]" />
                          ) : (
                            <Check className="h-3 w-3 stroke-[2]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 font-inter">
                          <p className="text-[12px] font-normal text-slate-800 font-inter">
                            {item.message}
                          </p>
                          <span className="text-[10px] text-slate-400 font-inter font-normal">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
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
