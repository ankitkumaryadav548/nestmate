"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";

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

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin" className="hover:text-indigo-600">Admin</Link>
            <span>/</span>
            <span className="text-slate-800">Hostels</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Hostel Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage residential blocks, capacity allocations, and student eligibility.
          </p>
        </div>
        <div>
          <Link
            href="/admin/hostels/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
          >
            + Add Hostel
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-4">
          <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {/* Search & Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Search by name, code (e.g. BH1), or campus location..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-3 pr-8 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="">All Genders</option>
              <option value="boys">Boys Only</option>
              <option value="girls">Girls Only</option>
              <option value="mixed">Mixed / Co-ed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hostels Grid / Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      ) : hostels.length === 0 ? (
        <EmptyState
          title="No hostels found"
          message={
            search || genderFilter
              ? "No hostels match your current search or filter criteria."
              : "Get started by adding your first residential hostel block."
          }
          actionLabel="Add Hostel"
          onAction={() => (window.location.href = "/admin/hostels/new")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hostels.map((hostel) => {
            const occupancyPct =
              hostel.totalCapacity > 0
                ? Math.round((hostel.occupiedBeds / hostel.totalCapacity) * 100)
                : 0;

            return (
              <div
                key={hostel._id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div>
                  {/* Top bar: Code & Gender Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-12 items-center justify-center rounded-lg bg-indigo-50 font-mono text-xs font-black text-indigo-700 border border-indigo-200">
                        {hostel.code}
                      </span>
                      {getGenderBadge(hostel.gender)}
                    </div>
                    <Badge variant={hostel.isActive ? "success" : "neutral"} size="sm">
                      {hostel.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Title & Location */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    <Link href={`/admin/hostels/${hostel._id}`}>{hostel.name}</Link>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {hostel.location || `${hostel.totalFloors} habitable floors`}
                  </p>

                  {/* Capacity & Occupancy Bar */}
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-600">Occupancy</span>
                      <span className="font-bold text-slate-900">
                        {hostel.occupiedBeds} / {hostel.totalCapacity} beds ({occupancyPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full transition-all duration-300 ${
                          occupancyPct >= 100
                            ? "bg-rose-500"
                            : occupancyPct > 80
                            ? "bg-amber-500"
                            : "bg-indigo-600"
                        }`}
                        style={{ width: `${Math.min(100, occupancyPct)}%` }}
                      />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Floors: {hostel.totalFloors}</span>
                      <span>Rooms: {hostel.totalRooms}</span>
                      <span className="font-semibold text-emerald-600">
                        {hostel.availableBeds} free beds
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/admin/hostels/${hostel._id}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View Rooms &rarr;
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/hostels/${hostel._id}/edit`}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(hostel)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={(p) => setPage(p)}
      />

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
        confirmVariant="danger"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteTarget?.occupiedBeds > 0 ? () => setDeleteTarget(null) : handleDelete}
      />
    </div>
  );
}
