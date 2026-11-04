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
  ConfirmDialog,
  EmptyState,
  Alert,
  ProgressBar,
  Select,
} from "@/components/ui";
import { AdminPageHeader, FilterBar } from "@/components/admin";

export default function AdminHostelsPage() {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchHostels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 12,
        sortBy: "code",
        sortOrder: "asc",
      };
      if (search.trim()) params.search = search.trim();
      if (genderFilter) params.gender = genderFilter;

      const res = await axios.get("/api/hostels", { params });
      if (res.data?.success) {
        setHostels(res.data.data.hostels || []);
        setPagination(res.data.data.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 });
      }
    } catch (err) {
      console.error("Failed to load hostels:", err);
      setError(err.response?.data?.message || "Failed to load hostels.");
    } finally {
      setLoading(false);
    }
  }, [page, search, genderFilter]);

  useEffect(() => {
    fetchHostels();
  }, [fetchHostels]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/hostels/${deleteTarget._id}`);
      setSuccessMsg(`Hostel "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      fetchHostels();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete hostel.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const getGenderBadge = (gender) => {
    switch (gender) {
      case "boys":
        return <Badge variant="boys">Boys</Badge>;
      case "girls":
        return <Badge variant="girls">Girls</Badge>;
      case "mixed":
        return <Badge variant="mixed">Mixed</Badge>;
      default:
        return <Badge>{gender}</Badge>;
    }
  };

  const hasActiveFilters = Boolean(search || genderFilter);

  const handleClearFilters = () => {
    setSearch("");
    setGenderFilter("");
    setPage(1);
  };

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      {/* Header */}
      <AdminPageHeader
        title="Hostel Management"
        description="Manage residential blocks, capacity allocations, room configurations, and student eligibility."
        breadcrumbs={[{ label: "Hostels" }]}
        actions={
          <Link href="/admin/hostels/new">
            <Button variant="primary" size="sm">
              + Add Hostel
            </Button>
          </Link>
        }
      />

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6">
          <Alert variant="success" title="Success" onClose={() => setSuccessMsg(null)}>
            {successMsg}
          </Alert>
        </div>
      )}
      {error && (
        <div className="mb-6">
          <Alert variant="danger" title="Error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {/* Search & Filters */}
      <FilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search by name, code (e.g. BH1), or location..."
        hasActiveFilters={hasActiveFilters}
        onClear={handleClearFilters}
      >
        <div className="w-full sm:w-44">
          <Select
            value={genderFilter}
            onChange={(val) => {
              setGenderFilter(val);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Genders" },
              { value: "boys", label: "Boys Only" },
              { value: "girls", label: "Girls Only" },
              { value: "mixed", label: "Mixed / Co-ed" },
            ]}
          />
        </div>
      </FilterBar>

      {/* Hostels Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-60 animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          ))}
        </div>
      ) : hostels.length === 0 ? (
        <Card className="p-12 text-center">
          <EmptyState
            title="No hostels found"
            description={
              hasActiveFilters
                ? "No hostels match your current search or filter criteria."
                : "Get started by adding your first residential hostel block."
            }
            action={
              <Link href="/admin/hostels/new">
                <Button variant="primary" size="sm">
                  Add First Hostel
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hostels.map((hostel) => {
            const occupancyPct =
              hostel.totalCapacity > 0
                ? Math.round((hostel.occupiedBeds / hostel.totalCapacity) * 100)
                : 0;

            const progressColor =
              occupancyPct >= 100 ? "danger" : occupancyPct > 80 ? "warning" : "brand";

            return (
              <Card
                key={hostel._id}
                className="flex flex-col justify-between p-5 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all group"
              >
                <div>
                  {/* Top bar: Code & Gender Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-12 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 font-mono text-xs font-black text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                        {hostel.code}
                      </span>
                      {getGenderBadge(hostel.gender)}
                    </div>
                    <Badge variant={hostel.isActive ? "success" : "neutral"} size="sm">
                      {hostel.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Title & Location */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-heading">
                    <Link href={`/admin/hostels/${hostel._id}`}>{hostel.name}</Link>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {hostel.location || `${hostel.totalFloors} habitable floors`}
                  </p>

                  {/* Capacity & Occupancy Bar */}
                  <div className="mt-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Occupancy</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {hostel.occupiedBeds} / {hostel.totalCapacity} beds ({occupancyPct}%)
                      </span>
                    </div>

                    <ProgressBar
                      value={occupancyPct}
                      max={100}
                      color={progressColor}
                      size="sm"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span>Floors: <strong className="text-slate-700 dark:text-slate-300">{hostel.totalFloors}</strong></span>
                      <span>Rooms: <strong className="text-slate-700 dark:text-slate-300">{hostel.totalRooms}</strong></span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        {hostel.availableBeds} free beds
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Link
                    href={`/admin/hostels/${hostel._id}`}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
                  >
                    <span>View Rooms</span>
                    <span>&rarr;</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link href={`/admin/hostels/${hostel._id}/edit`}>
                      <Button variant="secondary" size="xs">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setDeleteTarget(hostel)}
                      className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Delete Hostel: ${deleteTarget?.name} (${deleteTarget?.code})?`}
        message={
          deleteTarget?.occupiedBeds > 0
            ? `Cannot delete this hostel: It currently has ${deleteTarget.occupiedBeds} occupied bed(s). You must unassign all occupants before deleting.`
            : `Are you sure you want to delete ${deleteTarget?.name}? This will permanently remove the hostel and all ${deleteTarget?.totalRooms || 0} associated rooms.`
        }
        confirmText={deleteTarget?.occupiedBeds > 0 ? "Understood" : "Delete Hostel"}
        variant="danger"
        isLoading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteTarget?.occupiedBeds > 0 ? () => setDeleteTarget(null) : handleDelete}
      />
    </PageContainer>
  );
}
