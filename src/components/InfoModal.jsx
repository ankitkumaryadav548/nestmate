"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  IconSparkles,
  IconShield,
  IconUsers,
  IconBed,
  IconBuilding,
  IconKey,
  IconCheck,
  IconSliders,
  IconBell,
  IconChart,
  IconChevronDown,
} from "@/components/ui/Icons";

export const STEPS = [
  {
    step: "01",
    title: "Create your profile",
    description: "Verify your academic year, branch, and basic student info.",
    icon: <IconBuilding className="h-6 w-6 text-indigo-500" />,
  },
  {
    step: "02",
    title: "Set lifestyle & room size",
    description: "Submit daily habits, choose AC/Non-AC, and select 1–4 bed capacity.",
    icon: <IconSparkles className="h-6 w-6 text-teal-500" />,
  },
  {
    step: "03",
    title: "Find compatible roommates",
    description: "Review 0–100% compatibility scores with mutual deal-breaker protection.",
    icon: <IconUsers className="h-6 w-6 text-purple-500" />,
  },
  {
    step: "04",
    title: "Form your group",
    description: "Send invitations to peers or request admission to open forming groups.",
    icon: <IconKey className="h-6 w-6 text-amber-500" />,
  },
  {
    step: "05",
    title: "Claim room & assign beds",
    description: "Select your room live in real-time and let leaders assign bed numbers.",
    icon: <IconBed className="h-6 w-6 text-emerald-500" />,
  },
];

export const FEATURES = [
  {
    title: "Smart Compatibility Scoring",
    description: "Calculates weighted compatibility scores (0–100%) across sleeping routine, study hours, noise tolerance, and cleanliness.",
    icon: <IconSparkles className="h-5 w-5 text-indigo-500" />,
  },
  {
    title: "Mutual Deal-Breakers",
    description: "Strict hard-filtering on non-negotiable boundaries (smoking, late calls, cleanliness, diet, AC) prevents incompatible pairings.",
    icon: <IconShield className="h-5 w-5 text-rose-500" />,
  },
  {
    title: "Flexible Room Sizes (1–4 Beds)",
    description: "Select single-seater, double, 3-bed, or 4-bed preferences, matching exclusively with students wanting the same room capacity.",
    icon: <IconBed className="h-5 w-5 text-blue-500" />,
  },
  {
    title: "Roommate Groups & Harmony",
    description: "Form groups of 2 to 4 students, send invitations, monitor average group score, and preview roommate harmony in real-time.",
    icon: <IconUsers className="h-5 w-5 text-purple-500" />,
  },
  {
    title: "Open Groups & Join Requests",
    description: "Browse open forming groups with vacant beds, inspect member compatibility, and submit join requests with 24h protection.",
    icon: <IconKey className="h-5 w-5 text-teal-500" />,
  },
  {
    title: "Live Selection Window",
    description: "Countdown timer and first-come, first-served claiming where leaders lock down preferred available rooms in real-time.",
    icon: <IconBuilding className="h-5 w-5 text-amber-500" />,
  },
  {
    title: "Hostel, AC & Floor Preferences",
    description: "Rank preferred hostels, room types (AC/Non-AC), and floor level bands (Low, Mid, High) for automated allocations.",
    icon: <IconSliders className="h-5 w-5 text-emerald-500" />,
  },
  {
    title: "Physical Bed Number Assignment",
    description: "Group leaders assign specific bed numbers (Bed 1, 2, 3...) to members or use one-click deterministic auto-assignment.",
    icon: <IconCheck className="h-5 w-5 text-indigo-500" />,
  },
  {
    title: "Automated Allocation Engine",
    description: "Fair institutional placement engine that automatically places unallocated students and groups post-window.",
    icon: <IconChart className="h-5 w-5 text-violet-500" />,
  },
  {
    title: "Dedicated Roommates Hub",
    description: "Dedicated page showing allocated room specs, physical bed assignments, resident profiles, and unit layout.",
    icon: <IconUsers className="h-5 w-5 text-teal-600" />,
  },
  {
    title: "Admin Command Center",
    description: "Live occupancy rates, student oversight, group management, manual room override, and CSV export for campus wardens.",
    icon: <IconBuilding className="h-5 w-5 text-blue-600" />,
  },
  {
    title: "Self-Healing Integrity & Alerts",
    description: "Automated diagnostics that heal occupancy drifts, with real-time in-app alerts for invitations, window events, and announcements.",
    icon: <IconBell className="h-5 w-5 text-amber-600" />,
  },
];

