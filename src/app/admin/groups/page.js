"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import {
  PageContainer,
  Card,
  Badge,
  Button,
  Pagination,
  EmptyState,
  Alert,
  Avatar,
  Select,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  ScoreRing,
} from "@/components/ui";
import {
  AdminPageHeader,
  FilterBar,
  DataTable,
  StatusBadge,
} from "@/components/admin";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function AdminGroupsPage() {
  useDocumentTitle("Roommate Groups", true);
  const [groups, setGroups] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

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

  useEffect(() => {
    axios
      .get("/api/admin/stats")
      .then((res) => {
        if (res.data?.success) {
          setStats(res.data.data.totals?.groups || null);
        }
      })
      .catch(() => {});
  }, []);

  const handlePageChange = (newPage) => {
    fetchGroups(newPage);
  };

  const hasActiveFilters = Boolean(search || status || targetSize || gender);

  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    setTargetSize("");
    setGender("");
    setPage(1);
  };

  const getGroupStatusBadge = (grpStatus) => {
    switch (grpStatus) {
      case "forming":
        return <Badge variant="warning" size="sm" dot>Forming</Badge>;
      case "complete":
        return <Badge variant="success" size="sm" dot>Complete</Badge>;
      case "locked":
        return <Badge variant="brand" size="sm" dot>Locked</Badge>;
      case "disbanded":
        return <Badge variant="neutral" size="sm">Disbanded</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{grpStatus}</Badge>;
    }
  };

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      {/* Header */}
      <AdminPageHeader
        title="Roommate Groups"
        description="Monitor student-formed roommate clusters, audit compatibility breakdown, and override assignments."
        breadcrumbs={[{ label: "Groups" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand" size="md">
              Total Groups: {pagination.total}
            </Badge>
            {stats && (
              <Badge variant="success" size="md">
                In Groups: {stats.studentsInGroups || 0}
              </Badge>
            )}
          </div>
        }
      />

      {/* Error state */}
      {error && (
        <div className="mb-6">
          <Alert
            variant="danger"
            title="Error"
            onClose={() => setError(null)}
            action={
              <Button variant="outline" size="sm" onClick={() => fetchGroups(pagination.page)}>
                Try again
              </Button>
            }
          >
            {error}
          </Alert>
        </div>
      )}

      {/* Filter Toolbar */}
      <FilterBar
        search={search}
        onSearchChange={(val) => setSearch(val)}
        searchPlaceholder="Search by student name or registration number..."
        hasActiveFilters={hasActiveFilters}
        onClear={handleResetFilters}
      >
        <div className="w-full sm:w-36">
          <Select
            value={status}
            onChange={(val) => setStatus(val)}
            placeholder="Status"
            options={[
              { value: "", label: "All Statuses" },
              { value: "forming", label: "Forming" },
              { value: "complete", label: "Complete" },
              { value: "locked", label: "Locked" },
              { value: "disbanded", label: "Disbanded" },
            ]}
          />
        </div>

        <div className="w-full sm:w-36">
          <Select
            value={targetSize}
            onChange={(val) => setTargetSize(val)}
            placeholder="Target Size"
            options={[
              { value: "", label: "All Sizes" },
              { value: "1", label: "1-Bed (Single)" },
              { value: "2", label: "2-Bed Room" },
              { value: "3", label: "3-Bed Room" },
              { value: "4", label: "4-Bed Room" },
            ]}
          />
        </div>

        <div className="w-full sm:w-36">
          <Select
            value={gender}
            onChange={(val) => setGender(val)}
            placeholder="Gender"
            options={[
              { value: "", label: "All Genders" },
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>
      </FilterBar>

      {/* Groups DataTable */}
      <DataTable
        isLoading={loading}
        isEmpty={!error && groups.length === 0}
        emptyTitle="No roommate groups found"
        emptyDescription="No groups match your current filter parameters or none have been formed yet."
        emptyAction={
          <Button variant="secondary" size="sm" onClick={handleResetFilters}>
            Clear Filters
          </Button>
        }
        pagination={{
          currentPage: pagination.page,
          totalPages: pagination.totalPages,
          totalItems: pagination.total,
          onPageChange: handlePageChange,
        }}
        skeletonRows={8}
        skeletonCols={8}
      >
        <TableHeader>
          <TableRow>
            <TableHead>Group / Leader</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Size &amp; Gender</TableHead>
            <TableHead>Avg Compatibility</TableHead>
            <TableHead>Lowest Pair</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((grp) => {
            const memberCount = grp.members?.length || 0;
            const target = grp.targetSize || 2;
            const leaderName = grp.leader?.name || "Unassigned";

            return (
              <TableRow key={grp._id}>
                {/* Group / Leader */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar name={leaderName} size="sm" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        {grp.name || `Group #${grp._id.slice(-4)}`}
                      </span>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono block">
                        Leader: {leaderName}
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Members Count & Preview */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                      <span>{memberCount}</span>
                      <span className="text-slate-400">/</span>
                      <span>{target} members</span>
                    </div>
                    {/* Seat Dots */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: target }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 w-2 rounded-full ${
                            i < memberCount
                              ? "bg-indigo-600 dark:bg-indigo-400"
                              : "border border-dashed border-slate-300 dark:border-slate-600 bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </TableCell>

                {/* Size & Gender */}
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="neutral" size="sm">
                      {target}-Bed
                    </Badge>
                    <Badge
                      variant={grp.gender === "male" ? "boys" : grp.gender === "female" ? "girls" : "neutral"}
                      size="sm"
                    >
                      {grp.gender}
                    </Badge>
                  </div>
                </TableCell>

                {/* Avg Compatibility */}
                <TableCell>
                  {grp.averageScore !== undefined && grp.averageScore !== null ? (
                    <StatusBadge type="score" score={grp.averageScore} size="sm" />
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </TableCell>

                {/* Lowest Pair */}
                <TableCell>
                  {grp.lowestScore !== undefined && grp.lowestScore !== null ? (
                    <StatusBadge type="score" score={grp.lowestScore} size="sm" />
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  {getGroupStatusBadge(grp.status)}
                </TableCell>

                {/* Created Date */}
                <TableCell>
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-mono">
                    {grp.createdAt ? new Date(grp.createdAt).toLocaleDateString() : "—"}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <Link href={`/admin/groups/${grp._id}`}>
                    <Button variant="ghost" size="xs" className="text-indigo-600 dark:text-indigo-400">
                      Manage &rarr;
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </DataTable>
    </PageContainer>
  );
}
