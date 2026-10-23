"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Alert from "@/components/ui/Alert";
import { CATEGORY_LABELS } from "@/config/matching";

export default function AdminMatchingPage() {
  const [activeTab, setActiveTab] = useState("settings"); // "settings" | "pairChecker"

  // ----------------------------------------------------
  // SETTINGS TAB STATE
  // ----------------------------------------------------
  const [weights, setWeights] = useState({
    sleepSchedule: 20,
    studyTime: 20,
    cleanliness: 15,
    noiseTolerance: 15,
    foodType: 10,
    socialLevel: 10,
    languageAndCalls: 10,
  });

  const [yearBonus, setYearBonus] = useState({
    sameYear: 5,
    oneYearApart: 2,
    otherwise: 0,
  });

  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsAlert, setSettingsAlert] = useState(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // ----------------------------------------------------
  // PAIR CHECKER TAB STATE
  // ----------------------------------------------------
  const [studentsList, setStudentsList] = useState([]);
  const [searchStudentA, setSearchStudentA] = useState("");
  const [searchStudentB, setSearchStudentB] = useState("");
  const [selectedStudentA, setSelectedStudentA] = useState(null);
  const [selectedStudentB, setSelectedStudentB] = useState(null);
  const [pairEvaluating, setPairEvaluating] = useState(false);
  const [pairResult, setPairResult] = useState(null);
  const [pairError, setPairError] = useState(null);

  // Top Matches for Single Student State
  const [searchSoloStudent, setSearchSoloStudent] = useState("");
  const [selectedSoloStudent, setSelectedSoloStudent] = useState(null);
  const [soloTopLoading, setSoloTopLoading] = useState(false);
  const [soloTopResult, setSoloTopResult] = useState(null);
  const [soloTopError, setSoloTopError] = useState(null);

  // Load Settings on Mount
  useEffect(() => {
    fetchSettings();
    fetchStudentDirectory();
  }, []);

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get("/admin/matching/settings");
      if (res.data?.success) {
        const data = res.data.data;
        if (data.weights) setWeights(data.weights);
        if (data.yearBonus) setYearBonus(data.yearBonus);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      setSettingsAlert({ type: "error", message: "Failed to load matching settings" });
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchStudentDirectory = async () => {
    try {
      const res = await api.get("/admin/students", { params: { limit: 100 } });
      if (res.data?.success) {
        setStudentsList(res.data.data?.students || []);
      }
    } catch (err) {
      console.error("Failed to load student directory:", err);
    }
  };

  // Calculate live total weights
  const currentTotalWeight = Object.values(weights).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0
  );
  const isWeightValid = currentTotalWeight === 100;

  const handleWeightChange = (key, value) => {
    const parsed = Math.max(0, Math.min(100, Number(value) || 0));
    setWeights((prev) => ({ ...prev, [key]: parsed }));
  };

  const handleSaveSettings = async () => {
    if (!isWeightValid) return;
    setSavingSettings(true);
    setSettingsAlert(null);
    try {
      const res = await api.put("/admin/matching/settings", {
        weights,
        yearBonus,
      });
      if (res.data?.success) {
        setSettingsAlert({
          type: "success",
          message: "Algorithm configuration saved successfully! Scores will now reflect new weights.",
        });
      }
    } catch (err) {
      setSettingsAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to save matching settings",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetSettings = async () => {
    setResetConfirmOpen(false);
    setSavingSettings(true);
    setSettingsAlert(null);
    try {
      const res = await api.post("/admin/matching/settings/reset");
      if (res.data?.success) {
        setWeights(res.data.data.weights);
        setYearBonus(res.data.data.yearBonus);
        setSettingsAlert({
          type: "success",
          message: "Algorithm weights reset to system defaults (100% total).",
        });
      }
    } catch (err) {
      setSettingsAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to reset settings",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // ----------------------------------------------------
  // PAIR EVALUATION
  // ----------------------------------------------------
  const handleEvaluatePair = async () => {
    if (!selectedStudentA || !selectedStudentB) return;
    setPairEvaluating(true);
    setPairResult(null);
    setPairError(null);

    try {
      const res = await api.get("/admin/matching/pair", {
        params: {
          studentA: selectedStudentA._id,
          studentB: selectedStudentB._id,
        },
      });
      if (res.data?.success) {
        setPairResult(res.data.data);
      }
    } catch (err) {
      setPairError(err.response?.data?.message || "Pair evaluation failed");
    } finally {
      setPairEvaluating(false);
    }
  };

  // ----------------------------------------------------
  // TOP MATCHES FOR SINGLE STUDENT
  // ----------------------------------------------------
  const handleFetchSoloTopMatches = async () => {
    if (!selectedSoloStudent) return;
    setSoloTopLoading(true);
    setSoloTopResult(null);
    setSoloTopError(null);

    try {
      const res = await api.get(`/admin/matching/students/${selectedSoloStudent._id}/top`, {
        params: { limit: 10 },
      });
      if (res.data?.success) {
        setSoloTopResult(res.data.data);
      }
    } catch (err) {
      setSoloTopError(err.response?.data?.message || "Failed to load top matches");
    } finally {
      setSoloTopLoading(false);
    }
  };

  const filterStudents = (query) => {
    if (!query) return studentsList.slice(0, 10);
    const q = query.toLowerCase();
    return studentsList.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.registrationNumber?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
    );
  };

  const categoryExplanations = {
    sleepSchedule: "Synchronizes waking and sleeping hours (early risers vs night owls).",
    studyTime: "Aligns focus and concentration hours within the shared residence room.",
    cleanliness: "Tidiness, desk organization, and frequency of daily cleaning routines.",
    noiseTolerance: "Sensitivity to room background ambience, music, and quiet study hours.",
    foodType: "Dietary habits (veg, non-veg, halal, jain) and dietary sharing tolerance.",
    socialLevel: "Comfort with hosting friends, study partners, and visitors in the room.",
    languageAndCalls: "Common spoken languages for effortless communication & late-night phone call comfort.",
  };

  return (
    <div className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Matching Engine Console
            </h1>
            <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 px-3 py-0.5 text-xs font-bold">
              Administrator Access
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure algorithm category weights, inspect pairwise compatibility diagnostics, and check student affinities.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "settings"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ⚙️ Algorithm Weights
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pairChecker")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "pairChecker"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🔍 Pair Checker & Top Matches
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: SETTINGS */}
      {/* ---------------------------------------------------- */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {settingsAlert && (
            <Alert
              type={settingsAlert.type}
              message={settingsAlert.message}
              onClose={() => setSettingsAlert(null)}
            />
          )}

          {/* Weights Overview Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Lifestyle Category Weights</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribute 100 percentage points across the 7 lifestyle criteria.
                </p>
              </div>

              {/* Total Weight Status Indicator */}
              <div
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 border font-bold text-xs transition-colors ${
                  isWeightValid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-300"
                }`}
              >
                <span>Total Weight:</span>
                <span className="text-sm font-extrabold">{currentTotalWeight}% / 100%</span>
                <span>{isWeightValid ? "✓ (Valid)" : "⚠️ Must equal 100%"}</span>
              </div>
            </div>

            {/* Weights Grid with Sliders & Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(weights).map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {CATEGORY_LABELS[key] || key}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {categoryExplanations[key]}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={weights[key]}
                        onChange={(e) => handleWeightChange(key, e.target.value)}
                        className="w-12 text-center text-sm font-bold text-slate-900 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="1"
                    value={weights[key]}
                    onChange={(e) => handleWeightChange(key, e.target.value)}
                    className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* Academic Year Bonus Section */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Academic Year Cohort Bonus</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Points added to the base weighted score when students share similar academic standing.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Same Academic Year
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={yearBonus.sameYear}
                      onChange={(e) =>
                        setYearBonus((prev) => ({ ...prev, sameYear: Number(e.target.value) || 0 }))
                      }
                      className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-900"
                    />
                    <span className="text-xs text-slate-500">bonus pts</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">
                    1 Year Apart
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={yearBonus.oneYearApart}
                      onChange={(e) =>
                        setYearBonus((prev) => ({
                          ...prev,
                          oneYearApart: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-900"
                    />
                    <span className="text-xs text-slate-500">bonus pts</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">
                    2+ Years Apart
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={yearBonus.otherwise}
                      onChange={(e) =>
                        setYearBonus((prev) => ({ ...prev, otherwise: Number(e.target.value) || 0 }))
                      }
                      className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-900"
                    />
                    <span className="text-xs text-slate-500">bonus pts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetConfirmOpen(true)}
                disabled={savingSettings}
              >
                Reset to Defaults
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleSaveSettings}
                loading={savingSettings}
                disabled={!isWeightValid || savingSettings}
              >
                Save Algorithm Configuration
              </Button>
            </div>
          </div>

          <ConfirmDialog
            isOpen={resetConfirmOpen}
            onClose={() => setResetConfirmOpen(false)}
            onConfirm={handleResetSettings}
            title="Reset Matching Weights"
            message="Are you sure you want to reset all weights to system defaults? This will revert categories to standard institutional weighting."
            confirmText="Reset to Defaults"
            variant="warning"
          />
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: PAIR CHECKER & TOP MATCHES */}
      {/* ---------------------------------------------------- */}
      {activeTab === "pairChecker" && (
        <div className="space-y-8">
          {/* Pair Evaluation Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Pairwise Compatibility Diagnostic</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select two students to audit mutual compatibility, deal-breaker violations, and category scores.
              </p>
            </div>

            {/* Student Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student A Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Student A
                </label>
                <input
                  type="text"
                  placeholder="Search by name or reg # (e.g. DEMO-0001)"
                  value={searchStudentA}
                  onChange={(e) => setSearchStudentA(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                />
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                  {filterStudents(searchStudentA).map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentA(s);
                        setSearchStudentA(`${s.name} (${s.registrationNumber || s.email})`);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center justify-between ${
                        selectedStudentA?._id === s._id ? "bg-indigo-50/80 font-bold" : ""
                      }`}
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{s.gender} • Yr {s.year}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Student B Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Student B
                </label>
                <input
                  type="text"
                  placeholder="Search by name or reg # (e.g. DEMO-0002)"
                  value={searchStudentB}
                  onChange={(e) => setSearchStudentB(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                />
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                  {filterStudents(searchStudentB).map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentB(s);
                        setSearchStudentB(`${s.name} (${s.registrationNumber || s.email})`);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center justify-between ${
                        selectedStudentB?._id === s._id ? "bg-indigo-50/80 font-bold" : ""
                      }`}
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{s.gender} • Yr {s.year}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={handleEvaluatePair}
                loading={pairEvaluating}
                disabled={!selectedStudentA || !selectedStudentB || pairEvaluating}
              >
                Evaluate Pair Compatibility
              </Button>
            </div>

            {/* Pair Diagnostic Result Box */}
            {pairError && <Alert type="error" message={pairError} />}

            {pairResult && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 space-y-6 animate-in fade-in">
                {/* Result Status Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">
                        {pairResult.eligible ? "Eligible Pairing" : "Ineligible / Excluded"}
                      </span>
                      <Badge
                        variant={pairResult.eligible ? "emerald" : "rose"}
                        size="md"
                      >
                        {pairResult.eligible ? `${pairResult.score}% ${pairResult.label}` : "Excluded"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {pairResult.message || `Score: ${pairResult.score}% (Base: ${pairResult.baseScore}%, Year Bonus: +${pairResult.yearBonus}%)`}
                    </p>
                  </div>

                  {pairResult.sharedLanguages?.length > 0 && (
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Shared Languages</span>
                      <span className="text-xs font-bold text-indigo-700 block">
                        {pairResult.sharedLanguages.join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Exclusions / Deal-Breaker Violations */}
                {pairResult.violations?.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                      Deal-Breaker Violations Detected
                    </h4>
                    <div className="space-y-1">
                      {pairResult.violations.map((v, i) => (
                        <div key={i} className="text-xs text-rose-900 flex items-center gap-2">
                          <span>❌</span>
                          <span>
                            Triggered by <strong>Student {v.by}</strong> on criterion:{" "}
                            <strong className="uppercase">{v.key}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Breakdown Progress Bars if Eligible */}
                {pairResult.breakdown?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Category Breakdown
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pairResult.breakdown.map((cat) => (
                        <div
                          key={cat.key}
                          className="rounded-xl border border-slate-200 bg-white p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">{cat.label}</span>
                            <span className="font-bold text-slate-900">{cat.percent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                cat.percent >= 75
                                  ? "bg-emerald-500"
                                  : cat.percent >= 50
                                  ? "bg-indigo-500"
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${cat.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friendly Reasons & Warnings */}
                {pairResult.reasons?.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Affinities
                    </h4>
                    {pairResult.reasons.map((r, i) => (
                      <p key={i} className="text-xs text-slate-700 flex items-center gap-2">
                        <span className="text-emerald-500 font-bold">✓</span> {r}
                      </p>
                    ))}
                  </div>
                )}

                {pairResult.warnings?.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      Warnings
                    </h4>
                    {pairResult.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-900 flex items-center gap-2">
                        <span>⚠️</span> {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top Matches for Any Student */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Student Top Matches Inspector</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect the top 10 recommended roommates for any specific student in the system.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:max-w-md">
                <input
                  type="text"
                  placeholder="Search student (e.g. DEMO-0001)"
                  value={searchSoloStudent}
                  onChange={(e) => setSearchSoloStudent(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                />
                <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50 mt-1">
                  {filterStudents(searchSoloStudent).map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        setSelectedSoloStudent(s);
                        setSearchSoloStudent(`${s.name} (${s.registrationNumber || s.email})`);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 flex items-center justify-between"
                    >
                      <span>{s.name}</span>
                      <span className="text-[10px] text-slate-500">{s.gender} • Year {s.year}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={handleFetchSoloTopMatches}
                loading={soloTopLoading}
                disabled={!selectedSoloStudent || soloTopLoading}
              >
                Fetch Top Matches
              </Button>
            </div>

            {soloTopError && <Alert type="error" message={soloTopError} />}

            {soloTopResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                  <span>
                    Top matches for <strong>{selectedSoloStudent?.name}</strong> ({soloTopResult.studentGender} pool)
                  </span>
                  <span>{soloTopResult.matches?.length || 0} candidate(s) evaluated</span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {soloTopResult.matches?.map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-700">
                          #{idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>
                          <p className="text-xs text-slate-500">
                            {m.course} • Year {m.year}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {m.sharedLanguages?.length > 0 && (
                          <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            🗣️ {m.sharedLanguages.join(", ")}
                          </span>
                        )}
                        <span
                          className={`text-sm font-extrabold px-3 py-1 rounded-xl border ${
                            m.score >= 85
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : m.score >= 70
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {m.score}% ({m.label})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
