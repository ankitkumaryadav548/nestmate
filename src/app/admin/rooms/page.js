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
import RoomModal from "@/components/rooms/RoomModal";
import BulkRoomModal from "@/components/rooms/BulkRoomModal";

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters & Pagination
  const [hostelFilter, setHostelFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });

  // Modals state
  const [isSingleRoomModalOpen, setIsSingleRoomModalOpen] = useState(false);
  const [isBulkRoomModalOpen, setIsBulkRoomModalOpen] = useState(false);
  const [selectedRoomToEdit, setSelectedRoomToEdit] = useState(null);

  // Deletion
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load hostels for dropdown filter & modals
  useEffect(() => {
    async function loadHostelOptions() {
      try {
        const res = await axios.get("/api/hostels", { params: { limit: 100 } });
        if (res.data?.success) {
          setHostels(res.data.data.hostels || []);
        }
      } catch (err) {
        console.error("Failed to load hostel filter options:", err);
      }
    }
    loadHostelOptions();
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 25,
        sortBy: "roomNumber",
        sortOrder: "asc",
      };
      if (hostelFilter) params.hostelId = hostelFilter;
      if (floorFilter !== "") params.floor = floorFilter;
      if (roomTypeFilter) params.roomType = roomTypeFilter;
      if (statusFilter) params.status = statusFilter;
      if (availableOnly) params.availableOnly = "true";

      const res = await axios.get("/api/rooms", { params });
      if (res.data?.success) {
        setRooms(res.data.data.rooms || []);
        setPagination(res.data.data.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 });
      }
    } catch (err) {
      console.error("Failed to load rooms:", err);
      setError(err.response?.data?.message || "Failed to load rooms.");
    } finally {
      setLoading(false);
    }
  }, [page, hostelFilter, floorFilter, roomTypeFilter, statusFilter, availableOnly]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/rooms/${deleteTarget._id}`);
      setSuccessMsg(`Room #${deleteTarget.roomNumber} deleted successfully.`);
      setDeleteTarget(null);
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete room.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status, currentOccupancy, capacity) => {
    if (status === "maintenance") {
      return <Badge variant="warning" size="sm">Maintenance</Badge>;
    }
    if (currentOccupancy >= capacity) {
      return <Badge variant="danger" size="sm">Full</Badge>;
    }
    return <Badge variant="success" size="sm">Available</Badge>;
  };

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin" className="hover:text-indigo-600">Admin</Link>
            <span>/</span>
            <span className="text-slate-800">Rooms</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Room Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive directory of all residential rooms across campus buildings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBulkRoomModalOpen(true)}
          >
            + Bulk Add Rooms
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setSelectedRoomToEdit(null);
              setIsSingleRoomModalOpen(true);
            }}
          >
            + Add Room
          </Button>
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

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Hostel Filter */}
          <select
            value={hostelFilter}
            onChange={(e) => {
              setHostelFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
          >
            <option value="">All Hostels</option>
            {hostels.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name} ({h.code})
              </option>
            ))}
          </select>

          {/* Floor Filter */}
          <select
            value={floorFilter}
            onChange={(e) => {
              setFloorFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
          >
            <option value="">All Floors</option>
            {[0, 1, 2, 3, 4, 5, 6].map((fl) => (
              <option key={fl} value={fl}>
                Floor {fl}
              </option>
            ))}
          </select>

          {/* Room Type */}
          <select
            value={roomTypeFilter}
            onChange={(e) => {
              setRoomTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="AC">AC</option>
            <option value="Non-AC">Non-AC</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="full">Full</option>
            <option value="maintenance">Maintenance</option>
          </select>

          {/* Free Beds Only Toggle */}
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => {
                setAvailableOnly(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Free Beds Only</span>
          </label>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title="No rooms found"
              message="No rooms matched your selected filters."
              actionLabel="Add Room"
              onAction={() => {
                setSelectedRoomToEdit(null);
                setIsSingleRoomModalOpen(true);
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Room #</th>
                  <th className="py-3 px-4">Hostel</th>
                  <th className="py-3 px-4">Floor</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Occupancy</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <tr key={room._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{room.roomNumber}
                    </td>
                    <td className="py-3 px-4">
                      {room.hostel ? (
                        <Link
                          href={`/admin/hostels/${room.hostel._id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          {room.hostel.name} ({room.hostel.code})
                        </Link>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">Floor {room.floor}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                          room.roomType === "AC"
                            ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {room.roomType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{room.capacity} beds</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">
                        {room.currentOccupancy} / {room.capacity}
                      </span>
                      <span className="ml-1.5 text-[11px] text-emerald-600 font-medium">
                        ({room.availableBeds} free)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(room.status, room.currentOccupancy, room.capacity)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[150px] truncate">
                      {room.notes || "—"}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoomToEdit(room);
                          setIsSingleRoomModalOpen(true);
                        }}
                        className="font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(room)}
                        className="font-semibold text-rose-500 hover:text-rose-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={(p) => setPage(p)}
      />

      {/* Modals */}
      <RoomModal
        isOpen={isSingleRoomModalOpen}
        onClose={() => {
          setIsSingleRoomModalOpen(false);
          setSelectedRoomToEdit(null);
        }}
        onSuccess={(savedRoom, msg) => {
          setSuccessMsg(msg);
          fetchRooms();
        }}
        hostelList={hostels}
        room={selectedRoomToEdit}
      />

      <BulkRoomModal
        isOpen={isBulkRoomModalOpen}
        onClose={() => setIsBulkRoomModalOpen(false)}
        onSuccess={(summary, msg) => {
          setSuccessMsg(msg);
          fetchRooms();
        }}
        hostelList={hostels}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Delete Room #${deleteTarget?.roomNumber}?`}
        message={
          deleteTarget?.currentOccupancy > 0
            ? `Cannot delete room #${deleteTarget.roomNumber}: It currently has ${deleteTarget.currentOccupancy} occupant(s). You must unassign occupants first.`
            : `Are you sure you want to delete room #${deleteTarget?.roomNumber}? This cannot be undone.`
        }
        confirmText={deleteTarget?.currentOccupancy > 0 ? "Understood" : "Delete Room"}
        confirmVariant="danger"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={
          deleteTarget?.currentOccupancy > 0
            ? () => setDeleteTarget(null)
            : handleDelete
        }
      />
    </div>
  );
}
