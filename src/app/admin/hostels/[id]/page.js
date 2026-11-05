"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "@/lib/axios";
import {
  PageContainer,
  Card,
  Badge,
  Button,
  Alert,
  ConfirmDialog,
  Modal,
  Avatar,
  Select,
} from "@/components/ui";
import {
  AdminPageHeader,
  FilterBar,
  StatusBadge,
} from "@/components/admin";
import { getRoomStatusClasses } from "@/components/ui/StatusTones";
import RoomModal from "@/components/rooms/RoomModal";
import BulkRoomModal from "@/components/rooms/BulkRoomModal";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function HostelDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [hostel, setHostel] = useState(null);
  useDocumentTitle(hostel ? hostel.name : "Hostel Details", true);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modals state
  const [isSingleRoomModalOpen, setIsSingleRoomModalOpen] = useState(false);
  const [isBulkRoomModalOpen, setIsBulkRoomModalOpen] = useState(false);
  const [selectedRoomToEdit, setSelectedRoomToEdit] = useState(null);

  // Occupants modal state
  const [occupantsModalRoom, setOccupantsModalRoom] = useState(null);
  const [occupantsData, setOccupantsData] = useState(null);
  const [loadingOccupants, setLoadingOccupants] = useState(false);
  const [occupantsError, setOccupantsError] = useState(null);

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
            limit: 200,
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

  const handleViewOccupants = async (room) => {
    if (!room || room.currentOccupancy <= 0) return;
    setOccupantsModalRoom(room);
    setOccupantsData(null);
    setOccupantsError(null);
    setLoadingOccupants(true);

    try {
      const res = await axios.get(`/api/admin/rooms/${room._id}/occupants`);
      if (res.data?.success) {
        setOccupantsData(res.data.data);
      }
    } catch (err) {
      setOccupantsError(err.response?.data?.message || "Failed to load occupants");
    } finally {
      setLoadingOccupants(false);
    }
  };

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
    return Object.keys(grouped)
      .sort((a, b) => Number(a) - Number(b))
      .map((fl) => ({
        floor: Number(fl),
        rooms: grouped[fl].sort((a, b) =>
          a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
        ),
      }));
  }, [filteredRooms]);

  const floorOptions = useMemo(() => {
    const totalFl = hostel?.totalFloors || 6;
    const opts = [{ value: "all", label: "All Floors" }];
    for (let f = 1; f <= totalFl; f++) {
      opts.push({ value: String(f), label: `Floor ${f}` });
    }
    return opts;
  }, [hostel?.totalFloors]);

  if (loading && !hostel) {
    return (
      <PageContainer maxWidth="7xl" className="py-8">
        <div className="h-64 animate-pulse rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
      </PageContainer>
    );
  }

  if (error && !hostel) {
    return (
      <PageContainer maxWidth="7xl" className="py-8">
        <Alert
          variant="danger"
          title="Error Loading Hostel"
          action={
            <Button variant="outline" size="sm" onClick={loadData}>
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => router.push("/admin/hostels")}>
            &larr; Back to Hostels
          </Button>
        </div>
      </PageContainer>
    );
  }

  const occupancyPct =
    hostel?.totalCapacity > 0
      ? Math.round((hostel.occupiedBeds / hostel.totalCapacity) * 100)
      : 0;

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      {/* Header */}
      <AdminPageHeader
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{hostel?.name}</span>
            <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 font-mono text-xs font-black text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
              {hostel?.code}
            </span>
            <Badge variant={hostel?.gender === "boys" ? "boys" : hostel?.gender === "girls" ? "girls" : "mixed"}>
              {hostel?.gender}
            </Badge>
          </div>
        }
        description={`${hostel?.location || "Campus Residential Block"} â€¢ ${hostel?.totalFloors} habitable floors â€¢ Gender: ${hostel?.gender}`}
        breadcrumbs={[
          { href: "/admin/hostels", label: "Hostels" },
          { label: hostel?.code || "Details" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push(`/admin/hostels/${id}/edit`)}
            >
              Edit Hostel
            </Button>
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
          <Alert variant="danger" title="Error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-8">
        <Card className="p-4 text-center sm:text-left">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Rooms</span>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1 block">
            {hostel?.totalRooms || 0}
          </span>
        </Card>
        <Card className="p-4 text-center sm:text-left">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Bed Capacity</span>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1 block">
            {hostel?.totalCapacity || 0}
          </span>
        </Card>
        <Card className="p-4 text-center sm:text-left">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Occupied Beds</span>
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-1 block">
            {hostel?.occupiedBeds || 0}
          </span>
        </Card>
        <Card className="p-4 text-center sm:text-left">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Available Beds</span>
          <span className="text-xl font-bold text-teal-600 dark:text-teal-400 font-mono mt-1 block">
            {hostel?.availableBeds || 0}
          </span>
        </Card>
        <Card className="p-4 text-center sm:text-left">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Occupancy Rate</span>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1 block">
            {occupancyPct}%
          </span>
        </Card>
      </div>

      {/* Filter Bar & Room State Legend */}
      <div className="mb-6 space-y-4">
        <Card className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-40">
              <Select
                value={selectedFloor}
                onChange={(val) => setSelectedFloor(val)}
                options={floorOptions}
              />
            </div>
            <div className="w-full sm:w-40">
              <Select
                value={roomTypeFilter}
                onChange={(val) => setRoomTypeFilter(val)}
                options={[
                  { value: "all", label: "All Room Types" },
                  { value: "AC", label: "AC Only" },
                  { value: "Non-AC", label: "Non-AC Only" },
                ]}
              />
            </div>
          </div>

          {/* 4 Room State Legends */}
          <div className="flex flex-wrap items-center gap-3 text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
              <span className="text-slate-600 dark:text-slate-400">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600 dark:text-slate-400">Claimed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              <span className="text-slate-600 dark:text-slate-400">Full</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-400">Maintenance</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Room Grid by Floor */}
      {roomsByFloor.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
            No rooms match filter criteria.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            You can create rooms individually or in bulk.
          </p>
          <div className="flex justify-center gap-2.5">
            <Button size="sm" variant="primary" onClick={() => setIsBulkRoomModalOpen(true)}>
              + Bulk Add Rooms
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSelectedRoomToEdit(null);
                setIsSingleRoomModalOpen(true);
              }}
            >
              + Add Single Room
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {roomsByFloor.map(({ floor, rooms: floorRooms }) => (
            <Card key={floor} className="p-5">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-xs">
                    {floor}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                    Floor {floor} ({floorRooms.length} rooms)
                  </h3>
                </div>
                <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                  {floorRooms.reduce((acc, r) => acc + (r.capacity - r.currentOccupancy), 0)} free beds
                </span>
              </div>

              {/* Room Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {floorRooms.map((room) => {
                  const freeBeds = Math.max(0, room.capacity - room.currentOccupancy);
                  const isFull = room.currentOccupancy >= room.capacity;
                  const derivedStatus =
                    room.status === "maintenance"
                      ? "maintenance"
                      : room.status === "claimed"
                      ? "claimed"
                      : isFull
                      ? "full"
                      : "available";

                  const statusMeta = getRoomStatusClasses(derivedStatus);

                  return (
                    <div
                      key={room._id}
                      className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all duration-200 group ${
                        isFull
                          ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                          : derivedStatus === "maintenance"
                          ? "bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                          : derivedStatus === "claimed"
                          ? "bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                          : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs"
                      }`}
                    >
                      <div
                        onClick={() => room.currentOccupancy > 0 && handleViewOccupants(room)}
                        className={room.currentOccupancy > 0 ? "cursor-pointer" : ""}
                        title={room.currentOccupancy > 0 ? "Click to view occupants" : ""}
                      >
                        {/* Room Number & Status */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            #{room.roomNumber}
                          </span>
                          <StatusBadge type="room" status={derivedStatus} />
                        </div>

                        {/* Badges: Type & Capacity with Bed SVGs */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold border ${
                              room.roomType === "AC"
                                ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {room.roomType}
                          </span>

                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            {room.capacity}
                          </span>
                        </div>

                        {/* Occupancy Indicator */}
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {room.currentOccupancy}
                          </span>{" "}
                          / {room.capacity} occupied
                          {room.currentOccupancy > 0 && (
                            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold block mt-0.5">
                              View Occupants &rarr;
                            </span>
                          )}
                          <span className="block text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-0.5">
                            {freeBeds} free
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomToEdit(room);
                            setIsSingleRoomModalOpen(true);
                          }}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteRoomTarget(room)}
                          className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
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
        variant="danger"
        isLoading={deletingRoom}
        onClose={() => setDeleteRoomTarget(null)}
        onConfirm={
          deleteRoomTarget?.currentOccupancy > 0
            ? () => setDeleteRoomTarget(null)
            : handleDeleteRoom
        }
      />

      {/* Room Occupants Modal */}
      <Modal
        isOpen={Boolean(occupantsModalRoom)}
        onClose={() => setOccupantsModalRoom(null)}
        title={`Room #${occupantsModalRoom?.roomNumber} Occupants`}
        description={`${occupantsModalRoom?.roomType} room â€¢ Floor ${occupantsModalRoom?.floor} â€¢ ${occupantsModalRoom?.currentOccupancy} of ${occupantsModalRoom?.capacity} beds occupied`}
        maxWidth="max-w-lg"
      >
        {loadingOccupants ? (
          <div className="py-8 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Loading occupants...</p>
          </div>
        ) : occupantsError ? (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-400">
            {occupantsError}
          </div>
        ) : occupantsData?.occupants?.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
            No active occupants assigned to this room.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
            {occupantsData?.occupants?.map((occ) => {
              const s = occ.student || {};
              return (
                <div key={occ.allocationId} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <Avatar name={s.name} size="sm" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        {s.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 block font-mono text-[11px]">
                        {s.registrationNumber || "No Reg"} â€¢ Year {s.year} â€¢ {s.course}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 block text-[11px] mt-0.5">
                        {s.email} {s.phone ? `â€¢ ${s.phone}` : ""}
                      </span>
                    </div>
                  </div>
                  {occ.group?.averageScore !== undefined && (
                    <Badge variant="brand" size="sm">
                      {occ.group.averageScore}% avg
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
