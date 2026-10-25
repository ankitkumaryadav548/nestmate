"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
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
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TABS = [
  { id: "all", label: "All" },
  { id: "invitations", label: "Invitations" },
  { id: "groups", label: "Groups" },
  { id: "allocation", label: "Allocation" },
  { id: "announcements", label: "Announcements" },
];

export default function NotificationsCenter({ portalRole = "student" }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({
    notifications: [],
    total: 0,
    totalPages: 1,
    limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", 20);
      if (unreadOnly) params.set("unreadOnly", "true");
      if (activeTab !== "all") params.set("category", activeTab);

      const res = await axios.get(`/api/notifications?${params.toString()}`);
      if (res.data?.success && res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly, activeTab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
  };

  const handleToggleUnread = () => {
    setUnreadOnly((prev) => !prev);
    setPage(1);
  };

  const handleMarkAsRead = async (id) => {
    try {
      setData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((item) =>
          item._id === id ? { ...item, readAt: new Date() } : item
        ),
      }));
      await axios.post(`/api/notifications/${id}/read`);
    } catch {
      fetchNotifications();
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      setData((prev) => ({
        ...prev,
        notifications: prev.notifications.filter((item) => item._id !== id),
        total: Math.max(0, prev.total - 1),
      }));
      await axios.delete(`/api/notifications/${id}`);
    } catch {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((item) => ({
          ...item,
          readAt: item.readAt || new Date(),
        })),
      }));
      await axios.post("/api/notifications/read-all", {
        category: activeTab !== "all" ? activeTab : undefined,
      });
    } catch {
      fetchNotifications();
    }
  };

  const handleClearAllRead = async () => {
    try {
      setClearing(true);
      await axios.delete("/api/notifications");
      setConfirmClearOpen(false);
      fetchNotifications();
    } catch (err) {
      console.error("Failed to clear read notifications:", err);
    } finally {
      setClearing(false);
    }
  };

  const handleItemNavigate = async (notif) => {
    if (!notif.readAt) {
      await handleMarkAsRead(notif._id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const hasReadNotifications = data.notifications.some((n) => n.readAt);

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Notification Center
            </h1>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {data.total} {data.total === 1 ? "notification" : "notifications"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time updates regarding roommate invitations, group milestones, room allocations,
            and administrative bulletins.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={loading || data.notifications.length === 0}
            className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            disabled={loading || !hasReadNotifications}
            className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            Delete read
          </button>
        </div>
      </div>

      {/* Filter Tabs & Toggle */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Unread Only Toggle */}
        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={handleToggleUnread}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            <span className="ml-2 text-xs font-semibold text-slate-700">
              Unread only
            </span>
          </label>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          /* Text-free loading skeleton */
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/80 bg-white p-4.5 flex items-start gap-4 animate-pulse shadow-xs"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-1/3 rounded bg-slate-200" />
                    <div className="h-3 w-16 rounded bg-slate-100" />
                  </div>
                  <div className="h-3 w-4/5 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : data.notifications.length === 0 ? (
          /* Friendly Empty State */
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 text-2xl mb-3 border border-indigo-100">
              📭
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {unreadOnly
                ? "No unread notifications"
                : "No notifications in this category"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              {unreadOnly
                ? "You are all caught up! Switch off the 'Unread only' filter to view past updates."
                : "When new roommate invites or housing milestones arrive, they will appear right here."}
            </p>
            {unreadOnly && (
              <button
                type="button"
                onClick={() => setUnreadOnly(false)}
                className="mt-4 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                View all notifications
              </button>
            )}
          </div>
        ) : (
          data.notifications.map((notif) => {
            const isUnread = !notif.readAt;
            return (
              <div
                key={notif._id}
                className={`relative rounded-2xl border p-4 sm:p-5 transition-all shadow-xs flex flex-col sm:flex-row items-start justify-between gap-4 ${
                  isUnread
                    ? "bg-indigo-50/40 border-indigo-200 hover:border-indigo-300"
                    : "bg-white border-slate-200/80 hover:border-slate-300"
                }`}
              >
                {/* Icon & Message Body */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <NotificationIcon
                    name={notif.type}
                    severity={notif.severity}
                    className="h-5 w-5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm ${
                          isUnread ? "font-bold text-slate-900" : "font-semibold text-slate-800"
                        }`}
                      >
                        {notif.title}
                      </span>
                      {isUnread && (
                        <span className="inline-flex items-center rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          New
                        </span>
                      )}
                      <span className="text-xs text-slate-400 sm:ml-auto">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    {/* Plain Text Message */}
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed break-words">
                      {notif.message}
                    </p>

                    {/* Safe internal link action */}
                    {notif.link && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => handleItemNavigate(notif)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <span>Open related page</span>
                          <span>&rarr;</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Per-Item Action Buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t border-slate-100 sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notif._id)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-2xs transition-colors"
                      title="Mark as read"
                    >
                      ✓ Read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(notif._id)}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 shadow-2xs transition-colors"
                    title="Delete notification"
                    aria-label="Delete notification"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Bar */}
      {data.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            &larr; Previous
          </button>
          <span className="text-xs font-semibold text-slate-600">
            Page {page} of {data.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Next &rarr;
          </button>
        </div>
      )}

      {/* Confirmation Modal for Delete All Read */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-base font-bold text-slate-900">
                Delete Read Notifications?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              This action will permanently delete all notifications that you have already marked as read.
              Unread messages will remain untouched.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                disabled={clearing}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllRead}
                disabled={clearing}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {clearing ? "Deleting..." : "Yes, Delete Read"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
