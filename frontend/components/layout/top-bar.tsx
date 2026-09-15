"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RotateCw,
  Bell,
  ChevronRight,
  Menu,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  BellOff,
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
  onNotificationClick,
}: TopBarProps) {
  const { role, logout } = useAuth();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const notificationsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let ignore = false;
    Promise.all([
      notificationsApi.list(),
      notificationsApi.getUnreadCount(),
    ])
      .then(([list, countRes]) => {
        if (!ignore) {
          setNotifications(list);
          setUnreadCount(countRes.unread_count);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  React.useEffect(() => {
    if (!showNotifications && !isRefreshing) return;
    let ignore = false;

    Promise.all([
      notificationsApi.list(),
      notificationsApi.getUnreadCount(),
    ])
      .then(([list, countRes]) => {
        if (!ignore) {
          setNotifications(list);
          setUnreadCount(countRes.unread_count);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [showNotifications, isRefreshing]);

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

  const handleNotificationClick = async (item: AppNotification) => {
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
    setShowNotifications(false);
    // TA-71: Navigate to the document or invoke onNotificationClick so advisor/officer can view decision.
    if (item.document_id) {
      if (onNotificationClick) {
        onNotificationClick(item.document_id);
      } else {
        router.push(role === "officer" ? `/officer/documents/${item.document_id}` : `/advisor?doc=${item.document_id}`);
      }
    }
  };

  // Close popover on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

          {/* Hairline Divider */}
          <div className="h-3.5 w-px bg-slate-200/90 mx-0.5" />

          {/* Notification Bell with Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              title={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
              className={cn(
                "relative h-8 w-8 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-2xs",
                showNotifications && "bg-white text-[#1e4c77] shadow-2xs"
              )}
            >
              <Bell className="h-4 w-4 stroke-[1.8]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#1e4c77] text-white text-[9px] font-medium font-numbers flex items-center justify-center ring-2 ring-white shadow-2xs animate-in zoom-in-50 duration-150">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2.5 w-80 sm:w-88 rounded-xl bg-white border border-slate-200 shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden font-inter">
                {/* Popover Header */}
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-slate-800 font-inter">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600 font-numbers tabular-nums">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-normal text-[#1e4c77] hover:underline transition-colors cursor-pointer font-inter"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto font-inter">
                  {notifications.length === 0 ? (
                    <div className="py-7 px-4 text-center font-inter">
                      <p className="text-xs text-slate-400">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((item) => {
                      const msg = item.message || "";
                      const lower = msg.toLowerCase();
                      const isApproved = lower.includes("approved");
                      const isRejected = lower.includes("rejected");
                      const isRevision =
                        lower.includes("revision") || lower.includes("needs revision");

                      const iconType = isApproved
                        ? "approved"
                        : isRejected
                        ? "rejected"
                        : isRevision
                        ? "revision"
                        : "general";

                      const title = isApproved
                        ? "Approved"
                        : isRejected
                        ? "Rejected"
                        : isRevision
                        ? "Revision Requested"
                        : "Update";

                      // Parse any comment embedded by backend review decisions (" Comment: ...")
                      let bodyText = msg;
                      let commentText: string | null = null;
                      if (msg.includes(" Comment: ")) {
                        const parts = msg.split(" Comment: ");
                        bodyText = parts[0];
                        commentText = parts.slice(1).join(" Comment: ");
                      }

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={cn(
                            "py-2.5 px-3.5 transition-colors cursor-pointer group hover:bg-slate-50 flex items-start gap-2.5",
                            !item.is_read && "bg-slate-50/60"
                          )}
                        >
                          <div className="flex-1 min-w-0 font-inter">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "text-[12px] font-medium truncate",
                                  iconType === "approved" && "text-[#166534]",
                                  iconType === "revision" && "text-[#92400e]",
                                  iconType === "rejected" && "text-[#991b1b]",
                                  iconType === "general" && "text-slate-800"
                                )}
                              >
                                {title}
                              </span>
                              <span className="text-[10.5px] text-slate-400 shrink-0 font-normal font-numbers tabular-nums">
                                {formatNotificationTime(item.created_at)}
                              </span>
                            </div>

                            <p className="text-[11.5px] text-slate-600 leading-snug mt-0.5 font-normal">
                              {bodyText}
                            </p>

                            {commentText && (
                              <p className="mt-1 text-[11px] text-slate-500 italic">
                                &ldquo;{commentText}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Hairline Divider */}
          <div className="h-3.5 w-px bg-slate-200/90 mx-0.5" />

          {/* TA-61: real logout -- clears the session and returns to /login */}
          <button
            type="button"
            onClick={logout}
            title="Log out"
            aria-label="Log out"
            className="h-8 w-8 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer text-slate-500 hover:text-red-600 hover:bg-white hover:shadow-2xs"
          >
            <LogOut className="h-4 w-4 stroke-[1.8]" />
          </button>
        </div>
      </div>
  </header>
  );
}
