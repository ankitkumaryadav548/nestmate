"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  Badge,
  Button,
  ProgressBar,
  EmptyState,
  Alert,
  PageTransition,
  Reveal,
  Skeleton,
  IconBuilding,
  IconBed,
  IconShield,
  IconCheck,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function StudentHostelsPage() {
  useDocumentTitle("Eligible Hostels");
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
    <PageTransition>
      <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <Reveal direction="down">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-800 dark:text-slate-200">Eligible Hostels</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
                  Eligible Hostels &amp; Rooms
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                  Showing hostels tailored to your profile ({user?.gender || "student"}
                  {user?.year ? `, Year ${user.year}` : ""}). Explore available bed capacities, amenities, and policies.
                </p>
              </div>
              <Badge variant="brand" size="md">
                Gender Eligibility: <span className="capitalize ml-1 font-bold">{user?.gender || "All"}</span>
              </Badge>
            </div>
          </div>
        </Reveal>

        {error && (
          <Reveal direction="down">
            <Alert
              variant="danger"
              title="Error Loading Hostels"
              action={
                <Button variant="outline" size="sm" onClick={fetchEligibleHostels}>
                  Try again
                </Button>
              }
            >
              {error}
            </Alert>
          </Reveal>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 h-48 animate-pulse" />
            ))}
          </div>
        ) : error ? null : hostels.length === 0 ? (
          <EmptyState
            icon="ðŸ¢"
            title="No Eligible Hostels Found"
            description="Currently there are no active hostels configured matching your gender or academic year criteria. Please contact housing administration."
          />
        ) : (
          <div className="space-y-5">
            {hostels.map((hostel, idx) => {
              const isExpanded = expandedHostelId === hostel._id;
              const rooms = hostelRooms[hostel._id] || [];
              const typeSummary = getRoomTypeSummary(rooms);
              const occupancyPercent = hostel.totalCapacity
                ? Math.round(((hostel.totalCapacity - (hostel.availableBeds || 0)) / hostel.totalCapacity) * 100)
                : 0;

              return (
                <Reveal key={hostel._id} direction="up" delay={Math.min(idx * 50, 400)}>
                  <Card variant="interactive" className="p-6">
                    {/* Top Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 font-mono text-sm font-black text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                          {hostel.code}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
                              {hostel.name}
                            </h2>
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
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {hostel.location || "Campus Residential Block"} • {hostel.totalFloors} habitable floors
                          </p>
                        </div>
                      </div>

                      {/* Bed Stats Pill & Toggle Button */}
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 px-3.5 py-2 text-right">
                          <span className="block text-[11px] uppercase font-semibold text-teal-800 dark:text-teal-300">
                            Available Beds
                          </span>
                          <span className="text-base font-black text-teal-700 dark:text-teal-300">
                            {hostel.availableBeds} / {hostel.totalCapacity}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant={isExpanded ? "outline" : "primary"}
                          onClick={() => handleToggleHostel(hostel._id)}
                        >
                          {isExpanded ? "Hide Rooms â–²" : "View Room Types â–¼"}
                        </Button>
                      </div>
                    </div>

                    {/* Occupancy Progress Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Occupancy Level</span>
                        <span className="font-semibold">{occupancyPercent}% Occupied</span>
                      </div>
                      <ProgressBar
                        value={occupancyPercent}
                        max={100}
                        color={occupancyPercent > 85 ? "danger" : occupancyPercent > 60 ? "warning" : "brand"}
                      />
                    </div>

                    {/* Facilities Chips */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2 font-heading">
                        Hostel Amenities:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {hostel.facilities?.length > 0 ? (
                          hostel.facilities.map((fac) => (
                            <span
                              key={fac}
                              className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300"
                            >
                               {fac}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">Standard campus amenities</span>
                        )}
                      </div>
                    </div>

                    {/* Rules */}
                    {hostel.rules && (
                      <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Hostel Rules: </span>
                        {hostel.rules}
                      </div>
                    )}

                    {/* Expanded Room Availability Details */}
                    {isExpanded && (
                      <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                          Available Room Inventory ({hostel.availableBeds} free beds)
                        </h3>

                        {loadingRooms ? (
                          <div className="p-4 text-center text-xs text-slate-500 animate-pulse">
                            Loading available room options...
                          </div>
                        ) : typeSummary.length === 0 ? (
                          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-xs text-amber-800 dark:text-amber-300">
                            No vacant beds are currently available in this hostel.
                          </div>
                        ) : (
                          <>
                            {/* Summary Cards by Room Type */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {typeSummary.map((ts) => (
                                <div
                                  key={`${ts.capacity}-${ts.type}`}
                                  className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-heading">
                                      {ts.capacity}-Bed {ts.type}
                                    </span>
                                    <Badge
                                      variant={ts.type === "AC" ? "info" : "neutral"}
                                      size="sm"
                                    >
                                      {ts.type}
                                    </Badge>
                                  </div>
                                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                                    <span className="text-base font-extrabold text-indigo-700 dark:text-indigo-300">
                                      {ts.availableBeds}
                                    </span>{" "}
                                    beds free across {ts.roomsCount} room(s)
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Rooms Table */}
                            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                                    <th className="py-2.5 px-3">Room</th>
                                    <th className="py-2.5 px-3">Floor</th>
                                    <th className="py-2.5 px-3">Room Type</th>
                                    <th className="py-2.5 px-3">Capacity</th>
                                    <th className="py-2.5 px-3 text-right">Vacant Beds</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {rooms.slice(0, 15).map((r) => (
                                    <tr key={r._id} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                                        #{r.roomNumber}
                                      </td>
                                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">Floor {r.floor}</td>
                                      <td className="py-2 px-3">
                                        <Badge
                                          variant={r.roomType === "AC" ? "info" : "neutral"}
                                          size="sm"
                                        >
                                          {r.roomType}
                                        </Badge>
                                      </td>
                                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{r.capacity} beds</td>
                                      <td className="py-2 px-3 text-right font-bold text-teal-600 dark:text-teal-400">
                                        {r.availableBeds} free
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {rooms.length > 15 && (
                                <div className="p-2 text-center text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                  Showing 15 of {rooms.length} vacant rooms in this block.
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
