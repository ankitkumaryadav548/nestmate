"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import { useAuth } from "@/context/AuthContext";

export default function StudentHostelsPage() {
  const { user } = useAuth();
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Expanded hostel tracking for room type breakdown
  const [expandedHostelId, setExpandedHostelId] = useState(null);
  const [hostelRooms, setHostelRooms] = useState({});
  const [loadingRooms, setLoadingRooms] = useState(false);

  const fetchEligibleHostels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get("/api/hostels", {
        params: {
          limit: 50,
          sortBy: "code",
          sortOrder: "asc",
        },
      });
      if (res.data?.success) {
        setHostels(res.data.data.hostels || []);
      }
    } catch (err) {
      console.error("Failed to load eligible hostels:", err);
      setError(err.response?.data?.message || "Failed to load eligible hostels.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEligibleHostels();
  }, [fetchEligibleHostels]);

  // Load rooms for a particular hostel when expanded
  const handleToggleHostel = async (hostelId) => {
    if (expandedHostelId === hostelId) {
      setExpandedHostelId(null);
      return;
    }

    setExpandedHostelId(hostelId);

    // If rooms already fetched for this hostel, reuse cached
    if (hostelRooms[hostelId]) return;

    try {
      setLoadingRooms(true);
      const res = await axios.get("/api/rooms", {
        params: {
          hostelId,
          availableOnly: "true",
          limit: 100,
        },
      });
      if (res.data?.success) {
        setHostelRooms((prev) => ({
          ...prev,
          [hostelId]: res.data.data.rooms || [],
        }));
      }
    } catch (err) {
      console.error("Failed to load rooms for hostel:", err);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Group rooms by room type & capacity to show summary breakdown
  const getRoomTypeSummary = (rooms = []) => {
    const summary = {};
    for (const r of rooms) {
      const key = `${r.capacity}-Bed ${r.roomType}`;
      if (!summary[key]) {
        summary[key] = {
          type: r.roomType,
          capacity: r.capacity,
          roomsCount: 0,
          availableBeds: 0,
        };
      }
      summary[key].roomsCount += 1;
      summary[key].availableBeds += r.availableBeds || 0;
    }
    return Object.values(summary);
  };

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
          <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
          <span>/</span>
          <span className="text-slate-800">Eligible Hostels</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Eligible Hostels & Rooms
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Showing hostels tailored to your profile ({user?.gender || "student"}
              {user?.year ? `, Year ${user.year}` : ""}). Explore available bed capacities, amenities, and policies.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-xs font-semibold text-indigo-700">
            <span>Student Gender:</span>
            <span className="capitalize font-bold text-slate-900">{user?.gender || "Not set"}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6">
          <Alert type="error" title="Error" message={error} />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : hostels.length === 0 ? (
        <EmptyState
          title="No eligible hostels found"
          message="Currently there are no active hostels configured matching your gender or academic year criteria. Please contact housing administration."
        />
      ) : (
        <div className="space-y-6">
          {hostels.map((hostel) => {
            const isExpanded = expandedHostelId === hostel._id;
            const rooms = hostelRooms[hostel._id] || [];
            const typeSummary = getRoomTypeSummary(rooms);

            return (
              <div
                key={hostel._id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-indigo-200 transition-all"
              >
                {/* Hostel Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-mono text-sm font-black text-indigo-700 border border-indigo-200">
                      {hostel.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-slate-900">{hostel.name}</h2>
                        <Badge
                          variant={
                            hostel.gender === "boys"
                              ? "boys"
                              : hostel.gender === "girls"
                              ? "girls"
                              : "mixed"
                          }
                          size="sm"
                        >
                          {hostel.gender}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {hostel.location || "Campus Residential Block"} • {hostel.totalFloors} habitable floors
                      </p>
                    </div>
                  </div>

                  {/* Bed Stats Pill */}
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-right">
                      <span className="block text-[10px] uppercase font-semibold text-emerald-800">
                        Available Beds
                      </span>
                      <span className="text-base font-black text-emerald-700">
                        {hostel.availableBeds} / {hostel.totalCapacity}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant={isExpanded ? "outline" : "primary"}
                      onClick={() => handleToggleHostel(hostel._id)}
                    >
                      {isExpanded ? "Hide Rooms ▲" : "View Room Types ▼"}
                    </Button>
                  </div>
                </div>

                {/* Facilities Badges */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 block mb-2">
                    Hostel Amenities:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {hostel.facilities?.length > 0 ? (
                      hostel.facilities.map((fac) => (
                        <span
                          key={fac}
                          className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700"
                        >
                          ✓ {fac}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Standard campus amenities</span>
                    )}
                  </div>
                </div>

                {/* Rules */}
                {hostel.rules && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
                    <span className="font-semibold text-slate-800">Hostel Rules: </span>
                    {hostel.rules}
                  </div>
                )}

                {/* Expanded Room Availability Details */}
                {isExpanded && (
                  <div className="mt-5 pt-4 border-t border-slate-200 animate-fadeIn">
                    <h3 className="text-sm font-bold text-slate-900 mb-3">
                      Available Room Inventory ({hostel.availableBeds} free beds)
                    </h3>

                    {loadingRooms ? (
                      <div className="p-4 text-center text-xs text-slate-500 animate-pulse">
                        Loading available room options...
                      </div>
                    ) : typeSummary.length === 0 ? (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800">
                        No vacant beds are currently available in this hostel block.
                      </div>
                    ) : (
                      <>
                        {/* Summary Cards by Room Type */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                          {typeSummary.map((ts) => (
                            <div
                              key={`${ts.capacity}-${ts.type}`}
                              className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900">
                                  {ts.capacity}-Bed {ts.type}
                                </span>
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                                    ts.type === "AC"
                                      ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {ts.type}
                                </span>
                              </div>
                              <div className="mt-2 text-xs text-slate-600">
                                <span className="text-base font-extrabold text-indigo-700">
                                  {ts.availableBeds}
                                </span>{" "}
                                beds free across {ts.roomsCount} room(s)
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Rooms List Table (Safe Public Projection) */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-500 font-semibold uppercase text-[10px]">
                                <th className="py-2.5 px-3">Room</th>
                                <th className="py-2.5 px-3">Floor</th>
                                <th className="py-2.5 px-3">Room Type</th>
                                <th className="py-2.5 px-3">Capacity</th>
                                <th className="py-2.5 px-3 text-right">Vacant Beds</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {rooms.slice(0, 15).map((r) => (
                                <tr key={r._id} className="hover:bg-white transition-colors">
                                  <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                    #{r.roomNumber}
                                  </td>
                                  <td className="py-2 px-3 text-slate-600">Floor {r.floor}</td>
                                  <td className="py-2 px-3">
                                    <span
                                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                                        r.roomType === "AC"
                                          ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                          : "bg-slate-100 text-slate-600 border-slate-200"
                                      }`}
                                    >
                                      {r.roomType}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-slate-700">{r.capacity} beds</td>
                                  <td className="py-2 px-3 text-right font-bold text-emerald-600">
                                    {r.availableBeds} free
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {rooms.length > 15 && (
                            <div className="p-2 text-center text-[11px] text-slate-500 border-t border-slate-100 bg-white">
                              Showing 15 of {rooms.length} vacant rooms in this block.
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
