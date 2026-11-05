"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui";
import {
  AdminPageHeader,
  FilterBar,
  DataTable,
  StatusBadge,
} from "@/components/admin";
import RoomModal from "@/components/rooms/RoomModal";
import BulkRoomModal from "@/components/rooms/BulkRoomModal";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function AdminRoomsPage() {
  useDocumentTitle("Room Inventory", true);
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

  const hasActiveFilters = Boolean(
    hostelFilter || floorFilter !== "" || roomTypeFilter || statusFilter || availableOnly
  );

  const handleClearFilters = () => {
    setHostelFilter("");
    setFloorFilter("");
    setRoomTypeFilter("");
    setStatusFilter("");
    setAvailableOnly(false);
    setPage(1);
  };

  const hostelOptions = useMemo(() => {
    return [
      { value: "", label: "All Hostels" },
      ...hostels.map((h) => ({
        value: h._id,
        label: `${h.code} - ${h.name}`,
      })),
    ];
  }, [hostels]);

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      {/* Header */}
      <AdminPageHeader
        title="Room Inventory"
        description="Comprehensive directory of all residential rooms, occupancy status, AC configurations, and maintenance."
        breadcrumbs={[{ label: "Rooms" }]}
        actions={
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
              variant="primary"
              onClick={() => {
                setSelectedRoomToEdit(null);
                setIsSingleRoomModalOpen(true);
              }}
            >
              + Add Room
            </Button>
          </div>
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
          <Alert
            variant="danger"
            title="Error"
            onClose={() => setError(null)}
            action={
              <Button variant="outline" size="sm" onClick={fetchRooms}>
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
        hasActiveFilters={hasActiveFilters}
        onClear={handleClearFilters}
      >
        <div className="w-full sm:w-44">
          <Select
            value={hostelFilter}
            onChange={(val) => {
              setHostelFilter(val);
              setPage(1);
            }}
            options={hostelOptions}
          />
        </div>

        <div className="w-full sm:w-36">
          <Select
            value={floorFilter}
            onChange={(val) => {
              setFloorFilter(val);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Floors" },
              { value: "0", label: "Floor 0 (Ground)" },
              { value: "1", label: "Floor 1" },
              { value: "2", label: "Floor 2" },
              { value: "3", label: "Floor 3" },
              { value: "4", label: "Floor 4" },
              { value: "5", label: "Floor 5" },
            ]}
          />
        </div>

        <div className="w-full sm:w-36">
          <Select
            value={roomTypeFilter}
            onChange={(val) => {
              setRoomTypeFilter(val);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Types" },
              { value: "AC", label: "AC" },
              { value: "Non-AC", label: "Non-AC" },
            ]}
          />
        </div>

        <div className="w-full sm:w-36">
          <Select
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Statuses" },
              { value: "available", label: "Available" },
              { value: "claimed", label: "Claimed" },
              { value: "full", label: "Full" },
              { value: "maintenance", label: "Maintenance" },
            ]}
          />
        </div>

        {/* Free Beds Only Toggle */}
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => {
              setAvailableOnly(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Free Beds Only</span>
        </label>
      </FilterBar>

      {/* Rooms DataTable */}
      <DataTable
        isLoading={loading}
        isEmpty={!error && rooms.length === 0}
        emptyTitle="No rooms found"
        emptyDescription={
          hasActiveFilters
            ? "No rooms matched your selected filter parameters."
            : "No rooms configured yet. Add rooms individually or in bulk."
        }
        emptyAction={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedRoomToEdit(null);
              setIsSingleRoomModalOpen(true);
            }}
          >
            + Add First Room
          </Button>
        }
        pagination={{
          currentPage: pagination.page,
          totalPages: pagination.totalPages,
          totalItems: pagination.total,
          onPageChange: (p) => setPage(p),
        }}
        skeletonRows={8}
        skeletonCols={9}
      >
        <TableHeader>
          <TableRow>
            <TableHead>Room #</TableHead>
            <TableHead>Hostel</TableHead>
            <TableHead>Floor</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Occupancy</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.map((room) => {
            const isFull = room.currentOccupancy >= room.capacity;
            const derivedStatus =
              room.status === "maintenance"
                ? "maintenance"
                : room.status === "claimed"
                ? "claimed"
                : isFull
                ? "full"
                : "available";

            const occupancyPct =
              room.capacity > 0
                ? Math.round((room.currentOccupancy / room.capacity) * 100)
                : 0;

            return (
              <TableRow key={room._id}>
                {/* Room # */}
                <TableCell>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    #{room.roomNumber}
                  </span>
                </TableCell>

                {/* Hostel */}
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {room.hostel?.code || "â€”"}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[120px]">
                      {room.hostel?.name}
                    </span>
                  </div>
                </TableCell>

                {/* Floor */}
                <TableCell>
                  <span className="text-slate-600 dark:text-slate-400 font-mono">
                    Floor {room.floor}
                  </span>
                </TableCell>

                {/* Type */}
                <TableCell>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold border ${
                      room.roomType === "AC"
                        ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {room.roomType}
                  </span>
                </TableCell>

                {/* Capacity */}
                <TableCell>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {room.capacity} {room.capacity === 1 ? "bed" : "beds"}
                  </span>
                </TableCell>

                {/* Occupancy with mini progress bar */}
                <TableCell>
                  <div className="w-28 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {room.currentOccupancy} / {room.capacity}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">
                        {room.capacity - room.currentOccupancy} free
                      </span>
                    </div>
                    <ProgressBar
                      value={occupancyPct}
                      max={100}
                      color={occupancyPct >= 100 ? "danger" : occupancyPct > 0 ? "brand" : "neutral"}
                      size="xs"
                    />
                  </div>
                </TableCell>

                {/* Status Badge */}
                <TableCell>
                  <StatusBadge type="room" status={derivedStatus} />
                </TableCell>

                {/* Notes */}
                <TableCell>
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] truncate max-w-[140px] block">
                    {room.notes || "â€”"}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setSelectedRoomToEdit(room);
                        setIsSingleRoomModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setDeleteTarget(room)}
                      className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </DataTable>

      {/* Single Room Modal */}
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

      {/* Bulk Room Modal */}
      <BulkRoomModal
        isOpen={isBulkRoomModalOpen}
        onClose={() => setIsBulkRoomModalOpen(false)}
        onSuccess={(summary, msg) => {
          setSuccessMsg(msg);
          fetchRooms();
        }}
        hostelList={hostels}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Delete Room #${deleteTarget?.roomNumber}?`}
        message={
          deleteTarget?.currentOccupancy > 0
            ? `Cannot delete room #${deleteTarget.roomNumber}: It currently has ${deleteTarget.currentOccupancy} occupant(s). You must unassign occupants before deleting.`
            : `Are you sure you want to delete room #${deleteTarget?.roomNumber}? This cannot be undone.`
        }
        confirmText={deleteTarget?.currentOccupancy > 0 ? "Understood" : "Delete Room"}
        variant="danger"
        isLoading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={
          deleteTarget?.currentOccupancy > 0
            ? () => setDeleteTarget(null)
            : handleDelete
        }
      />
    </PageContainer>
  );
}
