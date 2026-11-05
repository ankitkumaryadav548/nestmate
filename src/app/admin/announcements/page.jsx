"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "@/lib/axios";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import {
  PageContainer,
  Card,
  Button,
  Input,
  Textarea,
  Select,
  Badge,
  ProgressBar,
  Modal,
  ConfirmDialog,
  Alert,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableSkeleton,
  Pagination,
} from "@/components/ui";
import { AdminPageHeader } from "@/components/admin";
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
  useDocumentTitle("Campus Announcements", true);
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
  const [historyError, setHistoryError] = useState(null);

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
      setHistoryError(null);
      const res = await axios.get(`/api/admin/announcements?page=${historyPage}&limit=10`);
      if (res.data?.success && res.data.data) {
        setHistory(res.data.data.announcements || []);
        setHistoryTotal(res.data.data.total || 0);
        setHistoryTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch announcements history:", err);
      setHistoryError(err.response?.data?.message || err.message || "Failed to fetch announcements history.");
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
    <PageContainer maxWidth="7xl">
      <div className="space-y-6">
        {/* Header */}
        <AdminPageHeader
          title="Campus Announcements"
          description="Broadcast high-priority announcements targeted to specific student cohorts, hostels, or groups."
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Announcements" },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
            >
              Refresh
            </Button>
          }
        />

        {/* Action alerts */}
        {actionSuccess && (
          <Alert variant="success" className="flex items-center justify-between">
            <span>{actionSuccess}</span>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-xs font-bold hover:opacity-80"
            >
              ✕
            </button>
          </Alert>
        )}

        {actionError && (
          <Alert variant="danger" className="flex items-center justify-between">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs font-bold hover:opacity-80"
            >
              ✕
            </button>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Compose Form Card */}
          <Card className="lg:col-span-5 p-5 sm:p-6 space-y-5">
            <div className="border-b border-[var(--border)] pb-3">
              <h2 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                Compose New Announcement
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Target notifications to individual cohorts or the whole student body.
              </p>
            </div>

            <form onSubmit={handleOpenSend} className="space-y-4">
              {/* Title input with live counter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="announcement-title" className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                    Title <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-xs font-semibold ${
                      title.length > TITLE_MAX ? "text-rose-600" : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {title.length} / {TITLE_MAX}
                  </span>
                </div>
                <Input
                  id="announcement-title"
                  type="text"
                  value={title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Allocation Round 2 Finalized & Published"
                  required
                />
              </div>

              {/* Message textarea with live counter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="announcement-message" className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-xs font-semibold ${
                      message.length > MESSAGE_MAX ? "text-rose-600" : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {message.length} / {MESSAGE_MAX}
                  </span>
                </div>
                <Textarea
                  id="announcement-message"
                  rows={3}
                  value={message}
                  maxLength={MESSAGE_MAX}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter message text. Privacy guarantee: Never include personal phone numbers, emails, or deal-breaker details."
                  required
                />
              </div>

              {/* Safe Internal Link Selector */}
              <div>
                <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider block mb-1.5">
                  Call-to-Action Link <span className="text-[var(--muted-foreground)] font-normal">(Optional)</span>
                </label>
                <div className="space-y-2">
                  <Select
                    value={isCustomLink ? "custom" : selectedLink}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomLink(true);
                      } else {
                        setIsCustomLink(false);
                        setSelectedLink(e.target.value);
                      }
                    }}
                  >
                    {SAFE_LINKS.map((link) => (
                      <option key={link.value} value={link.value}>
                        {link.label}
                      </option>
                    ))}
                    <option value="custom">Custom internal path...</option>
                  </Select>

                  {isCustomLink && (
                    <Input
                      type="text"
                      value={customLink}
                      onChange={(e) => setCustomLink(e.target.value)}
                      placeholder="Must start with '/' (e.g. /dashboard/profile)"
                    />
                  )}
                </div>
              </div>

              {/* Audience Selector */}
              <div className="pt-2 border-t border-[var(--border)] space-y-3">
                <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider block">
                  Target Audience Cohort <span className="text-rose-500">*</span>
                </label>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                      Audience Type
                    </label>
                    <Select
                      value={audienceType}
                      onChange={(e) => setAudienceType(e.target.value)}
                    >
                      <option value="all_students">All Students</option>
                      <option value="gender">By Gender</option>
                      <option value="year">By Academic Year</option>
                      <option value="hostel">By Allocated Hostel</option>
                      <option value="allocated">All Allocated Students</option>
                      <option value="not_allocated">All Unallocated Students</option>
                      <option value="group_status">By Group Status</option>
                    </Select>
                  </div>

                  {/* Dynamic Extra Field: Gender */}
                  {audienceType === "gender" && (
                    <div>
                      <label className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                        Select Gender
                      </label>
                      <Select
                        value={genderVal}
                        onChange={(e) => setGenderVal(e.target.value)}
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                      </Select>
                    </div>
                  )}

                  {/* Dynamic Extra Field: Year */}
                  {audienceType === "year" && (
                    <div>
                      <label className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                        Select Academic Year
                      </label>
                      <Select
                        value={yearVal}
                        onChange={(e) => setYearVal(e.target.value)}
                      >
                        <option value="1">Year 1 (Freshmen)</option>
                        <option value="2">Year 2 (Sophomores)</option>
                        <option value="3">Year 3 (Juniors)</option>
                        <option value="4">Year 4 (Seniors)</option>
                        <option value="5">Year 5</option>
                        <option value="6">Year 6</option>
                      </Select>
                    </div>
                  )}

                  {/* Dynamic Extra Field: Hostel */}
                  {audienceType === "hostel" && (
                    <div>
                      <label className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                        Select Assigned Hostel
                      </label>
                      <Select
                        value={hostelVal}
                        onChange={(e) => setHostelVal(e.target.value)}
                      >
                        {hostels.map((h) => (
                          <option key={h._id} value={h._id}>
                            {h.name} ({h.gender} • {h.type})
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Dynamic Extra Field: Group Status */}
                  {audienceType === "group_status" && (
                    <div>
                      <label className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                        Group Status
                      </label>
                      <Select
                        value={groupStatusVal}
                        onChange={(e) => setGroupStatusVal(e.target.value)}
                      >
                        <option value="forming">Forming Groups</option>
                        <option value="complete">Complete Groups</option>
                        <option value="locked">Locked Groups</option>
                        <option value="none">Students With No Group</option>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Preview Box */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePreview}
                      disabled={previewing}
                      className="text-xs py-1 h-auto"
                    >
                      {previewing ? "Calculating..." : " Preview Recipients"}
                    </Button>

                    {preview && (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="teal" size="sm">
                          {preview.count} {preview.count === 1 ? "student" : "students"}
                        </Badge>
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          ({preview.audienceLabel})
                        </span>
                      </div>
                    )}

                    {previewError && (
                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        Warning: {previewError}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    Max: 5,000
                  </span>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end">
                <Button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
                >
                  <span>Send Announcement</span>
                  <span className="ml-1.5">&rarr;</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* Announcements History Card & Table */}
          <Card className="lg:col-span-7 overflow-hidden">
            <div className="border-b border-[var(--border)] bg-[var(--muted)]/40 p-4 sm:px-6 sm:py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[var(--foreground)]">Announcement History</h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Showing {history.length} of {historyTotal} announcements dispatched
                </p>
              </div>
            </div>

            {loadingHistory ? (
              <TableSkeleton rows={6} columns={6} />
            ) : historyError ? (
              <div className="p-8 text-center space-y-3">
                <Alert variant="danger">{historyError}</Alert>
                <Button variant="outline" size="sm" onClick={fetchHistory}>
                  Try again
                </Button>
              </div>
            ) : history.length === 0 ? (
              <div className="p-12 text-center text-sm text-[var(--muted-foreground)]">
                No announcements have been broadcast yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title & Details</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead className="text-center">Sent</TableHead>
                      <TableHead>Read Rate</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => {
                      const readRate =
                        item.recipientCount > 0
                          ? Math.round((item.readCount / item.recipientCount) * 100)
                          : 0;

                      return (
                        <TableRow key={item._id}>
                          <TableCell className="font-semibold text-[var(--foreground)] max-w-[200px]">
                            <div className="truncate">{item.title}</div>
                            {item.link && (
                              <span className="block text-[11px] font-normal text-brand-600 dark:text-brand-400 truncate mt-0.5">
                                Link: {item.link}
                              </span>
                            )}
                            <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5 font-normal">
                              {new Date(item.createdAt).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-[var(--muted-foreground)] text-xs font-medium">
                            {item.audienceLabel}
                          </TableCell>
                          <TableCell className="text-center font-bold text-[var(--foreground)]">
                            {item.recipientCount}
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-[var(--foreground)]">{item.readCount}</span>
                              <span className="text-[11px] text-[var(--muted-foreground)]">{readRate}%</span>
                            </div>
                            <ProgressBar value={readRate} max={100} size="sm" tone={readRate > 50 ? "teal" : "brand"} />
                          </TableCell>
                          <TableCell className="text-center">
                            {item.status === "withdrawn" ? (
                              <Badge variant="default" size="sm">
                                Withdrawn
                              </Badge>
                            ) : (
                              <Badge variant="teal" size="sm">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setViewItem(item)}
                                className="text-xs py-1 px-2 h-auto"
                              >
                                View
                              </Button>
                              {item.status !== "withdrawn" && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setWithdrawItem(item)}
                                  className="text-xs py-1 px-2 h-auto text-rose-600 hover:text-rose-700"
                                >
                                  Withdraw
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* History Pagination */}
            {historyTotalPages > 1 && (
              <div className="p-4 border-t border-[var(--border)]">
                <Pagination
                  currentPage={historyPage}
                  totalPages={historyTotalPages}
                  onPageChange={(p) => setHistoryPage(p)}
                />
              </div>
            )}
          </Card>
        </div>

        {/* Confirmation Modal for Send Announcement */}
        <Modal
          isOpen={confirmSendOpen}
          onClose={() => !sending && setConfirmSendOpen(false)}
          title="Confirm Broadcast Dispatch"
          description="High-priority broadcast sent directly to matching student notifications."
          maxWidth="max-w-lg"
        >
          <div className="space-y-3 text-xs sm:text-sm text-[var(--foreground)]">
            <div className="rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 p-3 space-y-1.5">
              <div>
                <span className="font-bold text-[var(--foreground)]">Target Cohort:</span>{" "}
                <span className="font-semibold text-purple-900 dark:text-purple-200">
                  {preview?.audienceLabel || "Selected Audience"}
                </span>
              </div>
              <div>
                <span className="font-bold text-[var(--foreground)]">Recipients Count:</span>{" "}
                <Badge variant="purple" size="sm">
                  {preview?.count ?? "Will be resolved"} students
                </Badge>
              </div>
            </div>

            <div>
              <span className="font-bold text-[var(--foreground)] block mb-0.5">Title:</span>
              <p className="rounded-xl bg-[var(--muted)]/50 p-2.5 font-medium text-[var(--foreground)] border border-[var(--border)]">
                {title}
              </p>
            </div>

            <div>
              <span className="font-bold text-[var(--foreground)] block mb-0.5">Message:</span>
              <p className="rounded-xl bg-[var(--muted)]/50 p-2.5 text-[var(--foreground)] border border-[var(--border)] whitespace-pre-wrap">
                {message}
              </p>
            </div>

            {getEffectiveLink() && (
              <div>
                <span className="font-bold text-[var(--foreground)]">Action Link:</span>{" "}
                <code className="text-brand-600 dark:text-brand-400 text-xs">{getEffectiveLink()}</code>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmSendOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSend}
              disabled={sending}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
            >
              {sending ? "Broadcasting..." : "Confirm & Send"}
            </Button>
          </div>
        </Modal>

        {/* View Details Modal */}
        {viewItem && (
          <Modal
            isOpen={Boolean(viewItem)}
            onClose={() => setViewItem(null)}
            title="Announcement Details"
            maxWidth="max-w-lg"
          >
            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <span className="text-[var(--muted-foreground)] text-xs font-bold uppercase tracking-wider block">
                  Title
                </span>
                <span className="text-[var(--foreground)] font-bold text-base mt-0.5 block">
                  {viewItem.title}
                </span>
              </div>

              <div>
                <span className="text-[var(--muted-foreground)] text-xs font-bold uppercase tracking-wider block">
                  Message
                </span>
                <p className="mt-1 rounded-xl bg-[var(--muted)]/50 p-3 text-[var(--foreground)] border border-[var(--border)] leading-relaxed whitespace-pre-wrap">
                  {viewItem.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl bg-[var(--muted)]/40 p-3 border border-[var(--border)]">
                  <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase">Target Audience</span>
                  <p className="font-semibold text-[var(--foreground)] mt-0.5">{viewItem.audienceLabel}</p>
                </div>
                <div className="rounded-xl bg-[var(--muted)]/40 p-3 border border-[var(--border)]">
                  <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase">Deliveries</span>
                  <p className="font-semibold text-[var(--foreground)] mt-0.5">
                    {viewItem.recipientCount} recipients • {viewItem.readCount} read
                  </p>
                </div>
              </div>

              {viewItem.link && (
                <div>
                  <span className="text-[var(--muted-foreground)] text-xs font-bold uppercase tracking-wider block">
                    Action Link
                  </span>
                  <code className="text-brand-600 dark:text-brand-400 text-xs block mt-0.5">{viewItem.link}</code>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewItem(null)}
              >
                Close
              </Button>
            </div>
          </Modal>
        )}

        {/* Confirmation Modal for Withdraw Announcement */}
        <ConfirmDialog
          isOpen={Boolean(withdrawItem)}
          title="Withdraw Announcement?"
          message="Withdrawing this announcement will mark it as withdrawn and permanently delete all delivered copies from every recipient student's notification center."
          confirmLabel={withdrawing ? "Withdrawing..." : "Yes, Withdraw"}
          isDestructive={true}
          onConfirm={handleConfirmWithdraw}
          onCancel={() => setWithdrawItem(null)}
        />
      </div>
    </PageContainer>
  );
}
