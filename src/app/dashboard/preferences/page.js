"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "@/lib/axios";
import { useToast } from "@/context/ToastContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  Button,
  Badge,
  Alert,
  Stepper,
  ProgressBar,
  OptionCard,
  PageTransition,
  Reveal,
  IconShield,
  IconCheck,
  IconBed,
  IconUsers,
  IconSparkles,
} from "@/components/ui";
import {
  QUESTIONS,
  DEAL_BREAKER_OPTIONS,
  LANGUAGE_OPTIONS,
  QUESTIONNAIRE_STEPS,
} from "@/config/questionnaire";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function StudentPreferencesPage() {
  useDocumentTitle("Lifestyle Preferences");
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedAt, setCompletedAt] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [stepErrors, setStepErrors] = useState({});

  // Questionnaire form state
  const [answers, setAnswers] = useState({
    roomSize: null,
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
          roomSize: pref.roomSize || null,
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
      if (!answers.roomSize) errors.roomSize = "Please select your desired room size";
    } else if (stepNumber === 2) {
      if (!answers.sleepSchedule) errors.sleepSchedule = "Please choose your sleep schedule";
      if (!answers.studyTime) errors.studyTime = "Please choose your primary study time";
      if (!answers.nightCalls) errors.nightCalls = "Please choose your late-night call frequency";
    } else if (stepNumber === 3) {
      if (!answers.cleanliness) errors.cleanliness = "Please rate your cleanliness preference";
      if (!answers.noiseTolerance) errors.noiseTolerance = "Please rate your noise tolerance";
      if (!answers.socialLevel) errors.socialLevel = "Please rate your social visitor preference";
      if (!answers.acPreference) errors.acPreference = "Please select your AC preference";
    } else if (stepNumber === 4) {
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
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      const msg = "Please complete all required questions across earlier steps.";
      setErrorMsg(msg);
      showToast(msg, "warning");
      return;
    }

    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await axios.put("/api/students/me/preferences", answers);
      if (res.data?.success) {
        setCompletedAt(res.data.data.completedAt);
        const successText = "Your lifestyle preferences and deal-breakers have been saved successfully!";
        setSuccessMsg(successText);
        showToast(successText, "success");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Save preferences error:", err);
      const data = err.response?.data;
      const errorText = data?.message || "Failed to save preferences. Please check your answers.";
      setErrorMsg(errorText);
      showToast(errorText, "error");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2" />
        <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        <div className="h-96 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
      </div>
    );
  }

  const stepTitles = [
    "Room Type",
    "Daily Routine",
    "Living Habits",
    "Diet & Language",
    "Review & Constraints",
  ];

  const progressPercent = Math.round((currentStep / 5) * 100);

  return (
    <PageTransition>
      <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <Reveal direction="down">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-heading">
                  Lifestyle Questionnaire
                </h1>
                {completedAt ? (
                  <Badge variant="success" size="sm" dot>
                    ✓ Questionnaire Completed
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm" dot pulse>
                    Pending Submission
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Tell us about your daily routines, living habits, and deal-breakers to find compatible roommates.
              </p>
            </div>

            {completedAt && (
              <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shrink-0">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Last confirmed:</span>{" "}
                {new Date(completedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </Reveal>

        {/* Privacy Guarantee Note Card */}
        <Reveal direction="up" delay={50}>
          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-3">
            <IconShield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-indigo-950 dark:text-indigo-200">100% Confidential & Private</p>
              <p className="text-indigo-800 dark:text-indigo-300/90 leading-relaxed">
                Your responses are strictly confidential. <strong>No other student can see your answers.</strong>{" "}
                This data is used solely by the allocation algorithm to compute anonymous compatibility scores and ensure
                peaceful, harmonious hostel living.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Alerts */}
        {successMsg && (
          <Reveal direction="down">
            <Alert variant="success" title="Preferences Saved" onClose={() => setSuccessMsg("")}>
              {successMsg}
            </Alert>
          </Reveal>
        )}
        {errorMsg && (
          <Reveal direction="down">
            <Alert variant="danger" title="Error" onClose={() => setErrorMsg("")}>
              {errorMsg}
            </Alert>
          </Reveal>
        )}

        {/* Stepper with Step Names */}
        <Reveal direction="up" delay={100}>
          <Card variant="default" className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-heading">
                Step {currentStep} of 5: {stepTitles[currentStep - 1]}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {progressPercent}% Complete
              </span>
            </div>

            <ProgressBar value={progressPercent} max={100} color="brand" animated />

            <div className="mt-4">
              <Stepper
                steps={stepTitles}
                currentStep={currentStep - 1}
                className="hidden sm:flex"
              />
            </div>
          </Card>
        </Reveal>

        {/* Questionnaire Step Content */}
        <Reveal direction="up" delay={150}>
          <Card variant="elevated" className="p-6 sm:p-8">
            
            {/* STEP 1: ROOM TYPE */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 font-heading">
                    <IconBed className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Desired Room Size
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Choose how many students will share your hostel room. Roommate matching and groups only work between students with the same room size choice.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        value: 1,
                        label: "Single room (1 bed)",
                        desc: "Just for you — no roommates needed",
                        badge: <Badge variant="neutral" size="sm">Single Seater</Badge>,
                        icon: (
                          <div className="flex items-center gap-1">
                            <IconBed className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                        ),
                      },
                      {
                        value: 2,
                        label: "Shared by 2",
                        desc: "You + 1 roommate",
                        badge: <Badge variant="brand" size="sm">Double Sharing</Badge>,
                        icon: (
                          <div className="flex items-center -space-x-1">
                            <IconBed className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <IconBed className="w-4 h-4 text-indigo-400 dark:text-indigo-500" />
                          </div>
                        ),
                      },
                      {
                        value: 3,
                        label: "Shared by 3",
                        desc: "You + 2 roommates",
                        badge: <Badge variant="brand" size="sm">Triple Sharing</Badge>,
                        icon: (
                          <div className="flex items-center -space-x-1">
                            <IconBed className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <IconBed className="w-4 h-4 text-indigo-500 dark:text-indigo-500" />
                            <IconBed className="w-4 h-4 text-indigo-400 dark:text-indigo-600" />
                          </div>
                        ),
                      },
                      {
                        value: 4,
                        label: "Shared by 4",
                        desc: "You + 3 roommates",
                        badge: <Badge variant="brand" size="sm">Quad Sharing</Badge>,
                        icon: (
                          <div className="grid grid-cols-2 gap-0.5">
                            <IconBed className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <IconBed className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-500" />
                            <IconBed className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-500" />
                            <IconBed className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-600" />
                          </div>
                        ),
                      },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        title={opt.label}
                        description={opt.desc}
                        badge={opt.badge}
                        icon={opt.icon}
                        selected={answers.roomSize === opt.value}
                        onClick={() => handleSelectOption("roomSize", opt.value)}
                      />
                    ))}
                  </div>

                  {stepErrors.roomSize && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{stepErrors.roomSize}</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: DAILY ROUTINE */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 font-heading">
                    <span>⏰</span> Daily Routine & Sleep Habits
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Aligning wake and rest schedules prevents common roommate friction and study interruptions.
                  </p>
                </div>

                {/* sleepSchedule */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    1. Sleep Schedule <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">When do you typically sleep on most weekdays and nights?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: "early", label: "Early to Bed", desc: "Sleeps before 10:00 PM" },
                      { value: "normal", label: "Normal Hours", desc: "10:00 PM - 12:00 AM" },
                      { value: "late", label: "Night Owl", desc: "After 12:00 AM (midnight)" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        title={opt.label}
                        description={opt.desc}
                        selected={answers.sleepSchedule === opt.value}
                        onClick={() => handleSelectOption("sleepSchedule", opt.value)}
                      />
                    ))}
                  </div>
                  {stepErrors.sleepSchedule && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{stepErrors.sleepSchedule}</p>
                  )}
                </div>

                {/* studyTime */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    2. Preferred Study Time <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">At what time of day are you most productive for focused study?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { value: "morning", label: "Morning Person", desc: "Dawn to midday focus" },
                      { value: "daytime", label: "Daytime", desc: "Afternoon & early evening" },
                      { value: "night", label: "Late Night", desc: "Quiet midnight hours" },
                      { value: "flexible", label: "Flexible", desc: "Adapts easily to schedule" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        title={opt.label}
                        description={opt.desc}
                        selected={answers.studyTime === opt.value}
                        onClick={() => handleSelectOption("studyTime", opt.value)}
                      />
                    ))}
                  </div>
                  {stepErrors.studyTime && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{stepErrors.studyTime}</p>
                  )}
                </div>

                {/* nightCalls */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    3. Late-Night Phone / Video Calls <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    How often do you make or receive calls after 11 PM (e.g. family or friends in other time zones)?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: "never", label: "Rarely or Never", desc: "No late calls in room" },
                      { value: "sometimes", label: "Occasionally", desc: "Brief calls or weekends" },
                      { value: "often", label: "Frequently", desc: "Regular late-night calls" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        title={opt.label}
                        description={opt.desc}
                        selected={answers.nightCalls === opt.value}
                        onClick={() => handleSelectOption("nightCalls", opt.value)}
                      />
                    ))}
                  </div>
                  {stepErrors.nightCalls && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{stepErrors.nightCalls}</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: LIVING HABITS */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 font-heading">
                    <span>🏡</span> Living Habits & Space Sharing
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Scale ratings (1 to 5) allow the matching system to pair students with harmonious living standards.
                  </p>
                </div>

                {/* Cleanliness */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                      1. Cleanliness & Organization <span className="text-rose-500">*</span>
                    </label>
                    <Badge variant="brand" size="sm">
                      Rating: {answers.cleanliness} / 5
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">How tidy do you keep your room and personal space?</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleScaleSelect("cleanliness", num)}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                          answers.cleanliness === num
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>1 - Relaxed / Easygoing</span>
                    <span>3 - Moderate / Tidy</span>
                    <span>5 - Spotless / Pristine</span>
                  </div>
                </div>

                {/* Noise Tolerance */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                      2. Noise Tolerance <span className="text-rose-500">*</span>
                    </label>
                    <Badge variant="brand" size="sm">
                      Rating: {answers.noiseTolerance} / 5
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">How sensitive are you to room ambient noise while sleeping or concentrating?</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleScaleSelect("noiseTolerance", num)}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                          answers.noiseTolerance === num
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>1 - Needs Pin-Drop Silence</span>
                    <span>3 - Average Ambience</span>
                    <span>5 - Fine with Activity & Chatter</span>
                  </div>
                </div>

                {/* Social Level */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                      3. Social Level & Visitors in Room <span className="text-rose-500">*</span>
                    </label>
                    <Badge variant="brand" size="sm">
                      Rating: {answers.socialLevel} / 5
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">How frequently do you invite classmates or friends into your room?</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleScaleSelect("socialLevel", num)}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                          answers.socialLevel === num
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>1 - Quiet Sanctuary / Few Visitors</span>
                    <span>3 - Occasional Hangouts</span>
                    <span>5 - Social Hub / Frequent Friends Over</span>
                  </div>
                </div>

                {/* AC Preference */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    4. AC Preference <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">What cooling climate do you prefer for your room?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: "ac", label: "Air Conditioned (AC)", desc: "Cooling room required" },
                      { value: "non-ac", label: "Non-AC (Ventilated)", desc: "Fan and breeze fine" },
                      { value: "no-preference", label: "No Preference", desc: "Either AC or Non-AC works" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        title={opt.label}
                        description={opt.desc}
                        selected={answers.acPreference === opt.value}
                        onClick={() => handleSelectOption("acPreference", opt.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: FOOD & LANGUAGE */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 font-heading">
                    <span>🍽️</span> Dietary Preferences & Communication
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Accommodation respects all personal dietary traditions and multilingual campus environments.
                  </p>
                </div>

                {/* foodType */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    1. Dietary Lifestyle <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">What type of meals do you consume?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { value: "veg", label: "Vegetarian", desc: "Plant-based, dairy permitted" },
                      { value: "non-veg", label: "Non-Vegetarian", desc: "Includes meat & seafood" },
                      { value: "eggetarian", label: "Eggetarian", desc: "Vegetarian plus eggs" },
                      { value: "halal", label: "Halal Non-Veg", desc: "Strictly Halal non-vegetarian" },
                      { value: "jain", label: "Jain Vegetarian", desc: "Pure veg without root vegetables" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        title={opt.label}
                        description={opt.desc}
                        selected={answers.foodType === opt.value}
                        onClick={() => handleSelectOption("foodType", opt.value)}
                      />
                    ))}
                  </div>
                  {stepErrors.foodType && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{stepErrors.foodType}</p>
                  )}
                </div>

                {/* okWithDifferentFood */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    2. Dietary Sharing Tolerance <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Are you comfortable sharing your room with a student who consumes a different diet?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        value: true,
                        label: "Comfortable with Any Diet",
                        desc: "I don't mind what my roommate eats",
                      },
                      {
                        value: false,
                        label: "Prefer Same Diet Only",
                        desc: "I strongly prefer a roommate with a matching diet",
                      },
                    ].map((opt) => (
                      <OptionCard
                        key={String(opt.value)}
                        title={opt.label}
                        description={opt.desc}
                        selected={answers.okWithDifferentFood === opt.value}
                        onClick={() => handleSelectOption("okWithDifferentFood", opt.value)}
                      />
                    ))}
                  </div>
                  {stepErrors.okWithDifferentFood && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{stepErrors.okWithDifferentFood}</p>
                  )}
                </div>

                {/* languages */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    3. Languages Spoken / Understood <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select all languages you comfortably speak or understand.
                  </p>

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
                              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {lang}
                        </button>
                      );
                    })}

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

                  <div className="pt-2 flex items-center gap-2 max-w-sm">
                    <input
                      type="text"
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      placeholder="Add another language..."
                      className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddCustomLanguage}
                    >
                      + Add
                    </Button>
                  </div>

                  {stepErrors.languages && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{stepErrors.languages}</p>
                  )}
                </div>

                {/* culturalComfort */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                      4. Cultural Background Comfort
                    </label>
                    <Badge variant="neutral" size="sm">Optional / Low Weight</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Self-declared comfort inclination. Never used to rank or exclude anyone.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        value: "open-to-all",
                        label: "Open to All",
                        desc: "Excited to live with anyone from any region or nation",
                      },
                      {
                        value: "prefer-similar-background",
                        label: "Prefer Similar Background",
                        desc: "Feel slightly more at home with someone of familiar background",
                      },
                      {
                        value: "no-preference",
                        label: "No Preference",
                        desc: "No specific inclination",
                      },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        title={opt.label}
                        description={opt.desc}
                        selected={answers.culturalComfort === opt.value}
                        onClick={() => handleSelectOption("culturalComfort", opt.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: DEAL-BREAKERS & REVIEW */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 font-heading">
                    <IconShield className="w-5 h-5 text-rose-600 dark:text-rose-400" /> Non-Negotiable Deal-Breakers & Review
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Deal-breakers act as strict binary filters. Any roommate candidate who violates a deal-breaker
                    will never be paired with you.
                  </p>
                </div>

                {/* Deal Breakers List */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    Select Your Strict Deal-Breakers (Optional)
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {DEAL_BREAKER_OPTIONS.map((db) => {
                      const isChecked = answers.dealBreakers.includes(db.key);
                      return (
                        <div
                          key={db.key}
                          onClick={() => handleToggleDealBreaker(db.key)}
                          className={`flex items-start gap-4 p-4 rounded-xl border text-left cursor-pointer transition-all ${
                            isChecked
                              ? "border-rose-300 dark:border-rose-800/80 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs ring-1 ring-rose-400"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="text-2xl shrink-0 mt-0.5">{db.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                                {db.label}
                              </span>
                              <Badge variant={isChecked ? "danger" : "neutral"} size="sm">
                                {isChecked ? "Active Constraint" : "Not Active"}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{db.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Grouped Summary Review Cards with Edit Links */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                      Response Summary Review
                    </h3>
                    <Badge variant="brand" size="sm">Ready to Confirm</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="col-span-1 sm:col-span-2 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Desired Room Size:</span>
                        <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 text-sm">
                          {answers.roomSize === 1
                            ? "1-Bed Single Room (No roommates / independent)"
                            : answers.roomSize
                            ? `${answers.roomSize}-Bed Room (Shared by ${answers.roomSize})`
                            : "Not answered"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                      >
                        Edit &rarr;
                      </button>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Sleep Schedule:</span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 capitalize mt-0.5">{answers.sleepSchedule || "—"}</p>
                      </div>
                      <button type="button" onClick={() => setCurrentStep(2)} className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Study Time:</span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 capitalize mt-0.5">{answers.studyTime || "—"}</p>
                      </div>
                      <button type="button" onClick={() => setCurrentStep(2)} className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Cleanliness / Noise / Social:</span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {answers.cleanliness}/5 · {answers.noiseTolerance}/5 · {answers.socialLevel}/5
                        </p>
                      </div>
                      <button type="button" onClick={() => setCurrentStep(3)} className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">AC Preference:</span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 uppercase mt-0.5">{answers.acPreference || "No preference"}</p>
                      </div>
                      <button type="button" onClick={() => setCurrentStep(3)} className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Diet & Sharing:</span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 capitalize mt-0.5">
                          {answers.foodType || "—"} ({answers.okWithDifferentFood ? "Any diet ok" : "Same diet only"})
                        </p>
                      </div>
                      <button type="button" onClick={() => setCurrentStep(4)} className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Languages:</span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {answers.languages.length > 0 ? answers.languages.join(", ") : "None"}
                        </p>
                      </div>
                      <button type="button" onClick={() => setCurrentStep(4)} className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                    </div>
                  </div>

                  {answers.dealBreakers.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs">Active Deal-Breakers:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {answers.dealBreakers.map((key) => {
                          const db = DEAL_BREAKER_OPTIONS.find((d) => d.key === key);
                          return (
                            <Badge key={key} variant="danger" size="sm">
                              🛡️ {db?.label || key}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wizard Controls */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
              <div>
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    &larr; Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {currentStep < 5 ? (
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
          </Card>
        </Reveal>
      </div>
    </PageTransition>
  );
}
