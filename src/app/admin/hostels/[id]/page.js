"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RoomModal from "@/components/rooms/RoomModal";
import BulkRoomModal from "@/components/rooms/BulkRoomModal";

export default function HostelDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [hostel, setHostel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modals state
  const [isSingleRoomModalOpen, setIsSingleRoomModalOpen] = useState(false);
  const [isBulkRoomModalOpen, setIsBulkRoomModalOpen] = useState(false);
  const [selectedRoomToEdit, setSelectedRoomToEdit] = useState(null);

  // Room deletion state
  const [deleteRoomTarget, setDeleteRoomTarget] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(false);

  // Filter state for rooms on this page
  const [selectedFloor, setSelectedFloor] = useState("all");
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load hostel details with stats
      const [hostelRes, roomsRes] = await Promise.all([
        axios.get(`/api/hostels/${id}`),
        axios.get("/api/rooms", {
          params: {
            hostelId: id,
            limit: 200, // Fetch up to 200 rooms for this hostel
            sortBy: "roomNumber",
            sortOrder: "asc",
          },
        }),
      ]);

      if (hostelRes.data?.success) {
        setHostel(hostelRes.data.data);
      }
      if (roomsRes.data?.success) {
        setRooms(roomsRes.data.data.rooms || []);
      }
    } catch (err) {
      console.error("Failed to load hostel data:", err);
      setError(err.response?.data?.message || "Failed to load hostel details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadData();
  }, [id, loadData]);

  // Handle room delete
  const handleDeleteRoom = async () => {
    if (!deleteRoomTarget) return;
    setDeletingRoom(true);
    try {
      await axios.delete(`/api/rooms/${deleteRoomTarget._id}`);
      setSuccessMsg(`Room ${deleteRoomTarget.roomNumber} deleted successfully.`);
      setDeleteRoomTarget(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete room.");
      setDeleteRoomTarget(null);
    } finally {
      setDeletingRoom(false);
    }
  };

  // Group rooms by floor
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (selectedFloor !== "all" && r.floor !== Number(selectedFloor)) {
        return false;
      }
      if (roomTypeFilter !== "all" && r.roomType !== roomTypeFilter) {
        return false;
      }
      return true;
    });
  }, [rooms, selectedFloor, roomTypeFilter]);

  const roomsByFloor = useMemo(() => {
    const grouped = {};
    for (const r of filteredRooms) {
      const fl = r.floor;
      if (!grouped[fl]) grouped[fl] = [];
      grouped[fl].push(r);
    }
    // Sort floor keys ascending
    return Object.keys(grouped)
      .sort((a, b) => Number(a) - Number(b))
      .map((fl) => ({
        floor: Number(fl),
        rooms: grouped[fl].sort((a, b) =>
          a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
        ),
      }));
  }, [filteredRooms]);

  const getStatusBadge = (status, currentOccupancy, capacity) => {
    if (status === "maintenance") {
      return <Badge variant="warning" size="sm">Maintenance</Badge>;
    }
    if (currentOccupancy >= capacity) {
      return <Badge variant="danger" size="sm">Full</Badge>;
    }
    return <Badge variant="success" size="sm">Available</Badge>;
  };

  if (loading && !hostel) {
    return (
      <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error && !hostel) {
    return (
      <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <Alert type="error" title="Not Found" message={error} />
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push("/admin/hostels")}>
            &larr; Back to Hostels
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin" className="hover:text-indigo-600">Admin</Link>
            <span>/</span>
            <Link href="/admin/hostels" className="hover:text-indigo-600">Hostels</Link>
            <span>/</span>
            <span className="text-slate-800">{hostel?.code}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {hostel?.name}
            </h1>
            <span className="flex h-7 w-12 items-center justify-center rounded-lg bg-indigo-50 font-mono text-xs font-black text-indigo-700 border border-indigo-200">
              {hostel?.code}
            </span>
            <Badge variant={hostel?.gender === "boys" ? "boys" : hostel?.gender === "girls" ? "girls" : "mixed"}>
              {hostel?.gender}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {hostel?.location || "Campus Residential Block"} • {hostel?.totalFloors} habitable floors
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/admin/hostels/${id}/edit`)}
          >
            Edit Hostel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBulkRoomModalOpen(true)}
          >
            + Add Rooms in Bulk
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

      {/* Stats Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Rooms</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {hostel?.totalRooms || 0}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Bed Capacity</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {hostel?.totalCapacity || 0}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Occupied Beds</span>
          <span className="text-xl font-black text-indigo-600 mt-1 block">
            {hostel?.occupiedBeds || 0}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Available Beds</span>
          <span className="text-xl font-black text-emerald-600 mt-1 block">
            {hostel?.availableBeds || 0}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-slate-500 block">In Maintenance</span>
          <span className="text-xl font-black text-amber-600 mt-1 block">
            {hostel?.maintenanceRooms || 0}
          </span>
        </div>
      </div>

      {/* Facilities & Rules pills */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs mb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Hostel Amenities & Guidelines
        </h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {hostel?.facilities?.length > 0 ? (
            hostel.facilities.map((f) => (
              <span
                key={f}
                className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-700"
              >
                ✓ {f}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400">No specific amenities configured.</span>
          )}
        </div>
        {hostel?.rules && (
          <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="font-semibold text-slate-800">Rules & Policies: </span>
            {hostel.rules}
          </div>
        )}
      </div>

      {/* Rooms Floor Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Rooms Inventory ({filteredRooms.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organized by floor. Click any room card to edit status or capacity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Floor filter */}
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Floors</option>
            {Array.from({ length: hostel?.totalFloors || 4 }, (_, i) => i + 1).map((fl) => (
              <option key={fl} value={fl}>
                Floor {fl}
              </option>
            ))}
          </select>

          {/* Room type filter */}
          <select
            value={roomTypeFilter}
            onChange={(e) => setRoomTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="AC">AC Only</option>
            <option value="Non-AC">Non-AC Only</option>
          </select>
        </div>
      </div>

      {/* Rooms Grouped By Floor */}
      {roomsByFloor.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">No rooms match filter criteria.</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            You can create rooms individually or in bulk.
          </p>
          <div className="flex justify-center gap-2">
            <Button size="sm" onClick={() => setIsBulkRoomModalOpen(true)}>
              + Add Rooms in Bulk
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedRoomToEdit(null);
                setIsSingleRoomModalOpen(true);
              }}
            >
              + Add Single Room
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {roomsByFloor.map(({ floor, rooms: floorRooms }) => (
            <div key={floor} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                    {floor}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Floor {floor} ({floorRooms.length} rooms)
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  {floorRooms.reduce((acc, r) => acc + (r.capacity - r.currentOccupancy), 0)} free beds
                </span>
              </div>

              {/* Room Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {floorRooms.map((room) => {
                  const freeBeds = Math.max(0, room.capacity - room.currentOccupancy);
                  return (
                    <div
                      key={room._id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all group"
                    >
                      <div>
                        {/* Room Number & Status */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="font-mono text-sm font-black text-slate-900 group-hover:text-indigo-600">
                            #{room.roomNumber}
                          </span>
                          {getStatusBadge(room.status, room.currentOccupancy, room.capacity)}
                        </div>

                        {/* Badges: Type & Capacity */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                              room.roomType === "AC"
                                ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {room.roomType}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {room.capacity} Bed{room.capacity > 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Occupancy Indicator */}
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-900">
                            {room.currentOccupancy}
                          </span>{" "}
                          / {room.capacity} occupied
                          <span className="block text-[10px] text-emerald-600 font-medium">
                            {freeBeds} available
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomToEdit(room);
                            setIsSingleRoomModalOpen(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteRoomTarget(room)}
                          className="text-rose-500 hover:text-rose-700 text-[11px]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single Room Modal */}
      <RoomModal
        isOpen={isSingleRoomModalOpen}
        onClose={() => {
          setIsSingleRoomModalOpen(false);
          setSelectedRoomToEdit(null);
        }}
        onSuccess={(savedRoom, msg) => {
          setSuccessMsg(msg);
          loadData();
        }}
        defaultHostelId={id}
        room={selectedRoomToEdit}
      />

      {/* Bulk Room Modal */}
      <BulkRoomModal
        isOpen={isBulkRoomModalOpen}
        onClose={() => setIsBulkRoomModalOpen(false)}
        onSuccess={(summary, msg) => {
          setSuccessMsg(msg);
          loadData();
        }}
        defaultHostelId={id}
      />

      {/* Delete Room Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteRoomTarget}
        title={`Delete Room #${deleteRoomTarget?.roomNumber}?`}
        message={
          deleteRoomTarget?.currentOccupancy > 0
            ? `Cannot delete room #${deleteRoomTarget.roomNumber}: It currently has ${deleteRoomTarget.currentOccupancy} occupant(s). You must unassign occupants first.`
            : `Are you sure you want to delete room #${deleteRoomTarget?.roomNumber}? This cannot be undone.`
        }
        confirmText={deleteRoomTarget?.currentOccupancy > 0 ? "Understood" : "Delete Room"}
        confirmVariant="danger"
        loading={deletingRoom}
        onCancel={() => setDeleteRoomTarget(null)}
        onConfirm={
          deleteRoomTarget?.currentOccupancy > 0
            ? () => setDeleteRoomTarget(null)
            : handleDeleteRoom
        }
      />
    </div>
  );
}
