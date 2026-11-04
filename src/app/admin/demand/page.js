"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import {
  PageContainer,
  Card,
  Badge,
  Button,
  ProgressBar,
  Alert,
} from "@/components/ui";
import {
  AdminPageHeader,
  HorizontalBars,
  StackedBar,
  DonutRing,
} from "@/components/admin";

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
      <PageContainer maxWidth="7xl" className="py-8">
        <div className="h-64 animate-pulse rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer maxWidth="7xl" className="py-8">
        <Alert variant="danger" title="Error">
          {error || "Failed to load demand summary"}
        </Alert>
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </PageContainer>
    );
  }

  const { totals, acDemand, floorDemand, roomSizeDemand, campusTotals, hostelSummaries } = data;

  const totalAcDemanded = (acDemand.ac || 0) + (acDemand["non-ac"] || 0) + (acDemand["no-preference"] || 0);
  const acPercent = totalAcDemanded ? Math.round(((acDemand.ac || 0) / totalAcDemanded) * 100) : 0;
  const nonAcPercent = totalAcDemanded ? Math.round(((acDemand["non-ac"] || 0) / totalAcDemanded) * 100) : 0;

  // Demand bars for top hostels
  const demandBars = hostelSummaries.slice(0, 6).map((h) => ({
    label: `${h.code} - ${h.name}`,
    value: h.firstChoiceDemand || 0,
    max: Math.max(...hostelSummaries.map((x) => x.firstChoiceDemand || 0), 10),
    displayValue: `${h.firstChoiceDemand || 0} groups (${h.inventory?.availableBeds || 0} beds free)`,
    color: (h.firstChoiceDemand || 0) > 8 ? "bg-amber-500 dark:bg-amber-400" : "bg-indigo-600 dark:bg-indigo-500",
  }));

  // AC Stacked Bar segments
  const acSegments = [
    {
      label: "AC Required",
      value: acDemand.ac || 0,
      color: "bg-blue-600 dark:bg-blue-500",
      displayValue: `${acDemand.ac || 0} (${acPercent}%)`,
    },
    {
      label: "Non-AC",
      value: acDemand["non-ac"] || 0,
      color: "bg-teal-600 dark:bg-teal-500",
      displayValue: `${acDemand["non-ac"] || 0} (${nonAcPercent}%)`,
    },
    {
      label: "Flexible",
      value: acDemand["no-preference"] || 0,
      color: "bg-slate-400 dark:bg-slate-600",
      displayValue: `${acDemand["no-preference"] || 0}`,
    },
  ];

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      {/* Header */}
      <AdminPageHeader
        title="Hostel Demand vs. Supply Analytics"
        description="Pre-allocation intelligence comparing student first-choice preferences against available campus capacity."
        breadcrumbs={[{ label: "Demand Analysis" }]}
        actions={
          <Link href="/admin/groups">
            <Button variant="secondary" size="sm">
              Manage Groups &rarr;
            </Button>
          </Link>
        }
      />

      {/* Pre-Allocation Guidance Callout */}
      <div className="mb-6 p-4.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 flex items-start gap-3.5">
        <span className="text-2xl mt-0.5">📊</span>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200 font-heading">
            Pre-Allocation Intelligence Guidance
          </h3>
          <p className="text-xs text-indigo-900/80 dark:text-indigo-300 mt-1 leading-relaxed">
            Use this dashboard before running automated allocation to identify hostels where student demand exceeds available room supply. Students whose top choices are over-subscribed will be evaluated for their secondary preferences.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Entities Requesting</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {totals.totalEntitiesRequesting}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {totals.activeGroupsCount} Groups • {totals.autoAssignCount} Auto-Pool
          </p>
        </Card>

        <Card className="p-4.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Available Campus Beds</span>
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1 font-mono">
            {campusTotals.availableBeds} / {campusTotals.totalBeds}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {campusTotals.availableRooms} vacant rooms across {hostelSummaries.length} hostels
          </p>
        </Card>

        <Card className="p-4.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Climate Control Demand</span>
            <div className="mt-1 space-y-0.5 text-xs font-bold">
              <span className="text-blue-600 dark:text-blue-400 block font-mono">❄️ {acDemand.ac || 0} AC ({acPercent}%)</span>
              <span className="text-teal-600 dark:text-teal-400 block font-mono">🍃 {acDemand["non-ac"] || 0} Non-AC ({nonAcPercent}%)</span>
            </div>
          </div>
          <DonutRing
            value={acPercent}
            max={100}
            size={68}
            strokeWidth={7}
            centerValue={`${acPercent}%`}
            centerLabel="AC"
            color="#3b82f6"
          />
        </Card>

        <Card className="p-4.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Floor Height Distribution</span>
          <div className="grid grid-cols-4 gap-1 text-center mt-2 text-xs">
            <div className="bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="block font-bold text-slate-900 dark:text-slate-100 font-mono">{floorDemand.low || 0}</span>
              <span className="text-[10px] text-slate-400">Low</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="block font-bold text-slate-900 dark:text-slate-100 font-mono">{floorDemand.mid || 0}</span>
              <span className="text-[10px] text-slate-400">Mid</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="block font-bold text-slate-900 dark:text-slate-100 font-mono">{floorDemand.high || 0}</span>
              <span className="text-[10px] text-slate-400">High</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="block font-bold text-slate-900 dark:text-slate-100 font-mono">{floorDemand.any || 0}</span>
              <span className="text-[10px] text-slate-400">Any</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 text-center">
            Relative building third bands
          </p>
        </Card>
      </div>

      {/* Visual Charts: First-Choice Demand & Climate Control */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading mb-1">
            Top First-Choice Demand vs. Free Beds
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Hostels with the highest concentration of priority #1 selections
          </p>
          <HorizontalBars data={demandBars} className="my-2" />
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading mb-1">
            AC vs. Non-AC Climate Demand
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Overall student climate control preference distribution
          </p>
          <StackedBar
            segments={acSegments}
            total={totalAcDemanded || 1}
            height="h-5"
            className="my-3"
          />
        </Card>
      </div>

      {/* Room Size Demand vs. Inventory Breakdown */}
      <Card className="p-6 mb-8 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
          Room Capacity Demand vs. Campus Supply
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((size) => {
            const req = roomSizeDemand[size] || { groups: 0, autoStudents: 0, totalBedsDemanded: 0 };
            const supply = campusTotals.bySize[size] || { availableRooms: 0, availableBeds: 0, rooms: 0, beds: 0 };
            const diff = supply.availableBeds - req.totalBedsDemanded;

            return (
              <div
                key={size}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                    {size === 1 ? "1-Bed Single" : `${size}-Bed Rooms`}
                  </span>
                  <Badge variant={diff >= 0 ? "success" : "danger"} size="xs">
                    {diff >= 0 ? `+${diff} Available` : `${diff} Deficit`}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{size === 1 ? "Single-Room Students:" : "Groups Requesting:"}</span>
                    <strong className="text-slate-900 dark:text-slate-100">
                      {size === 1
                        ? `${req.autoStudents || 0} students`
                        : `${req.groups} (${req.groups * size} beds)`}
                    </strong>
                  </div>
                  {size > 1 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Auto-Assign Students:</span>
                      <strong className="text-slate-900 dark:text-slate-100">{req.autoStudents} beds</strong>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>Total Bed Demand:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">{req.totalBedsDemanded} beds</span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                    <span>Available Free Beds:</span>
                    <span className="text-teal-600 dark:text-teal-400 font-bold font-mono">
                      {supply.availableBeds} beds ({supply.availableRooms} rooms)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Hostels First-Choice Demand Balance Sheet */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
              Per-Hostel 1st-Choice Demand Balance Sheet
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked by total groups and auto students choosing each hostel as priority #1.
            </p>
          </div>
          <Badge variant="neutral" size="sm">
            {hostelSummaries.length} Campus Hostels
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Hostel / Code</th>
                <th className="py-3.5 px-4">Gender</th>
                <th className="py-3.5 px-4">1st Choice Demand</th>
                <th className="py-3.5 px-4">1-Bed Single</th>
                <th className="py-3.5 px-4">Available 2-Bed</th>
                <th className="py-3.5 px-4">Available 3-Bed</th>
                <th className="py-3.5 px-4">Available 4-Bed</th>
                <th className="py-3.5 px-4">Total Free Beds</th>
                <th className="py-3.5 px-4">AC vs Non-AC</th>
                <th className="py-3.5 px-4 text-right">Supply Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              {hostelSummaries.map((h) => {
                const isHighDemand = h.firstChoiceDemand > 5 && h.inventory.availableBeds < h.firstChoiceDemand * 2;

                return (
                  <tr key={h.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{h.name}</span>
                        <span className="block text-[11px] font-mono text-slate-500 dark:text-slate-400">{h.code}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 capitalize">
                      <Badge
                        variant={h.gender === "boys" ? "boys" : h.gender === "girls" ? "girls" : "neutral"}
                        size="xs"
                      >
                        {h.gender}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 font-mono">
                          {h.firstChoiceDemand}
                        </span>
                        <span className="text-[10px] text-slate-400">groups</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {h.inventory.bySizeAvailable[1] || 0}
                      </span>{" "}
                      <span className="text-[10px] text-slate-400">rooms</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {h.inventory.bySizeAvailable[2] || 0}
                      </span>{" "}
                      <span className="text-[10px] text-slate-400">rooms</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {h.inventory.bySizeAvailable[3] || 0}
                      </span>{" "}
                      <span className="text-[10px] text-slate-400">rooms</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {h.inventory.bySizeAvailable[4] || 0}
                      </span>{" "}
                      <span className="text-[10px] text-slate-400">rooms</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
                        {h.inventory.availableBeds} free
                      </span>{" "}
                      <span className="text-[10px] text-slate-400">/ {h.inventory.totalBeds} total</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        {h.inventory.acBeds} AC • {h.inventory.nonAcBeds} Non-AC
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {isHighDemand ? (
                        <Badge variant="warning" size="xs">
                          High Demand
                        </Badge>
                      ) : h.inventory.availableBeds === 0 ? (
                        <Badge variant="danger" size="xs">
                          Full
                        </Badge>
                      ) : (
                        <Badge variant="success" size="xs">
                          Available
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  );
}
