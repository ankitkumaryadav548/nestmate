"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "@/lib/axios";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import {
  QUESTIONS,
  DEAL_BREAKER_OPTIONS,
  LANGUAGE_OPTIONS,
  QUESTIONNAIRE_STEPS,
} from "@/config/questionnaire";

export default function StudentPreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedAt, setCompletedAt] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [stepErrors, setStepErrors] = useState({});

  // Questionnaire form state
  const [answers, setAnswers] = useState({
    sleepSchedule: null,
    studyTime: null,
    nightCalls: null,
    cleanliness: 3,
    noiseTolerance: 3,
    socialLevel: 3,
    acPreference: "no-preference",
    foodType: null,
    okWithDifferentFood: null,
    languages: ["English"],
    culturalComfort: "no-preference",
    dealBreakers: [],
  });

  const [customLanguage, setCustomLanguage] = useState("");

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await axios.get("/api/students/me/preferences");
      if (res.data?.success && res.data.data) {
        const pref = res.data.data;
        setAnswers({
          sleepSchedule: pref.sleepSchedule || null,
          studyTime: pref.studyTime || null,
          nightCalls: pref.nightCalls || null,
          cleanliness: pref.cleanliness ?? 3,
          noiseTolerance: pref.noiseTolerance ?? 3,
          socialLevel: pref.socialLevel ?? 3,
          acPreference: pref.acPreference || "no-preference",
          foodType: pref.foodType || null,
          okWithDifferentFood: pref.okWithDifferentFood ?? null,
          languages: Array.isArray(pref.languages) && pref.languages.length > 0 ? pref.languages : ["English"],
          culturalComfort: pref.culturalComfort || "no-preference",
          dealBreakers: Array.isArray(pref.dealBreakers) ? pref.dealBreakers : [],
        });
        setCompletedAt(pref.completedAt || null);
      }
    } catch (err) {
      console.error("Failed to load preferences:", err);
      setErrorMsg("Failed to load your questionnaire responses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleSelectOption = (key, value) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (stepErrors[key]) {
      setStepErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleScaleSelect = (key, num) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: num,
    }));
  };

  const handleToggleLanguage = (lang) => {
    setAnswers((prev) => {
      const exists = prev.languages.includes(lang);
      let updated;
      if (exists) {
        updated = prev.languages.filter((l) => l !== lang);
      } else {
        updated = [...prev.languages, lang];
      }
      return { ...prev, languages: updated };
    });
    if (stepErrors.languages) {
      setStepErrors((prev) => {
        const next = { ...prev };
        delete next.languages;
        return next;
      });
    }
  };

  const handleAddCustomLanguage = (e) => {
    e.preventDefault();
    if (!customLanguage.trim()) return;
    const trimmed = customLanguage.trim();
    if (!answers.languages.includes(trimmed)) {
      setAnswers((prev) => ({
        ...prev,
        languages: [...prev.languages, trimmed],
      }));
    }
    setCustomLanguage("");
  };

  const handleToggleDealBreaker = (key) => {
    setAnswers((prev) => {
      const exists = prev.dealBreakers.includes(key);
      const updated = exists
        ? prev.dealBreakers.filter((k) => k !== key)
        : [...prev.dealBreakers, key];
      return { ...prev, dealBreakers: updated };
    });
  };

  const validateStep = (stepNumber) => {
    const errors = {};
    if (stepNumber === 1) {
      if (!answers.sleepSchedule) errors.sleepSchedule = "Please choose your sleep schedule";
      if (!answers.studyTime) errors.studyTime = "Please choose your primary study time";
      if (!answers.nightCalls) errors.nightCalls = "Please choose your late-night call frequency";
    } else if (stepNumber === 2) {
      if (!answers.cleanliness) errors.cleanliness = "Please rate your cleanliness preference";
      if (!answers.noiseTolerance) errors.noiseTolerance = "Please rate your noise tolerance";
      if (!answers.socialLevel) errors.socialLevel = "Please rate your social visitor preference";
      if (!answers.acPreference) errors.acPreference = "Please select your AC preference";
    } else if (stepNumber === 3) {
      if (!answers.foodType) errors.foodType = "Please select your dietary lifestyle";
      if (answers.okWithDifferentFood === null || answers.okWithDifferentFood === undefined) {
        errors.okWithDifferentFood = "Please specify dietary sharing tolerance";
      }
      if (!answers.languages || answers.languages.length === 0) {
        errors.languages = "Please select at least one language";
      }
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    // Validate all 3 core steps
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setErrorMsg("Please complete all required questions across earlier steps.");
      return;
    }

    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await axios.put("/api/students/me/preferences", answers);
      if (res.data?.success) {
        setCompletedAt(res.data.data.completedAt);
        setSuccessMsg("Your lifestyle preferences and deal-breakers have been saved successfully!");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Save preferences error:", err);
      const data = err.response?.data;
      setErrorMsg(data?.message || "Failed to save preferences. Please check your answers.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 py-12 px-4 max-w-4xl mx-auto w-full animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="h-4 bg-slate-100 rounded w-1/2"></div>
        <div className="h-24 bg-slate-100 rounded-2xl"></div>
        <div className="h-96 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  const currentStepDef = QUESTIONNAIRE_STEPS.find((s) => s.id === currentStep);
  const progressPercent = (currentStep / 4) * 100;

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Lifestyle Questionnaire
            </h1>
            {completedAt ? (
              <Badge variant="success" size="sm">
                ✓ Questionnaire Completed
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                Pending Submission
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Tell us about your daily routines, living habits, and deal-breakers to find compatible roommates.
          </p>
        </div>

        {completedAt && (
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shrink-0">
            <span className="font-semibold text-slate-700">Last confirmed:</span>{" "}
            {new Date(completedAt).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-indigo-900 flex items-start gap-3">
        <span className="text-xl">🔒</span>
        <div className="space-y-1">
          <p className="font-bold text-indigo-950">100% Confidential & Private</p>
          <p className="text-indigo-800 leading-relaxed">
            Your responses are strictly confidential. <strong>No other student can see your profile or answers.</strong>{" "}
            This data is used solely by the allocation algorithm to compute anonymous compatibility scores and ensure
            peaceful, harmonious hostel living.
          </p>
        </div>
      </div>

      {/* Success / Error Messages */}
      {successMsg && (
        <div className="mb-6">
          <Alert variant="success" title="Preferences Saved" onClose={() => setSuccessMsg("")}>
            {successMsg}
          </Alert>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6">
          <Alert variant="danger" title="Error" onClose={() => setErrorMsg("")}>
            {errorMsg}
          </Alert>
        </div>
      )}

      {/* Multi-Step Wizard Progress Bar */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Step {currentStep} of 4: {currentStepDef?.title}
          </span>
          <span className="text-xs font-semibold text-slate-500">{progressPercent}% Completed</span>
        </div>

        {/* Progress track */}
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Tabs */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {QUESTIONNAIRE_STEPS.map((s) => {
            const isDone = s.id < currentStep;
            const isCurrent = s.id === currentStep;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id < currentStep || validateStep(currentStep)) {
                    setCurrentStep(s.id);
                  }
                }}
                className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                  isCurrent
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold"
                    : isDone
                    ? "border-emerald-200 bg-emerald-50/50 text-emerald-800 font-medium"
                    : "border-slate-200 bg-slate-50/50 text-slate-400 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{s.icon}</span>
                  <span className="hidden sm:inline truncate">{s.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm mb-8">
        {/* STEP 1: DAILY ROUTINE */}
        {currentStep === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>⏰</span> Daily Routine & Sleep Habits
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Aligning wake and rest schedules prevents common roommate friction and study interruptions.
              </p>
            </div>

            {/* sleepSchedule */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-800">
                1. Sleep Schedule <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500">When do you typically sleep on most weekdays and nights?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: "early", label: "Early to Bed", desc: "Sleeps before 10:00 PM", icon: "🌅" },
                  { value: "normal", label: "Normal Hours", desc: "10:00 PM - 12:00 AM", icon: "🌙" },
                  { value: "late", label: "Night Owl", desc: "After 12:00 AM (midnight)", icon: "🦉" },
                ].map((opt) => {
                  const isSelected = answers.sleepSchedule === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectOption("sleepSchedule", opt.value)}
                      className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className="text-2xl">{opt.icon}</span>
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                          }`}
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
              {stepErrors.sleepSchedule && (
                <p className="text-xs text-rose-600 font-medium">{stepErrors.sleepSchedule}</p>
              )}
            </div>

            {/* studyTime */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-800">
                2. Preferred Study Time <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500">At what time of day are you most productive for focused study?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { value: "morning", label: "Morning Person", desc: "Dawn to midday focus", icon: "☕" },
                  { value: "daytime", label: "Daytime", desc: "Afternoon & early evening", icon: "☀️" },
                  { value: "night", label: "Late Night", desc: "Quiet midnight hours", icon: "🌌" },
                  { value: "flexible", label: "Flexible", desc: "Adapts easily to schedule", icon: "🔄" },
                ].map((opt) => {
                  const isSelected = answers.studyTime === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectOption("studyTime", opt.value)}
                      className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
              {stepErrors.studyTime && (
                <p className="text-xs text-rose-600 font-medium">{stepErrors.studyTime}</p>
              )}
            </div>

            {/* nightCalls */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-800">
                3. Late-Night Phone / Video Calls <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500">
                How often do you make or receive calls after 11 PM (e.g. family or friends in other time zones)?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: "never", label: "Rarely or Never", desc: "No late calls in room", icon: "🔕" },
                  { value: "sometimes", label: "Occasionally", desc: "Brief calls or weekends", icon: "📱" },
                  { value: "often", label: "Frequently", desc: "Regular late-night calls", icon: "🌐" },
                ].map((opt) => {
                  const isSelected = answers.nightCalls === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectOption("nightCalls", opt.value)}
                      className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
              {stepErrors.nightCalls && (
                <p className="text-xs text-rose-600 font-medium">{stepErrors.nightCalls}</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: LIVING HABITS */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🏡</span> Living Habits & Space Sharing
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Scale ratings (1 to 5) allow the matching system to pair students with harmonious living standards.
              </p>
            </div>

            {/* Cleanliness */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-800">
                  1. Cleanliness & Organization <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                  Rating: {answers.cleanliness} / 5
                </span>
              </div>
              <p className="text-xs text-slate-500">How tidy do you keep your room and personal space?</p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleScaleSelect("cleanliness", num)}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                      answers.cleanliness === num
                        ? "border-indigo-600 bg-indigo-600 text-white shadow"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>1 - Relaxed / Easygoing</span>
                <span>3 - Moderate / Tidy</span>
                <span>5 - Spotless / Pristine</span>
              </div>
            </div>

            {/* Noise Tolerance */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-800">
                  2. Noise Tolerance <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                  Rating: {answers.noiseTolerance} / 5
                </span>
              </div>
              <p className="text-xs text-slate-500">How sensitive are you to room ambient noise while sleeping or concentrating?</p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleScaleSelect("noiseTolerance", num)}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                      answers.noiseTolerance === num
                        ? "border-indigo-600 bg-indigo-600 text-white shadow"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>1 - Needs Pin-Drop Silence</span>
                <span>3 - Average Ambience</span>
                <span>5 - Fine with Activity & Chatter</span>
              </div>
            </div>

            {/* Social Level */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-800">
                  3. Social Level & Visitors in Room <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                  Rating: {answers.socialLevel} / 5
                </span>
              </div>
              <p className="text-xs text-slate-500">How frequently do you invite classmates or friends into your room?</p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleScaleSelect("socialLevel", num)}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                      answers.socialLevel === num
                        ? "border-indigo-600 bg-indigo-600 text-white shadow"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>1 - Quiet Sanctuary / Few Visitors</span>
                <span>3 - Occasional Hangouts</span>
                <span>5 - Social Hub / Frequent Friends Over</span>
              </div>
            </div>

            {/* AC Preference */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-800">
                4. AC Preference <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500">What cooling climate do you prefer for your room?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: "ac", label: "Air Conditioned (AC)", desc: "Cooling room required", icon: "❄️" },
                  { value: "non-ac", label: "Non-AC (Ventilated)", desc: "Fan and breeze fine", icon: "🍃" },
                  { value: "no-preference", label: "No Preference", desc: "Either AC or Non-AC works", icon: "⚖️" },
                ].map((opt) => {
                  const isSelected = answers.acPreference === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectOption("acPreference", opt.value)}
                      className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: FOOD & LANGUAGE */}
        {currentStep === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🍽️</span> Dietary Preferences & Communication
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Accommodation respects all personal dietary traditions and multilingual campus environments.
              </p>
            </div>

            {/* foodType */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-800">
                1. Dietary Lifestyle <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500">What type of meals do you consume?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { value: "veg", label: "Vegetarian", desc: "Plant-based, dairy permitted", icon: "🥗" },
                  { value: "non-veg", label: "Non-Vegetarian", desc: "Includes meat & seafood", icon: "🍗" },
                  { value: "eggetarian", label: "Eggetarian", desc: "Vegetarian plus eggs", icon: "🍳" },
                  { value: "halal", label: "Halal Non-Veg", desc: "Strictly Halal non-vegetarian", icon: "🥩" },
                  { value: "jain", label: "Jain Vegetarian", desc: "Pure veg without root vegetables", icon: "🌱" },
                ].map((opt) => {
                  const isSelected = answers.foodType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectOption("foodType", opt.value)}
                      className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
              {stepErrors.foodType && (
                <p className="text-xs text-rose-600 font-medium">{stepErrors.foodType}</p>
              )}
            </div>

            {/* okWithDifferentFood */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-800">
                2. Dietary Sharing Tolerance <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500">
                Are you comfortable sharing your room with a student who consumes a different diet?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    value: true,
                    label: "Comfortable with Any Diet",
                    desc: "I don't mind what my roommate eats",
                    icon: "🤝",
                  },
                  {
                    value: false,
                    label: "Prefer Same Diet Only",
                    desc: "I strongly prefer a roommate with a matching diet",
                    icon: "🔒",
                  },
                ].map((opt) => {
                  const isSelected = answers.okWithDifferentFood === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => handleSelectOption("okWithDifferentFood", opt.value)}
                      className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
              {stepErrors.okWithDifferentFood && (
                <p className="text-xs text-rose-600 font-medium">{stepErrors.okWithDifferentFood}</p>
              )}
            </div>

            {/* languages */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-800">
                3. Languages Spoken / Understood <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500">
                Select all languages you comfortably speak or understand. You can also add custom languages below.
              </p>

              {/* Pills grid */}
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.filter((l) => l !== "Other").map((lang) => {
                  const isSelected = answers.languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleToggleLanguage(lang)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {lang}
                    </button>
                  );
                })}

                {/* Custom languages not in standard list */}
                {answers.languages
                  .filter((l) => !LANGUAGE_OPTIONS.includes(l))
                  .map((custom) => (
                    <button
                      key={custom}
                      type="button"
                      onClick={() => handleToggleLanguage(custom)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border border-indigo-600 bg-indigo-600 text-white shadow-xs"
                    >
                      ✓ {custom} (Custom) ✕
                    </button>
                  ))}
              </div>

              {/* Add custom language input */}
              <div className="pt-2 flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  placeholder="Add another language..."
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                />
                <button
                  type="button"
                  onClick={handleAddCustomLanguage}
                  className="rounded-xl bg-slate-100 border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  + Add
                </button>
              </div>

              {stepErrors.languages && (
                <p className="text-xs text-rose-600 font-medium">{stepErrors.languages}</p>
              )}
            </div>

            {/* culturalComfort */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-800">
                  4. Cultural Background Comfort
                </label>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Optional / Low Weight
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Self-declared comfort inclination. Never used to rank or exclude anyone.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    value: "open-to-all",
                    label: "Open to All",
                    desc: "Excited to live with anyone from any region or nation",
                    icon: "🌍",
                  },
                  {
                    value: "prefer-similar-background",
                    label: "Prefer Similar Background",
                    desc: "Feel slightly more at home with someone of familiar background",
                    icon: "🏡",
                  },
                  {
                    value: "no-preference",
                    label: "No Preference",
                    desc: "No specific inclination",
                    icon: "🤝",
                  },
                ].map((opt) => {
                  const isSelected = answers.culturalComfort === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectOption("culturalComfort", opt.value)}
                      className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: DEAL-BREAKERS & REVIEW */}
        {currentStep === 4 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🛡️</span> Non-Negotiable Deal-Breakers & Review
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Deal-breakers act as strict binary filters. Any roommate candidate who violates a deal-breaker
                will never be paired with you.
              </p>
            </div>

            {/* Deal Breakers List */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-800">
                Select Your Strict Deal-Breakers (Optional)
              </label>
              <div className="grid grid-cols-1 gap-3">
                {DEAL_BREAKER_OPTIONS.map((db) => {
                  const isChecked = answers.dealBreakers.includes(db.key);
                  return (
                    <button
                      key={db.key}
                      type="button"
                      onClick={() => handleToggleDealBreaker(db.key)}
                      className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
                        isChecked
                          ? "border-rose-300 bg-rose-50/40 shadow-xs ring-1 ring-rose-400"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="text-2xl shrink-0 mt-0.5">{db.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">{db.label}</span>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                              isChecked
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isChecked ? "Active Constraint" : "Not Active"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{db.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comprehensive Review Summary */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>Response Summary Review</span>
                <span className="text-xs text-indigo-600 font-semibold">Ready to Confirm</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-500">Sleep Schedule:</span>
                  <p className="font-bold text-slate-900 capitalize mt-0.5">{answers.sleepSchedule || "Not answered"}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Preferred Study Time:</span>
                  <p className="font-bold text-slate-900 capitalize mt-0.5">{answers.studyTime || "Not answered"}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Late-Night Calls:</span>
                  <p className="font-bold text-slate-900 capitalize mt-0.5">{answers.nightCalls || "Not answered"}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">AC Preference:</span>
                  <p className="font-bold text-slate-900 uppercase mt-0.5">{answers.acPreference || "No preference"}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Dietary Type:</span>
                  <p className="font-bold text-slate-900 capitalize mt-0.5">{answers.foodType || "Not answered"}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Dietary Sharing Comfort:</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {answers.okWithDifferentFood ? "Comfortable with any diet" : "Prefers same diet only"}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Cleanliness & Noise:</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    Cleanliness: {answers.cleanliness}/5 · Noise: {answers.noiseTolerance}/5 · Social: {answers.socialLevel}/5
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Languages:</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {answers.languages.length > 0 ? answers.languages.join(", ") : "None selected"}
                  </p>
                </div>
              </div>

              {answers.dealBreakers.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-500 text-xs">Active Deal-Breakers:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {answers.dealBreakers.map((key) => {
                      const db = DEAL_BREAKER_OPTIONS.find((d) => d.key === key);
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-100 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-800"
                        >
                          🛡️ {db?.label || key}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          <div>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                &larr; Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 4 ? (
              <Button type="button" variant="primary" onClick={handleNext}>
                Continue &rarr;
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                loading={saving}
                disabled={saving}
              >
                {saving ? "Submitting Answers..." : "✓ Submit Questionnaire"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
