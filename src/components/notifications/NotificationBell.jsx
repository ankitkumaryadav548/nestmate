"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import { BELL_PREVIEW_COUNT, POLL_INTERVAL_SECONDS } from "@/config/notifications";
import NotificationIcon from "./NotificationIcon";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationBell({ userRole = "student" }) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [previewList, setPreviewList] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Fetch unread count & periodic polling with visibilitychange awareness
  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get("/api/notifications/unread-count");
      if (res.data?.success && typeof res.data.data?.unreadCount === "number") {
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch {
      // silently ignore network hiccups
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    let intervalId = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(fetchUnreadCount, POLL_INTERVAL_SECONDS * 1000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Tab became visible again: refresh immediately and resume polling
        fetchUnreadCount();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // 2. Fetch preview list when dropdown opens
  const fetchPreviews = async () => {
    try {
      setLoadingPreview(true);
      const res = await axios.get(`/api/notifications?limit=${BELL_PREVIEW_COUNT}`);
      if (res.data?.success && Array.isArray(res.data.data?.notifications)) {
        setPreviewList(res.data.data.notifications);
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchPreviews();
      fetchUnreadCount();
    }
    setIsOpen(!isOpen);
  };

  // 3. Close on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // 4. Mark item read & navigate
  const handleItemClick = async (notif) => {
    try {
      if (!notif.readAt) {
        // Optimistically update
        setPreviewList((prev) =>
          prev.map((item) => (item._id === notif._id ? { ...item, readAt: new Date() } : item))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        await axios.post(`/api/notifications/${notif._id}/read`);
      }
    } catch {
      // ignore
    }

    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  // 5. Mark all as read
  const handleMarkAllRead = async () => {
    try {
      setPreviewList((prev) =>
        prev.map((item) => ({ ...item, readAt: item.readAt || new Date() }))
      );
      setUnreadCount(0);
      await axios.post("/api/notifications/read-all");
    } catch {
      // ignore
    }
  };

  const allNotificationsHref =
    userRole === "admin" ? "/admin/notifications" : "/dashboard/notifications";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:text-indigo-600 dark:hover:text-indigo-400 focus-visible:outline-2 focus-visible:outline-indigo-500 transition-all"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <svg
          className="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Unread Badge (hidden at 0, shows 9+ above 9) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-1 text-[11px] font-bold text-white shadow-xs ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Preview Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden animate-scale-in"
          role="region"
          aria-label="Notification preview list"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List Body */}
          <div className="max-h-96 divide-y divide-slate-100 dark:divide-slate-800/70 overflow-y-auto">
            {loadingPreview ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-2.5 w-full rounded bg-slate-100 dark:bg-slate-800/60" />
                    </div>
                  </div>
                ))}
              </div>
            ) : previewList.length === 0 ? (
              <div className="py-10 text-center px-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xl mb-2">
                  ”
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No notifications yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  We will notify you here when invitations or allocation updates occur.
                </p>
              </div>
            ) : (
              previewList.map((notif) => {
                const isUnread = !notif.readAt;
                return (
                  <button
                    key={notif._id}
                    type="button"
                    onClick={() => handleItemClick(notif)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      isUnread
                        ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                        : "bg-white dark:bg-slate-900"
                    }`}
                  >
                    <NotificationIcon
                      name={notif.type}
                      severity={notif.severity}
                      className="h-4 w-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs truncate ${
                            isUnread
                              ? "font-bold text-slate-900 dark:text-slate-100"
                              : "font-semibold text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {notif.title}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                    {isUnread && (
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600 dark:bg-indigo-400"
                        title="Unread"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer View All Link */}
          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-2.5 text-center">
            <Link
              href={allNotificationsHref}
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors inline-flex items-center gap-1"
            >
              <span>View all notifications</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
