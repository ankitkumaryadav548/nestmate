"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import NotificationIcon from "./NotificationIcon";
import {
  PageContainer,
  SectionHeader,
  Card,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
  ConfirmDialog,
  Pagination,
  DayGroupHeader,
} from "@/components/ui";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getDayBucket(dateString) {
  if (!dateString) return "Older";
  const date = new Date(dateString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  if (date >= startOfWeek) return "Earlier this week";
  return "Older";
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
  const [error, setError] = useState(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
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
      setError(err.response?.data?.message || err.message || "Failed to load notifications.");
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

  // Group notifications into Day Buckets
  const groupedNotifications = useMemo(() => {
    const buckets = [
      { key: "Today", label: "Today", items: [] },
      { key: "Yesterday", label: "Yesterday", items: [] },
      { key: "Earlier this week", label: "Earlier this week", items: [] },
      { key: "Older", label: "Older", items: [] },
    ];

    data.notifications.forEach((notif) => {
      const bucketKey = getDayBucket(notif.createdAt);
      const target = buckets.find((b) => b.key === bucketKey) || buckets[3];
      target.items.push(notif);
    });

    return buckets.filter((b) => b.items.length > 0);
  }, [data.notifications]);

  return (
    <PageContainer maxWidth="5xl" className="py-8">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
              Notification Center
            </h1>
            <Badge variant="brand" size="md">
              {data.total} {data.total === 1 ? "notification" : "notifications"}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Real-time updates regarding roommate invitations, group milestones, room allocations,
            and administrative bulletins.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={loading || data.notifications.length === 0}
          >
            Mark all read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmClearOpen(true)}
            disabled={loading || !hasReadNotifications}
            className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            Delete read
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Toggle */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
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
            <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            <span className="ml-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Unread only
            </span>
          </label>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {loading ? (
          /* Text-free loading skeleton */
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 flex items-start gap-4 shadow-xs"
              >
                <Skeleton variant="rounded" width="40px" height="40px" className="shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <Skeleton variant="text" width="40%" height="18px" />
                    <Skeleton variant="text" width="60px" height="14px" />
                  </div>
                  <Skeleton variant="text" width="85%" height="14px" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Failed to Load Notifications"
            message={error}
            onRetry={fetchNotifications}
          />
        ) : data.notifications.length === 0 ? (
          /* Friendly Empty State */
          <Card className="p-12 text-center">
            <EmptyState
              icon={
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-2xl border border-indigo-100 dark:border-indigo-900/40">
                  📭
                </div>
              }
              title={
                unreadOnly
                  ? "No unread notifications"
                  : "No notifications in this category"
              }
              description={
                unreadOnly
                  ? "You are all caught up! Switch off the 'Unread only' filter to view past updates."
                  : "When new roommate invites or housing milestones arrive, they will appear right here."
              }
              action={
                unreadOnly ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setUnreadOnly(false)}
                    className="mt-2"
                  >
                    View all notifications
                  </Button>
                ) : null
              }
            />
          </Card>
        ) : (
          /* Grouped list by date */
          groupedNotifications.map((group) => (
            <div key={group.key} className="space-y-2.5">
              <DayGroupHeader title={group.label} count={group.items.length} />

              {group.items.map((notif) => {
                const isUnread = !notif.readAt;
                return (
                  <div
                    key={notif._id}
                    className={`group relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 shadow-xs flex flex-col sm:flex-row items-start justify-between gap-4 ${
                      isUnread
                        ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-800"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {isUnread && (
                      <span
                        className="absolute left-2.5 top-5 w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 motion-safe:animate-pulse"
                        title="Unread"
                        aria-label="Unread"
                      />
                    )}

                    {/* Icon & Message Body */}
                    <div className={`flex items-start gap-3.5 flex-1 min-w-0 ${isUnread ? "pl-2" : ""}`}>
                      <NotificationIcon
                        name={notif.type}
                        severity={notif.severity}
                        className="h-5 w-5"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm ${
                              isUnread
                                ? "font-bold text-slate-900 dark:text-slate-100"
                                : "font-semibold text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {notif.title}
                          </span>
                          {isUnread && (
                            <Badge variant="brand" size="sm">
                              New
                            </Badge>
                          )}
                          <span
                            className="text-xs text-slate-400 dark:text-slate-500 sm:ml-auto"
                            title={notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ""}
                          >
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>

                        {/* Plain Text Message */}
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed max-w-2xl break-words">
                          {notif.message}
                        </p>

                        {/* Safe internal link action */}
                        {notif.link && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => handleItemNavigate(notif)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group-hover:translate-x-0.5"
                            >
                              <span>Open related page</span>
                              <span>&rarr;</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Per-Item Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t border-slate-100 dark:border-slate-800 sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                      {isUnread && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMarkAsRead(notif._id)}
                          title="Mark as read"
                          className="h-8 px-2.5 text-xs"
                        >
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Read
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(notif._id)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shadow-2xs"
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
              })}
            </div>
          ))
        )}
      </div>

      {/* Pagination Bar */}
      {data.totalPages > 1 && (
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={data.totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Confirmation Dialog for Delete All Read */}
      <ConfirmDialog
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={handleClearAllRead}
        isLoading={clearing}
        title="Delete Read Notifications?"
        message="This action will permanently delete all notifications that you have already marked as read. Unread messages will remain untouched."
        confirmText="Yes, Delete Read"
        cancelText="Cancel"
        variant="danger"
      />
    </PageContainer>
  );
}