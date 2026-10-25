"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "@/lib/axios";
import { TITLE_MAX, MESSAGE_MAX } from "@/config/notifications";

const SAFE_LINKS = [
  { label: "None (No link)", value: "" },
  { label: "My Room (/dashboard/room)", value: "/dashboard/room" },
  { label: "Roommate Group (/dashboard/group)", value: "/dashboard/group" },
  { label: "Invitations Portal (/dashboard/invitations)", value: "/dashboard/invitations" },
  { label: "Campus Hostels (/dashboard/hostels)", value: "/dashboard/hostels" },
  { label: "Student Dashboard (/dashboard)", value: "/dashboard" },
];

export default function AdminAnnouncementsPage() {
  // Compose form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedLink, setSelectedLink] = useState("");
  const [customLink, setCustomLink] = useState("");
  const [isCustomLink, setIsCustomLink] = useState(false);

  // Audience state
  const [audienceType, setAudienceType] = useState("all_students");
  const [genderVal, setGenderVal] = useState("female");
  const [yearVal, setYearVal] = useState("1");
  const [hostelVal, setHostelVal] = useState("");
  const [groupStatusVal, setGroupStatusVal] = useState("forming");

  // Hostels list for selector
  const [hostels, setHostels] = useState([]);

  // Preview state
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Send modal & submission state
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // History table state
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // View modal state
  const [viewItem, setViewItem] = useState(null);

  // Withdraw modal state
  const [withdrawItem, setWithdrawItem] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  // 1. Fetch available hostels for hostel audience dropdown
  useEffect(() => {
    async function loadHostels() {
      try {
        const res = await axios.get("/api/hostels");
        if (res.data?.success && Array.isArray(res.data.data)) {
          setHostels(res.data.data);
          if (res.data.data.length > 0) {
            setHostelVal(res.data.data[0]._id);
          }
        }
      } catch {
        // ignore
      }
    }
    loadHostels();
  }, []);

  // 2. Fetch announcement history
  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await axios.get(`/api/admin/announcements?page=${historyPage}&limit=10`);
      if (res.data?.success && res.data.data) {
        setHistory(res.data.data.announcements || []);
        setHistoryTotal(res.data.data.total || 0);
        setHistoryTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch announcements history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyPage]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Construct current audience descriptor
  const getAudienceObject = () => {
    switch (audienceType) {
      case "gender":
        return { type: "gender", gender: genderVal };
      case "year":
        return { type: "year", year: Number(yearVal) };
      case "hostel":
        return { type: "hostel", hostelId: hostelVal };
      case "group_status":
        return { type: "group_status", status: groupStatusVal };
      case "allocated":
        return { type: "allocated" };
      case "not_allocated":
        return { type: "not_allocated" };
      case "all_students":
      default:
        return { type: "all_students" };
    }
  };

  const getEffectiveLink = () => {
    if (isCustomLink) return customLink.trim() || null;
    return selectedLink || null;
  };

  // 3. Handle preview
  const handlePreview = async () => {
    try {
      setPreviewing(true);
      setPreviewError(null);
      const audience = getAudienceObject();
      const res = await axios.post("/api/admin/announcements/preview", { audience });
      if (res.data?.success && res.data.data) {
        setPreview(res.data.data);
      }
    } catch (err) {
      setPreviewError(err.response?.data?.message || err.message || "Failed to preview audience");
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  };

  // Reset preview when audience criteria change
  useEffect(() => {
    setPreview(null);
    setPreviewError(null);
  }, [audienceType, genderVal, yearVal, hostelVal, groupStatusVal]);

  // 4. Open send confirmation modal
  const handleOpenSend = (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!title.trim()) {
      setActionError("Title is required");
      return;
    }
    if (!message.trim()) {
      setActionError("Message is required");
      return;
    }

    setConfirmSendOpen(true);
  };

  // 5. Submit announcement
  const handleConfirmSend = async () => {
    try {
      setSending(true);
      setActionError(null);

      const audience = getAudienceObject();
      const link = getEffectiveLink();

      await axios.post("/api/admin/announcements", {
        title: title.trim(),
        message: message.trim(),
        link,
        audience,
      });

      setActionSuccess("Announcement broadcast successfully to all matching students!");
      setConfirmSendOpen(false);
      setTitle("");
      setMessage("");
      setPreview(null);
      fetchHistory();
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || "Failed to broadcast announcement");
      setConfirmSendOpen(false);
    } finally {
      setSending(false);
    }
  };

  // 6. Withdraw announcement
  const handleConfirmWithdraw = async () => {
    if (!withdrawItem) return;
    try {
      setWithdrawing(true);
      await axios.delete(`/api/admin/announcements/${withdrawItem._id}`);
      setWithdrawItem(null);
      fetchHistory();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to withdraw announcement");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/20 text-xl">
            📢
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Campus Announcements & Bulletins
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Broadcast high-priority in-app announcements targeted to specific student demographics,
              academic cohorts, or residential groups.
            </p>
          </div>
        </div>
      </div>

      {/* Action alerts */}
      {actionSuccess && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>✅</span>
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-rose-950 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>⚠️</span>
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Compose Form Card */}
      <div className="mb-12 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span>✍️</span> Compose New Announcement
        </h2>

        <form onSubmit={handleOpenSend} className="space-y-6">
          {/* Title input with live counter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="announcement-title" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Title <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-xs font-semibold ${
                  title.length > TITLE_MAX ? "text-rose-600" : "text-slate-400"
                }`}
              >
                {title.length} / {TITLE_MAX}
              </span>
            </div>
            <input
              id="announcement-title"
              type="text"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Allocation Round 2 Finalized & Published"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          {/* Message textarea with live counter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="announcement-message" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Message <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-xs font-semibold ${
                  message.length > MESSAGE_MAX ? "text-rose-600" : "text-slate-400"
                }`}
              >
                {message.length} / {MESSAGE_MAX}
              </span>
            </div>
            <textarea
              id="announcement-message"
              rows={3}
              value={message}
              maxLength={MESSAGE_MAX}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter plain text announcement message. Privacy guarantee: Never include personal phone numbers, emails, or deal-breaker details."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          {/* Safe Internal Link Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Call-to-Action Link <span className="text-slate-400 font-normal">(Optional internal path)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <select
                  value={isCustomLink ? "custom" : selectedLink}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setIsCustomLink(true);
                    } else {
                      setIsCustomLink(false);
                      setSelectedLink(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {SAFE_LINKS.map((link) => (
                    <option key={link.value} value={link.value}>
                      {link.label}
                    </option>
                  ))}
                  <option value="custom">Custom internal path...</option>
                </select>
              </div>

              {isCustomLink && (
                <div>
                  <input
                    type="text"
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    placeholder="Must start with single '/' (e.g. /dashboard/profile)"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Audience Selector */}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Target Audience Cohort <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">
                  Audience Type
                </label>
                <select
                  value={audienceType}
                  onChange={(e) => setAudienceType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all_students">All Students</option>
                  <option value="gender">By Gender</option>
                  <option value="year">By Academic Year</option>
                  <option value="hostel">By Allocated Hostel</option>
                  <option value="allocated">All Allocated Students</option>
                  <option value="not_allocated">All Unallocated Students</option>
                  <option value="group_status">By Group Status</option>
                </select>
              </div>

              {/* Dynamic Extra Field: Gender */}
              {audienceType === "gender" && (
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1">
                    Select Gender
                  </label>
                  <select
                    value={genderVal}
                    onChange={(e) => setGenderVal(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 capitalize focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {/* Dynamic Extra Field: Year */}
              {audienceType === "year" && (
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1">
                    Select Academic Year
                  </label>
                  <select
                    value={yearVal}
                    onChange={(e) => setYearVal(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="1">Year 1 (Freshmen)</option>
                    <option value="2">Year 2 (Sophomores)</option>
                    <option value="3">Year 3 (Juniors)</option>
                    <option value="4">Year 4 (Seniors)</option>
                    <option value="5">Year 5</option>
                    <option value="6">Year 6</option>
                  </select>
                </div>
              )}

              {/* Dynamic Extra Field: Hostel */}
              {audienceType === "hostel" && (
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-500 font-medium block mb-1">
                    Select Assigned Hostel
                  </label>
                  <select
                    value={hostelVal}
                    onChange={(e) => setHostelVal(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    {hostels.map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name} ({h.gender} · {h.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Extra Field: Group Status */}
              {audienceType === "group_status" && (
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1">
                    Group Status
                  </label>
                  <select
                    value={groupStatusVal}
                    onChange={(e) => setGroupStatusVal(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="forming">Forming Groups</option>
                    <option value="complete">Complete Groups</option>
                    <option value="locked">Locked Groups</option>
                    <option value="none">Students With No Group</option>
                  </select>
                </div>
              )}
            </div>

            {/* Preview Box */}
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewing}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                >
                  {previewing ? "Calculating..." : "🔍 Preview Recipients"}
                </button>

                {preview && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      {preview.count} {preview.count === 1 ? "student" : "students"}
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      ({preview.audienceLabel})
                    </span>
                  </div>
                )}

                {previewError && (
                  <span className="text-xs font-semibold text-rose-600">
                    ⚠️ {previewError}
                  </span>
                )}
              </div>

              <span className="text-[11px] text-slate-400">
                Max fan-out limit: 5,000 recipients
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 transition-all flex items-center gap-2"
            >
              <span>Send Announcement</span>
              <span>&rarr;</span>
            </button>
          </div>
        </form>
      </div>

      {/* Announcements History Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Announcement History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {history.length} of {historyTotal} announcements dispatched
            </p>
          </div>
          <button
            type="button"
            onClick={fetchHistory}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        {loadingHistory ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Loading announcements history...
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No announcements have been broadcast yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <tr>
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4 text-center">Recipients</th>
                  <th className="py-3 px-4 text-center">Read Count</th>
                  <th className="py-3 px-4">Dispatched At</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => {
                  const readRate =
                    item.recipientCount > 0
                      ? Math.round((item.readCount / item.recipientCount) * 100)
                      : 0;

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-[200px] truncate">
                        {item.title}
                        {item.link && (
                          <span className="block text-[10px] font-normal text-indigo-600 truncate mt-0.5">
                            🔗 {item.link}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {item.audienceLabel}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {item.recipientCount}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-slate-800">{item.readCount}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({readRate}%)</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.status === "withdrawn" ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            Withdrawn
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewItem(item)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>
                          {item.status !== "withdrawn" && (
                            <button
                              type="button"
                              onClick={() => setWithdrawItem(item)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Withdraw
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* History Pagination */}
        {historyTotalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              disabled={historyPage <= 1}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              &larr; Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {historyPage} of {historyTotalPages}
            </span>
            <button
              type="button"
              onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
              disabled={historyPage >= historyTotalPages}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Send Announcement */}
      {confirmSendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center gap-3 text-purple-600 mb-4">
              <span className="text-2xl">📢</span>
              <h3 className="text-lg font-bold text-slate-900">
                Confirm Broadcast Dispatch
              </h3>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div className="rounded-2xl bg-purple-50/70 border border-purple-100 p-4 space-y-2">
                <div>
                  <span className="font-bold text-slate-700">Target Cohort:</span>{" "}
                  <span className="font-semibold text-purple-900">
                    {preview?.audienceLabel || "Selected Audience"}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">Recipients Count:</span>{" "}
                  <span className="rounded-full bg-purple-200/80 px-2 py-0.5 font-bold text-purple-900">
                    {preview?.count ?? "Will be resolved"} students
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Title:</span>
                <p className="rounded-xl bg-slate-50 p-2.5 font-medium text-slate-800 border border-slate-200/60">
                  {title}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Message:</span>
                <p className="rounded-xl bg-slate-50 p-2.5 text-slate-700 border border-slate-200/60 whitespace-pre-wrap">
                  {message}
                </p>
              </div>

              {getEffectiveLink() && (
                <div>
                  <span className="font-bold text-slate-700">Action Link:</span>{" "}
                  <code className="text-indigo-600 text-xs">{getEffectiveLink()}</code>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setConfirmSendOpen(false)}
                disabled={sending}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={sending}
                className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50"
              >
                {sending ? "Broadcasting..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Announcement Details
              </h3>
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">
                  Title
                </span>
                <span className="text-slate-900 font-bold text-base mt-0.5 block">
                  {viewItem.title}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">
                  Message
                </span>
                <p className="mt-1 rounded-xl bg-slate-50 p-3 text-slate-700 border border-slate-200/60 leading-relaxed whitespace-pre-wrap">
                  {viewItem.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Target Audience</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{viewItem.audienceLabel}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Deliveries</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {viewItem.recipientCount} recipients · {viewItem.readCount} read
                  </p>
                </div>
              </div>

              {viewItem.link && (
                <div>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">
                    Action Link
                  </span>
                  <code className="text-indigo-600 text-xs block mt-0.5">{viewItem.link}</code>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Withdraw Announcement */}
      {withdrawItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-base font-bold text-slate-900">
                Withdraw Announcement?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Withdrawing this announcement will mark it as withdrawn and{" "}
              <strong>permanently delete all delivered copies</strong> from every recipient student&apos;s
              notification center.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setWithdrawItem(null)}
                disabled={withdrawing}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdraw}
                disabled={withdrawing}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {withdrawing ? "Withdrawing..." : "Yes, Withdraw"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
