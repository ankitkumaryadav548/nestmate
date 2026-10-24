"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import Badge from "@/components/ui/Badge";

export default function AdminDemandPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDemand() {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get("/api/admin/preferences/summary");
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load demand summary:", err);
        setError(err.response?.data?.message || "Failed to load pre-allocation demand data");
      } finally {
        setLoading(false);
      }
    }
    fetchDemand();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 py-16 px-4 max-w-7xl mx-auto w-full text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
        <p className="mt-3 text-xs font-semibold text-slate-500">Aggregating hostel demand & campus inventory...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 py-12 px-4 max-w-4xl mx-auto w-full">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-bold text-rose-800">{error || "Failed to load demand summary"}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { totals, acDemand, floorDemand, roomSizeDemand, campusTotals, hostelSummaries } = data;

  const totalAcDemanded = (acDemand.ac || 0) + (acDemand["non-ac"] || 0) + (acDemand["no-preference"] || 0);
  const acPercent = totalAcDemanded ? Math.round(((acDemand.ac || 0) / totalAcDemanded) * 100) : 0;
  const nonAcPercent = totalAcDemanded ? Math.round(((acDemand["non-ac"] || 0) / totalAcDemanded) * 100) : 0;
  const flexPercent = totalAcDemanded ? Math.round(((acDemand["no-preference"] || 0) / totalAcDemanded) * 100) : 0;

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            Hostel Demand vs. Supply Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pre-allocation intelligence comparing student first-choice preferences against available campus capacity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/groups"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Manage Groups &rarr;
          </Link>
        </div>
      </div>

      {/* Pre-Allocation Strategy Banner */}
      <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-950 flex items-start gap-3 shadow-xs">
        <span className="text-2xl mt-0.5">📊</span>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
            Warden Allocation Guidance
          </h3>
          <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
            Use this dashboard before running automated allocation to identify hostels where student demand exceeds available room supply. Students whose top choices are over-subscribed will be evaluated for their secondary preferences.
          </p>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Entities Requesting</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totals.totalEntitiesRequesting}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totals.activeGroupsCount} Roommate Groups • {totals.autoAssignCount} Auto-Assign Pool
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Available Campus Beds</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {campusTotals.availableBeds} / {campusTotals.totalBeds}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {campusTotals.availableRooms} vacant rooms across {hostelSummaries.length} hostels
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Climate Control Demand</span>
          <div className="text-sm font-bold text-slate-800 mt-2 flex items-center justify-between">
            <span className="text-blue-700">❄️ {acDemand.ac || 0} AC ({acPercent}%)</span>
            <span className="text-emerald-700">🍃 {acDemand["non-ac"] || 0} Non-AC ({nonAcPercent}%)</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-2 flex">
            <div style={{ width: `${acPercent}%` }} className="bg-blue-600" />
            <div style={{ width: `${nonAcPercent}%` }} className="bg-emerald-500" />
            <div style={{ width: `${flexPercent}%` }} className="bg-slate-300" />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 text-right">
            {acDemand["no-preference"] || 0} flexible with either
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Floor Height Distribution</span>
          <div className="grid grid-cols-4 gap-1 text-center mt-2 text-xs">
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <span className="block font-bold text-slate-900">{floorDemand.low || 0}</span>
              <span className="text-[10px] text-slate-400">Low</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <span className="block font-bold text-slate-900">{floorDemand.mid || 0}</span>
              <span className="text-[10px] text-slate-400">Mid</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <span className="block font-bold text-slate-900">{floorDemand.high || 0}</span>
              <span className="text-[10px] text-slate-400">High</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <span className="block font-bold text-slate-900">{floorDemand.any || 0}</span>
              <span className="text-[10px] text-slate-400">Any</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 text-center">
            Relative building third bands
          </p>
        </div>
      </div>

      {/* Room Size Demand vs. Inventory Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">Room Capacity Demand vs. Campus Supply</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[2, 3, 4].map((size) => {
            const req = roomSizeDemand[size] || { groups: 0, autoStudents: 0, totalBedsDemanded: 0 };
            const supply = campusTotals.bySize[size] || { availableRooms: 0, availableBeds: 0, rooms: 0, beds: 0 };
            const diff = supply.availableBeds - req.totalBedsDemanded;

            return (
              <div
                key={size}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{size}-Bed Rooms</span>
                  <Badge variant={diff >= 0 ? "success" : "danger"} size="sm">
                    {diff >= 0 ? `+${diff} Beds Available` : `${diff} Bed Deficit`}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Groups Requesting:</span>
                    <strong className="text-slate-900">{req.groups} ({req.groups * size} beds)</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Auto-Assign Students:</span>
                    <strong className="text-slate-900">{req.autoStudents} beds</strong>
                  </div>
                  <div className="flex justify-between text-slate-700 font-semibold pt-1 border-t border-slate-200">
                    <span>Total Bed Demand:</span>
                    <span className="text-indigo-600 font-black">{req.totalBedsDemanded} beds</span>
                  </div>
                  <div className="flex justify-between text-slate-700 font-semibold">
                    <span>Available Free Beds:</span>
                    <span className="text-emerald-700 font-black">
                      {supply.availableBeds} beds ({supply.availableRooms} rooms)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hostels First-Choice Demand Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Per-Hostel 1st-Choice Demand Balance Sheet</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by total groups and auto students choosing each hostel as priority #1.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
            {hostelSummaries.length} Campus Hostels
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Hostel / Code</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">1st Choice Demand</th>
                <th className="py-3 px-4">Available 2-Bed</th>
                <th className="py-3 px-4">Available 3-Bed</th>
                <th className="py-3 px-4">Available 4-Bed</th>
                <th className="py-3 px-4">Total Free Beds</th>
                <th className="py-3 px-4">AC vs Non-AC</th>
                <th className="py-3 px-4 text-right">Supply Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {hostelSummaries.map((h) => {
                const isHighDemand = h.firstChoiceDemand > 5 && h.inventory.availableBeds < h.firstChoiceDemand * 2;

                return (
                  <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900">{h.name}</span>
                        <span className="block text-[11px] font-mono text-slate-500">{h.code}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 capitalize">
                      <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                        {h.gender}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-indigo-700">
                          {h.firstChoiceDemand}
                        </span>
                        <span className="text-[10px] text-slate-400">group(s)</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">
                        {h.inventory.bySizeAvailable[2] || 0}
                      </span>{" "}
                      <span className="text-[10px] text-slate-400">rooms</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">
                        {h.inventory.bySizeAvailable[3] || 0}
                      </span>{" "}
                      <span className="text-[10px] text-slate-400">rooms</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">
                        {h.inventory.bySizeAvailable[4] || 0}
                      </span>{" "}
                      <span className="text-[10px] text-slate-400">rooms</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs">
                        {h.inventory.availableBeds} beds
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[11px]">
                      <span className="text-blue-700 font-semibold">❄️ {h.inventory.acBedsAvailable}</span>
                      {" / "}
                      <span className="text-emerald-700 font-semibold">🍃 {h.inventory.nonAcBedsAvailable}</span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {isHighDemand ? (
                        <Badge variant="danger" size="sm">High Demand</Badge>
                      ) : h.firstChoiceDemand > 0 ? (
                        <Badge variant="indigo" size="sm">Balanced</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Available</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
