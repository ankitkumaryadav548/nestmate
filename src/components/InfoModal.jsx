"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Modal from "@/components/ui/Modal";
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

  // Sync active tab with prop changes when modal opens
  const currentTab = activeTab || initialTab;

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-3xl"
      className="p-0 overflow-hidden"
    >
      {/* Modal Header with Tabs */}
      <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs">
              HM
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                HostelMatch Information Guide
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Everything you need to know about roommate matching & room selection
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 border border-slate-300/50 dark:border-slate-600/50">
          <button
            type="button"
            onClick={() => setActiveTab("how-it-works")}
            className={`py-2 px-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
              currentTab === "how-it-works"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            📋 How It Works
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("features")}
            className={`py-2 px-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
              currentTab === "features"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            ✨ Features
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("faq")}
            className={`py-2 px-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
              currentTab === "faq"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            ❓ FAQ
          </button>
        </div>
      </div>

      {/* Modal Scrollable Body */}
      <div className="p-5 sm:p-6 overflow-y-auto max-h-[65vh] space-y-4">
        {/* TAB 1: HOW IT WORKS */}
        {currentTab === "how-it-works" && (
          <div className="space-y-4 animate-fade-in">
            <div className="mb-2">
              <Badge variant="brand" size="sm">5 Easy Steps</Badge>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                From Questionnaire to Room Key in 5 Steps
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transparent, conflict-free steps for matching with roommates and locking in your room.
              </p>
            </div>

            <div className="space-y-3">
              {STEPS.map((st) => (
                <div
                  key={st.step}
                  className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                    {st.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Step {st.step}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {st.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {st.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: FEATURES */}
        {currentTab === "features" && (
          <div className="space-y-4 animate-fade-in">
            <div className="mb-2">
              <Badge variant="brand" size="sm">All Project Features</Badge>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                Engineered for Fairness & Living Harmony
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All 12 intelligent features designed to respect personal lifestyles and optimize campus housing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEATURES.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50">
                      {feat.icon}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {feat.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: FAQ */}
        {currentTab === "faq" && (
          <div className="space-y-4 animate-fade-in">
            <div className="mb-2">
              <Badge variant="brand" size="sm">Frequently Asked Questions</Badge>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                Quick Answers to Common Questions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any question to view the short explanation.
              </p>
            </div>

            <div className="space-y-2.5">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between p-3.5 text-left text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <IconChevronDown
                        className={`h-4 w-4 text-slate-400 shrink-0 ml-3 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 leading-relaxed animate-fade-in">
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

      {/* Modal Footer with Actions */}
      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={() => handleJumpToSection(currentTab)}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
        >
          <span>View full section on Home Page</span>
          <span>&rarr;</span>
        </button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Close
        </Button>
      </div>
    </Modal>
  );
}

