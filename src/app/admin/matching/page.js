"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import {
  PageContainer,
  Card,
  Badge,
  Button,
  ConfirmDialog,
  Alert,
  Tabs,
  ScoreRing,
  ProgressBar,
  Avatar,
} from "@/components/ui";
import {
  AdminPageHeader,
  DonutRing,
  StatusBadge,
} from "@/components/admin";
import { CATEGORY_LABELS } from "@/config/matching";

export default function AdminMatchingPage() {
  useDocumentTitle("Matching Configuration", true);
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
      setSettingsAlert({ type: "danger", message: "Failed to load matching settings" });
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
        type: "danger",
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
        type: "danger",
        message: err.response?.data?.message || "Failed to reset settings",
      });
    } finally {
      setSavingSettings(false);
    }
  };

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

  const matchingTabs = [
    { id: "settings", label: "Algorithm Weights" },
    { id: "pairChecker", label: "Pair Checker & Top Matches" },
  ];

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      {/* Header */}
      <AdminPageHeader
        title="Matching Engine Console"
        description="Configure algorithm category weights, inspect pairwise compatibility diagnostics, and check student affinities."
        breadcrumbs={[{ label: "Matching" }]}
      />

      {/* Tabs */}
      <div className="mb-6">
        <Tabs
          tabs={matchingTabs}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t)}
        />
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: SETTINGS */}
      {/* ---------------------------------------------------- */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {settingsAlert && (
            <Alert
              variant={settingsAlert.type}
              title={settingsAlert.type === "success" ? "Success" : "Notice"}
              onClose={() => setSettingsAlert(null)}
            >
              {settingsAlert.message}
            </Alert>
          )}

          {/* Weights Overview Card with Donut Ring */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                  Lifestyle Category Weights
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                  Distribute exactly 100 percentage points across the 7 questionnaire criteria. These weights directly govern candidate match percentage calculation.
                </p>
              </div>

              {/* Donut Ring Indicator */}
              <div className="flex items-center gap-4 bg-slate-50/60 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shrink-0">
                <DonutRing
                  value={currentTotalWeight}
                  max={100}
                  size={84}
                  strokeWidth={8}
                  centerValue={`${currentTotalWeight}%`}
                  centerLabel="Total"
                  color={isWeightValid ? "var(--accent-teal)" : "var(--accent-rose)"}
                />
                <div>
                  <span className="text-xs font-bold block text-slate-900 dark:text-slate-100">
                    {isWeightValid ? "Weights Balanced" : "Imbalanced"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {isWeightValid ? "Sum equals 100%" : "Must total exactly 100%"}
                  </span>
                </div>
              </div>
            </div>

            {/* Weights Grid with Sliders & Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-6">
              {Object.keys(weights).map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {CATEGORY_LABELS[key] || key}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {categoryExplanations[key]}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={weights[key]}
                        onChange={(e) => handleWeightChange(key, e.target.value)}
                        className="w-10 text-center text-sm font-bold text-slate-900 dark:text-slate-100 bg-transparent focus:outline-hidden"
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
                    className="w-full accent-indigo-600 dark:accent-indigo-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* Academic Year Bonus Section */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                  Academic Year Cohort Bonus
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Points added to the base weighted score when students share similar academic standing.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3.5 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
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
                      className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">bonus pts</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3.5 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
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
                      className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">bonus pts</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3.5 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
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
                      className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">bonus pts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Button
                variant="secondary"
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
                isLoading={savingSettings}
                disabled={!isWeightValid || savingSettings}
              >
                Save Algorithm Configuration
              </Button>
            </div>
          </Card>

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
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                Pairwise Compatibility Diagnostic
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select two students to audit mutual compatibility, deal-breaker violations, and category scores.
              </p>
            </div>

            {/* Student Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student A Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Student A
                </label>
                <input
                  type="text"
                  placeholder="Search by name or reg # (e.g. DEMO-0001)"
                  value={searchStudentA}
                  onChange={(e) => setSearchStudentA(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
                />
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  {filterStudents(searchStudentA).map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentA(s);
                        setSearchStudentA(`${s.name} (${s.registrationNumber || s.email})`);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center justify-between ${
                        selectedStudentA?._id === s._id ? "bg-indigo-50/80 dark:bg-indigo-950/60 font-bold" : ""
                      }`}
                    >
                      <span className="truncate text-slate-800 dark:text-slate-200">{s.name}</span>
                      <span className="text-[11px] text-slate-500 uppercase">{s.gender} • Yr {s.year}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Student B Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Student B
                </label>
                <input
                  type="text"
                  placeholder="Search by name or reg # (e.g. DEMO-0002)"
                  value={searchStudentB}
                  onChange={(e) => setSearchStudentB(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
                />
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  {filterStudents(searchStudentB).map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentB(s);
                        setSearchStudentB(`${s.name} (${s.registrationNumber || s.email})`);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center justify-between ${
                        selectedStudentB?._id === s._id ? "bg-indigo-50/80 dark:bg-indigo-950/60 font-bold" : ""
                      }`}
                    >
                      <span className="truncate text-slate-800 dark:text-slate-200">{s.name}</span>
                      <span className="text-[11px] text-slate-500 uppercase">{s.gender} • Yr {s.year}</span>
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
                isLoading={pairEvaluating}
                disabled={!selectedStudentA || !selectedStudentB || pairEvaluating}
              >
                Evaluate Pair Compatibility
              </Button>
            </div>

            {/* Pair Diagnostic Result Box */}
            {pairError && <Alert variant="danger" title="Error">{pairError}</Alert>}

            {pairResult && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-6 space-y-6">
                {/* Result Status Banner with ScoreRing */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    {pairResult.eligible ? (
                      <ScoreRing score={pairResult.score} size={68} strokeWidth={6} />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl font-bold">
                        â›”
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
                          {pairResult.eligible ? "Eligible Pairing" : "Ineligible / Excluded"}
                        </span>
                        <Badge
                          variant={pairResult.eligible ? "success" : "danger"}
                          size="md"
                        >
                          {pairResult.eligible ? `${pairResult.score}% ${pairResult.label}` : "Excluded"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {pairResult.message || `Score: ${pairResult.score}% (Base: ${pairResult.baseScore}%, Year Bonus: +${pairResult.yearBonus}%)`}
                      </p>
                    </div>
                  </div>

                  {pairResult.sharedLanguages?.length > 0 && (
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 uppercase block">Shared Languages</span>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                        {pairResult.sharedLanguages.join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Room Size Mismatch Note */}
                {pairResult.note && (
                  <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-amber-900 dark:text-amber-300 text-xs font-medium flex items-center gap-2">
                    <span>Warning:
                    <span>{pairResult.note}</span>
                  </div>
                )}

                {/* Exclusions / Deal-Breaker Violations */}
                {pairResult.violations?.length > 0 && (
                  <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 font-heading">
                      Deal-Breaker Violations Detected
                    </h4>
                    <div className="space-y-1.5">
                      {pairResult.violations.map((v, i) => (
                        <div key={i} className="text-xs text-rose-900 dark:text-rose-200 flex items-center gap-2">
                          <span>âŒ</span>
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
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-heading">
                      Category Breakdown
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {pairResult.breakdown.map((cat) => (
                        <div
                          key={cat.key}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.label}</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{cat.percent}%</span>
                          </div>
                          <ProgressBar
                            value={cat.percent}
                            max={100}
                            color={cat.percent >= 75 ? "success" : cat.percent >= 50 ? "brand" : "warning"}
                            size="sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Affinities & Warnings */}
                {pairResult.reasons?.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 font-heading">
                      Affinities
                    </h4>
                    {pairResult.reasons.map((r, i) => (
                      <p key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className="text-teal-600 font-bold"></span> {r}
                      </p>
                    ))}
                  </div>
                )}

                {pairResult.warnings?.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 font-heading">
                      Warnings
                    </h4>
                    {pairResult.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
                        <span>Warning: {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Top Matches Inspector */}
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                Student Top Matches Inspector
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
                />
                <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/50 mt-1">
                  {filterStudents(searchSoloStudent).map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        setSelectedSoloStudent(s);
                        setSearchSoloStudent(`${s.name} (${s.registrationNumber || s.email})`);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-between text-slate-800 dark:text-slate-200"
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="text-[11px] text-slate-500">{s.gender} • Yr {s.year}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={handleFetchSoloTopMatches}
                isLoading={soloTopLoading}
                disabled={!selectedSoloStudent || soloTopLoading}
              >
                Inspect Top Matches
              </Button>
            </div>

            {soloTopError && <Alert variant="danger" title="Error">{soloTopError}</Alert>}

            {soloTopResult && (
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-heading">
                  Top Recommended Candidates for {soloTopResult.student?.name}
                </h4>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {soloTopResult.matches?.map((m, idx) => (
                    <div
                      key={m.student?._id || idx}
                      className="p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={m.student?.name} size="sm" />
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                            {m.student?.name}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">
                            {m.student?.registrationNumber} • Year {m.student?.year}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <ScoreRing score={m.score} size={42} strokeWidth={4} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
