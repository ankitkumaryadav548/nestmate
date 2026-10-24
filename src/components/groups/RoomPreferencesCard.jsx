"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { AC_DETAILS, FLOOR_DETAILS } from "@/config/roomPreferences";

export default function RoomPreferencesCard({
  isLeader = false,
  isLocked = false,
  targetSize = 2,
  onPreferencesUpdated,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acking, setAcking] = useState(false);
  const [options, setOptions] = useState([]);
  const [prefData, setPrefData] = useState({
    preferredHostels: [],
    acType: "no-preference",
    floorPreference: "any",
  });
  const [suggestedAcType, setSuggestedAcType] = useState("no-preference");
  const [preferencesNeedReview, setPreferencesNeedReview] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [optionsRes, prefsRes] = await Promise.all([
        api.get("/groups/me/room-options").catch(() => ({ data: { data: [] } })),
        api.get("/groups/me/room-preferences").catch(() => ({ data: { data: null } })),
      ]);

      setOptions(optionsRes.data?.data || []);

      if (prefsRes.data?.data) {
        const d = prefsRes.data.data;
        const currentSelectedIds = (d.preferences?.preferredHostels || []).map((h) =>
          typeof h === "object" ? h.id || h._id : h
        );

        setPrefData({
          preferredHostels: currentSelectedIds,
          acType: d.preferences?.acType || "no-preference",
          floorPreference: d.preferences?.floorPreference || "any",
        });

        setSuggestedAcType(d.suggestedAcType || "no-preference");
        setPreferencesNeedReview(Boolean(d.preferencesNeedReview));
        setWarnings(d.warnings || []);
      }
    } catch (err) {
      console.error("Failed to load room options or preferences:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reorder preferred hostels
  const handleMoveHostel = (index, direction) => {
    if (!isLeader || isLocked) return;
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= prefData.preferredHostels.length) return;

    const updated = [...prefData.preferredHostels];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);

    setPrefData((prev) => ({ ...prev, preferredHostels: updated }));
  };

  const handleToggleHostel = (hostelId) => {
    if (!isLeader || isLocked) return;
    setPrefData((prev) => {
      const exists = prev.preferredHostels.includes(hostelId);
      if (exists) {
        return {
          ...prev,
          preferredHostels: prev.preferredHostels.filter((id) => id !== hostelId),
        };
      }
      if (prev.preferredHostels.length >= 3) {
        return prev; // Maximum 3 hostels
      }
      return {
        ...prev,
        preferredHostels: [...prev.preferredHostels, hostelId],
      };
    });
  };

  const handleAcknowledgeNotice = async () => {
    setAcking(true);
    try {
      await api.post("/groups/me/room-preferences");
      setPreferencesNeedReview(false);
      setFeedback({ type: "success", message: "Review notice cleared." });
    } catch (err) {
      console.error("Failed to acknowledge notice:", err);
    } finally {
      setAcking(false);
    }
  };

  const handleSave = async () => {
    if (!isLeader || isLocked) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.put("/groups/me/room-preferences", {
        preferredHostels: prefData.preferredHostels,
        acType: prefData.acType,
        floorPreference: prefData.floorPreference,
      });

      if (res.data?.success) {
        setFeedback({
          type: "success",
          message: "Room preferences successfully updated for your allocation profile!",
        });
        setPreferencesNeedReview(false);
        if (onPreferencesUpdated) onPreferencesUpdated();
        await loadData();
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to save room preferences",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-6 w-24 bg-slate-200 rounded-full animate-pulse" />
        </div>
        <div className="mt-6 space-y-4">
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Room Preferences</h2>
            <Badge variant="indigo" size="sm">
              Soft Preferences
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Specify desired hostel priority, AC requirement, and floor level for the future residential allocation run.
          </p>
        </div>

        <div>
          {isLocked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700">
              🔒 Locked: Allocated
            </span>
          ) : !isLeader ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              👁️ Read-Only (Leader Manages)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              ✏️ Leader Controls Active
            </span>
          )}
        </div>
      </div>

      {/* Soft Preference Guarantee Disclaimer */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
        <span className="text-base mt-0.5">ℹ️</span>
        <div>
          <strong className="font-bold">Preferences are soft, not guarantees:</strong> The residential warden will attempt to match your preferences in your chosen order of priority during allocation, but specific hostels, floors, or room numbers cannot be guaranteed due to campus inventory constraints.
        </div>
      </div>

      {/* Roster Change Review Notice */}
      {preferencesNeedReview && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="text-lg mt-0.5">⚠️</span>
            <div>
              <p className="font-bold text-amber-950">Group Roster Changed — Please Review Preferences</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                A member has joined or left your group. Please verify that your chosen hostels and AC setting continue to suit every current member.
              </p>
            </div>
          </div>
          {isLeader && !isLocked && (
            <Button
              variant="outline"
              size="sm"
              loading={acking}
              onClick={handleAcknowledgeNotice}
              className="shrink-0 bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              Acknowledge & Clear Notice
            </Button>
          )}
        </div>
      )}

      {/* Warnings (if any) */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warn, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2"
            >
              <span>⚠️</span>
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* STEP 1: Select up to 3 Preferred Hostels */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Step 1: Preferred Hostels (Up to 3 in priority order)
            </h3>
            <p className="text-xs text-slate-500">
              Select eligible hostels you qualify for and order them by priority ({prefData.preferredHostels.length}/3 selected).
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-600">
            Target: {targetSize}-Bed Room
          </span>
        </div>

        {/* Selected Hostels Priority Stack */}
        {prefData.preferredHostels.length > 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Selected Priority Order:
            </span>
            <div className="space-y-2">
              {prefData.preferredHostels.map((hId, index) => {
                const hostelObj = options.find((h) => h.id === hId);
                const rankLabels = ["1st Choice", "2nd Choice", "3rd Choice"];
                const rankColors = [
                  "bg-indigo-600 text-white",
                  "bg-indigo-100 text-indigo-800 border border-indigo-200",
                  "bg-slate-200 text-slate-700",
                ];

                return (
                  <div
                    key={hId}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${rankColors[index]}`}>
                        #{index + 1} {rankLabels[index]}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900">
                          {hostelObj ? hostelObj.name : "Hostel"} ({hostelObj?.code})
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="capitalize">{hostelObj?.gender} hostel</span>
                          <span>•</span>
                          <span>{hostelObj?.totalFloors || 1} Floors</span>
                          {hostelObj?.availability && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-semibold">
                                {hostelObj.availability.totalAvailableRooms} room{hostelObj.availability.totalAvailableRooms === 1 ? "" : "s"} with free beds ({targetSize}-bed)
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isLeader && !isLocked && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveHostel(index, -1)}
                          disabled={index === 0}
                          title="Move up in priority"
                          className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          ⬆️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveHostel(index, 1)}
                          disabled={index === prefData.preferredHostels.length - 1}
                          title="Move down in priority"
                          className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          ⬇️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleHostel(hId)}
                          title="Remove from choices"
                          className="p-1 rounded-md text-rose-500 hover:bg-rose-50"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 text-center text-xs text-slate-400">
            No hostels selected yet. Click an eligible hostel below to add it to your priority ranking.
          </div>
        )}

        {/* Available Eligible Hostels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          {options.map((h) => {
            const isSelected = prefData.preferredHostels.includes(h.id);
            const rankIndex = prefData.preferredHostels.indexOf(h.id);
            const canSelect = isSelected || prefData.preferredHostels.length < 3;

            return (
              <div
                key={h.id}
                onClick={() => isLeader && !isLocked && canSelect && handleToggleHostel(h.id)}
                className={`relative p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/50 shadow-xs"
                    : isLeader && !isLocked && canSelect
                    ? "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs cursor-pointer"
                    : "border-slate-200 bg-slate-50/60 opacity-80"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-900">{h.name}</span>
                    {isSelected && (
                      <span className="shrink-0 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Choice #{rankIndex + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-mono font-semibold">{h.code}</span>
                    <span>•</span>
                    <span className="capitalize">{h.gender}</span>
                    <span>•</span>
                    <span>{h.totalFloors} floors</span>
                  </div>

                  {/* Availability breakdown */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 font-medium">Free {targetSize}-Bed:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                        ❄️ {h.availability.ac.rooms} AC
                      </span>
                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                        🍃 {h.availability.nonAc.rooms} Non-AC
                      </span>
                    </div>
                  </div>
                </div>

                {isLeader && !isLocked && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      disabled={!canSelect}
                      className={`text-[11px] font-bold ${
                        isSelected
                          ? "text-rose-600 hover:underline"
                          : canSelect
                          ? "text-indigo-600 hover:underline"
                          : "text-slate-400"
                      }`}
                    >
                      {isSelected ? "Remove Choice" : canSelect ? "+ Add Choice" : "Max 3 Reached"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 2: AC vs Non-AC Preference */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Step 2: AC or Non-AC Preference</h3>
          <p className="text-xs text-slate-500">
            Indicate your climate comfort level. Choose flexibility if you want the highest chance of receiving your top-choice hostel.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {Object.values(AC_DETAILS).map((opt) => {
            const isSelected = prefData.acType === opt.value;
            const isSuggested = suggestedAcType === opt.value;

            return (
              <div
                key={opt.value}
                onClick={() => isLeader && !isLocked && setPrefData((p) => ({ ...p, acType: opt.value }))}
                className={`relative p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-600"
                    : isLeader && !isLocked
                    ? "border-slate-200 bg-white hover:border-slate-300 cursor-pointer"
                    : "border-slate-200 bg-slate-50/50"
                }`}
              >
                {isSuggested && (
                  <span className="absolute -top-2.5 right-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    ✨ Recommended for Group
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{opt.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 3: Floor Height Preference */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Step 3: Floor Height Preference</h3>
          <p className="text-xs text-slate-500">
            Bands are calculated relative to each hostel's height (e.g. bottom third vs. upper floors).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Object.values(FLOOR_DETAILS).map((opt) => {
            const isSelected = prefData.floorPreference === opt.value;

            return (
              <div
                key={opt.value}
                onClick={() =>
                  isLeader && !isLocked && setPrefData((p) => ({ ...p, floorPreference: opt.value }))
                }
                className={`relative p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-600"
                    : isLeader && !isLocked
                    ? "border-slate-200 bg-white hover:border-slate-300 cursor-pointer"
                    : "border-slate-200 bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{opt.icon}</span>
                  <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{opt.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Action */}
      {isLeader && !isLocked && (
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            Saved changes apply to the group immediately and can be revised anytime before room allocation locks.
          </p>
          <Button
            variant="primary"
            size="md"
            loading={saving}
            onClick={handleSave}
            className="w-full sm:w-auto px-6 font-bold"
          >
            Save Room Preferences
          </Button>
        </div>
      )}
    </div>
  );
}