export const FAQS = [
  {
    q: "How does the roommate compatibility score work?",
    a: "Our algorithm calculates a 0–100% score comparing your sleep schedule, study habits, noise tolerance, and cleanliness with other students.",
  },
  {
    q: "What are deal-breakers and how do they protect me?",
    a: "Deal-breakers are strict lifestyle boundaries (like food habits, AC use, or noise) that automatically prevent conflicting students from being paired.",
  },
  {
    q: "How does the live room selection window work?",
    a: "When the administrator opens the window, group leaders and single students claim their preferred available room on a live, first-come, first-served basis.",
  },
  {
    q: "Can group leaders assign specific beds to roommates?",
    a: "Yes. Once a room is allocated, the group leader can assign bed numbers to each member or use one-click auto-assign on the My Roommates page.",
  },
  {
    q: "Are my questionnaire answers kept private?",
    a: "Yes. Your raw answers are completely private. Other students only see your overall match score and high-level compatibility badges.",
  },
];

/**
 * Trigger helper to open the info modal from anywhere in the app
 */
export function openInfoModal(tab = "how-it-works") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-info-modal", { detail: { tab } }));
  }
}

export default function InfoModal({ isOpen, onClose, initialTab = "how-it-works" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [openFaq, setOpenFaq] = useState(null);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep active tab synchronized whenever modal opens or initialTab changes
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Lock body scroll and listen for Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    setTimeout(() => {
      dialogRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleJumpToSection = (sectionId) => {
    onClose();
    if (pathname === "/") {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", `#${sectionId}`);
      }
    } else {
      router.push(`/#${sectionId}`);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 dark:bg-black/85 backdrop-blur-sm transition-opacity duration-200 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl sm:max-w-3xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/90 dark:border-slate-800 z-10 animate-scale-in duration-200 max-h-[88vh] flex flex-col focus:outline-none overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header (Tabs + Close Button) - Fixed at top */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-extrabold text-sm shadow-sm shadow-indigo-500/20">
                HM
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
                  HostelMatch Platform Guide
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Roommate matching, selection windows, and bed assignments
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Three Tab Buttons */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-700/80 border border-slate-300/50 dark:border-slate-600/50">
            <button
              type="button"
              onClick={() => setActiveTab("how-it-works")}
              className={`py-2 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === "how-it-works"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              📋 How It Works
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("features")}
              className={`py-2 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === "features"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              ✨ Features
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("faq")}
              className={`py-2 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === "faq"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              ❓ FAQ
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
          {/* TAB 1: HOW IT WORKS */}
          {activeTab === "how-it-works" && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="mb-2">
                <Badge variant="brand" size="sm">5 Step Process</Badge>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 font-heading">
                  From Questionnaire to Room Key
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Follow these 5 transparent steps to find compatible roommates and secure your room.
                </p>
              </div>

              <div className="space-y-3">
                {STEPS.map((st) => (
                  <div
                    key={st.step}
                    className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                      {st.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                          Step {st.step}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          {st.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {st.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: FEATURES */}
          {activeTab === "features" && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="mb-2">
                <Badge variant="brand" size="sm">12 Platform Features</Badge>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 font-heading">
                  All Capabilities in HostelMatch
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comprehensive smart algorithms and management tools built for harmonious campus living.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURES.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                        {feat.icon}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        {feat.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FAQ */}
          {activeTab === "faq" && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="mb-2">
                <Badge variant="brand" size="sm">Frequently Asked Questions</Badge>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 font-heading">
                  Frequently Asked Questions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Common questions answered in 1–2 simple lines. Click any question to read.
                </p>
              </div>

              <div className="space-y-2.5">
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 overflow-hidden shadow-2xs transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(idx)}
                        aria-expanded={isOpen}
                        className="w-full flex items-center justify-between p-4 text-left text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        <span className="pr-2">{faq.q}</span>
                        <IconChevronDown
                          className={`h-4 w-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 leading-relaxed animate-fade-in bg-white dark:bg-slate-900/60">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar - Fixed at bottom */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleJumpToSection(activeTab)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View section on Home Page</span>
            <span>&rarr;</span>
          </button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Close Guide
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
