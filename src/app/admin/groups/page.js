"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [targetSize, setTargetSize] = useState("");
  const [gender, setGender] = useState("");

  const fetchGroups = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "15");
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (targetSize) params.set("targetSize", targetSize);
      if (gender) params.set("gender", gender);

      const res = await axios.get(`/api/admin/groups?${params.toString()}`);
      if (res.data?.success) {
        setGroups(res.data.data.groups || []);
        setPagination({
          page: res.data.data.page || 1,
          limit: res.data.data.limit || 15,
          total: res.data.data.total || 0,
          totalPages: res.data.data.totalPages || 1,
        });
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
      setError(err.response?.data?.message || "Failed to load roommate groups");
    } finally {
      setLoading(false);
    }
  }, [search, status, targetSize, gender]);

  useEffect(() => {
    fetchGroups(1);
  }, [fetchGroups]);

  const handlePageChange = (newPage) => {
    fetchGroups(newPage);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    setTargetSize("");
    setGender("");
  };

  const getStatusBadge = (grpStatus) => {
    switch (grpStatus) {
      case "forming":
        return <Badge variant="info">Forming</Badge>;
      case "complete":
        return <Badge variant="success">Complete</Badge>;
      case "locked":
        return <Badge variant="purple">Locked</Badge>;
      case "disbanded":
        return <Badge variant="neutral">Disbanded</Badge>;
      default:
        return <Badge variant="neutral">{grpStatus}</Badge>;
    }
  };

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return "text-slate-400";
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-200";
    if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-rose-700 bg-rose-50 border-rose-200";
  };

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              &larr; Admin Console
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Roommate Groups
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor, inspect compatibility diagnostics, and manage student roommate clusters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Total Groups: {pagination.total}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          <div className="lg:col-span-2">
            <Input
              label="Search Members"
              placeholder="Search by student name or reg no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "", label: "All Statuses" },
                { value: "forming", label: "Forming" },
                { value: "complete", label: "Complete" },
                { value: "locked", label: "Locked" },
                { value: "disbanded", label: "Disbanded" },
              ]}
            />
          </div>

          <div>
            <Select
              label="Target Size"
              value={targetSize}
              onChange={(e) => setTargetSize(e.target.value)}
              options={[
                { value: "", label: "All Sizes" },
                { value: "2", label: "2-bed Room" },
                { value: "3", label: "3-bed Room" },
                { value: "4", label: "4-bed Room" },
              ]}
            />
          </div>

          <div>
            <Select
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              options={[
                { value: "", label: "All Genders" },
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
        </div>

        {(search || status || targetSize || gender) && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
            <p className="mt-3 text-xs font-semibold text-slate-500">Loading roommate groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No roommate groups found"
              description="No groups match your current filter parameters or none have been formed yet."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Group / Leader</th>
                  <th className="py-3.5 px-4">Members</th>
                  <th className="py-3.5 px-4">Size & Gender</th>
                  <th className="py-3.5 px-4">Avg Compatibility</th>
                  <th className="py-3.5 px-4">Lowest Pair</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {groups.map((group) => {
                  const filledCount = group.members?.length || 0;
                  const leaderId = group.leader?._id?.toString() || group.leader?.toString();

                  return (
                    <tr key={group._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Group & Leader */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 font-bold text-indigo-700 text-xs border border-indigo-100">
                            👥
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{group.leader?.name || "Unknown Leader"}</span>
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                                Leader
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {group.leader?.registrationNumber || group.leader?.email || "ID: " + group._id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Members */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-900">
                            {filledCount} of {group.targetSize} beds filled
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {group.members?.map((m, idx) => (
                              <span
                                key={m.user?._id || idx}
                                className="inline-block bg-slate-100 text-slate-700 rounded px-1.5 py-0.5 text-[10px]"
                                title={m.user?.course ? `${m.user.name} (${m.user.course})` : m.user?.name}
                              >
                                {m.user?.name?.split(" ")[0] || "Student"}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Target Size & Gender */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-semibold text-slate-900">
                            {group.targetSize}-Bed Room
                          </span>
                          <span className="inline-flex capitalize text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            {group.gender}
                          </span>
                        </div>
                      </td>

                      {/* Average Score */}
                      <td className="py-3.5 px-4">
                        {group.averageScore !== null && group.averageScore !== undefined ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${getScoreColor(
                              group.averageScore
                            )}`}
                          >
                            {group.averageScore}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">— (1 member)</span>
                        )}
                      </td>

                      {/* Lowest Pair */}
                      <td className="py-3.5 px-4">
                        {group.lowestPairScore !== null && group.lowestPairScore !== undefined ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${getScoreColor(
                              group.lowestPairScore
                            )}`}
                          >
                            {group.lowestPairScore}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">{getStatusBadge(group.status)}</td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(group.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/groups/${group._id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs"
                        >
                          View &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
