"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Button,
  Badge,
  AnimatedNumber,
  CircularScore,
  Reveal,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  IconSparkles,
  IconShield,
  IconUsers,
  IconBed,
  IconBuilding,
  IconKey,
  IconCheck,
  IconChevronDown,
  IconArrowRight,
  Avatar,
} from "@/components/ui";

export default function LandingClient({ user }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [systemHealthy, setSystemHealthy] = useState(true);

  // Check health endpoint on mount for system status indicator
  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        setSystemHealthy(res.ok);
      })
      .catch(() => {
        setSystemHealthy(false);
      });
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      step: "01",
      title: "Create your profile",
      description: "Verify your enrollment, branch, academic year, and gender.",
      icon: <IconBuilding className="h-6 w-6 text-indigo-500" />,
    },
    {
      step: "02",
      title: "Share your lifestyle",
      description: "Pick desired room size (1-4 beds) and submit your daily habits.",
      icon: <IconSparkles className="h-6 w-6 text-teal-500" />,
    },
    {
      step: "03",
      title: "Find compatible roommates",
      description: "Explore pairwise compatibility and filter out mutual deal-breakers.",
      icon: <IconUsers className="h-6 w-6 text-purple-500" />,
    },
    {
      step: "04",
      title: "Form a group",
      description: "Invite prospective roommates or send requests to join open groups.",
      icon: <IconKey className="h-6 w-6 text-amber-500" />,
    },
    {
      step: "05",
      title: "Choose your room",
      description: "Pick your room live in real-time during the open selection window.",
      icon: <IconBed className="h-6 w-6 text-emerald-500" />,
    },
  ];

  const features = [
    {
      title: "Smart Compatibility Scoring",
      description: "Multi-factor matching evaluates sleeping routine, study hours, cleanliness, and social habits.",
      icon: <IconSparkles className="h-6 w-6 text-indigo-500" />,
    },
    {
      title: "Deal-Breakers Respected",
      description: "Non-negotiable lifestyle boundaries (food, AC, late-night noise) prevent unwanted roommate pairings.",
      icon: <IconShield className="h-6 w-6 text-rose-500" />,
    },
    {
      title: "Roommate Groups",
      description: "Form groups of 2, 3, or 4 students with real-time average score and harmony preview.",
      icon: <IconUsers className="h-6 w-6 text-purple-500" />,
    },
    {
      title: "Join Requests",
      description: "Browse open forming groups with free beds and request admission directly to the leader.",
      icon: <IconKey className="h-6 w-6 text-teal-500" />,
    },
    {
      title: "First-Come Room Selection",
      description: "No administrative delays. Leaders choose exact rooms live during the open selection window.",
      icon: <IconBed className="h-6 w-6 text-amber-500" />,
    },
    {
      title: "Fair Automated Allocation",
      description: "Multi-round preference satisfaction placement for unallocated students post-window.",
      icon: <IconBuilding className="h-6 w-6 text-indigo-500" />,
    },
    {
      title: "Privacy by Design",
      description: "Raw lifestyle answers and phone numbers are never leaked; only anonymous compatibility breakdown is visible.",
      icon: <IconShield className="h-6 w-6 text-emerald-500" />,
    },
    {
      title: "Admin Command Center",
      description: "Real-time occupancy tracking, audit logging, announcement broadcasts, and self-healing diagnostics.",
      icon: <IconSparkles className="h-6 w-6 text-blue-500" />,
    },
  ];

  const faqs = [
    {
      q: "Are my lifestyle answers visible to other students?",
      a: "No. Student privacy is strictly guaranteed. Other students only see a normalized compatibility percentage, high-level lifestyle category matches (e.g., 'Both Early Birds'), and shared languages. Your specific answers and deal-breakers remain private.",
    },
    {
      q: "How does the roommate compatibility score work?",
      a: "Our algorithm calculates weighted similarities across routine, cleanliness, study preferences, and social tolerance. If any member triggers another's deal-breaker, the pairing is automatically excluded.",
    },
    {
      q: "Can I change my desired room size later?",
      a: "You can update your preferred room size anytime before you join a roommate group or claim a room. Once in an active group, room size is locked to ensure group consistency.",
    },
    {
      q: "What happens if our invited roommates don't accept in time?",
      a: "Invitations remain valid for 7 days. Even if invitations are pending, the group leader can claim a room during the open selection window. Unfilled seats remain reserved for your group and are later filled by compatible candidates.",
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[var(--bg-page)] text-slate-900 dark:text-slate-100 transition-colors">
      {/* =====================================================================
          1. HERO SECTION
          ===================================================================== */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Animated background glowing auras */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 flex justify-center">
          <div className="h-[480px] w-[900px] rounded-full bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-teal-400/10 blur-3xl dark:from-indigo-500/20 dark:via-purple-500/15 dark:to-teal-400/15 animate-pulse-soft" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Text Content */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              {/* System Status Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3.5 py-1 text-xs font-semibold backdrop-blur-md shadow-xs">
                <span
                  className={`h-2 w-2 rounded-full ${
                    systemHealthy ? "bg-teal-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <span className="text-slate-600 dark:text-slate-300">
                  {systemHealthy ? "System Online • Allocation Engine Active" : "Maintenance Mode"}
                </span>
                <span className="text-slate-400">|</span>
                <Link
                  href="/api/health"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                >
                  Health Check
                </Link>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.12]">
                Find the right roommate.{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 bg-clip-text text-transparent">
                  Get the right room.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Campus housing made intelligent. Compare lifestyles with guaranteed privacy, shield
                against deal-breakers, form compatible groups, and choose your dorm room live in real-time.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                {user ? (
                  <Link href={user.role === "admin" ? "/admin" : "/dashboard"}>
                    <Button variant="primary" size="lg" rightIcon={<IconArrowRight className="h-4 w-4" />}>
                      Go to {user.role === "admin" ? "Admin Console" : "Student Dashboard"}
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/register">
                      <Button variant="primary" size="lg" rightIcon={<IconArrowRight className="h-4 w-4" />}>
                        Get Started
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button variant="outline" size="lg">
                        Sign In to Portal
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Small Trust Micro-Copy */}
              <div className="pt-2 flex items-center justify-center lg:justify-start gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <IconCheck className="h-4 w-4 text-teal-500" />
                  Zero Warden Approval Delay
                </span>
                <span className="flex items-center gap-1.5">
                  <IconCheck className="h-4 w-4 text-teal-500" />
                  Strict Privacy Protection
                </span>
              </div>
            </div>

            {/* Right Product Mockup (CSS & SVG Card) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md">
                {/* Floating decorative elements */}
                <div className="absolute -top-4 -right-4 h-24 w-24 bg-indigo-500/10 rounded-full blur-xl" />
                <div className="absolute -bottom-4 -left-4 h-32 w-32 bg-purple-500/15 rounded-full blur-2xl" />

                {/* Stylized Match Preview Card */}
                <div className="relative rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl shadow-indigo-500/10 backdrop-blur-md animate-float-slow">
                  {/* Top Bar with Match Score */}
                  <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <Avatar name="Rahul Sharma" size="lg" status="online" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-base font-bold text-slate-900 dark:text-slate-50">Rahul S.</h4>
                          <Badge variant="brand" size="sm">B.Tech Y3</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Seeking 2-Bed Room</p>
                      </div>
                    </div>
                    <CircularScore score={94} size={58} label="Fit" />
                  </div>

                  {/* Lifestyle Compatibility Indicators */}
                  <div className="py-4 space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Lifestyle Synergy
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-900/40 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                        <IconCheck className="h-3.5 w-3.5 text-teal-500" />
                        Early Riser (6 AM)
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-900/40 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                        <IconCheck className="h-3.5 w-3.5 text-teal-500" />
                        AC Preferred
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-900/40 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                        <IconCheck className="h-3.5 w-3.5 text-teal-500" />
                        Quiet Study Hours
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/40 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        Shared English & Hindi
                      </span>
                    </div>
                  </div>

                  {/* Seat Reservation Visual */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Himalaya Hostel • Room 302</p>
                      <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">1 Bed Claimed • 1 Seat Open</p>
                    </div>
                    <Button variant="primary" size="sm">
                      Send Join Request
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. TRUST STRIP WITH ANIMATED NUMBERS
          ===================================================================== */}
      <section className="border-y border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
                <AnimatedNumber value={12} suffix="+" />
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Lifestyle Factors Compared
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
                <AnimatedNumber value={4} />
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Room Sizes (1 to 4 Beds)
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-teal-600 dark:text-teal-400 tabular-nums">
                <AnimatedNumber value={100} suffix="%" />
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Privacy Protected (Zero Raw Leaks)
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400 tabular-nums">
                0
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Warden Bias (Fair Allocation)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. HOW IT WORKS (5 STEPS)
          ===================================================================== */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="brand" className="mb-3">Streamlined Workflow</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              How HostelMatch Works
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              From questionnaire to room key in five transparent, conflict-free steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {steps.map((st, idx) => (
              <Reveal key={idx} delay={idx * 80}>
                <div className="relative flex flex-col items-center text-center p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all h-full">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 mb-4 shadow-xs">
                    {st.icon}
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                    Step {st.step}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {st.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {st.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. FEATURE GRID (8 INTERACTIVE CARDS)
          ===================================================================== */}
      <section id="features" className="py-20 sm:py-28 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="brand" className="mb-3">Engine Capabilities</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              Engineered for Fairness & Living Harmony
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              State-of-the-art algorithms designed to respect personal lifestyles without compromising institutional efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, idx) => (
              <Reveal key={idx} delay={idx * 60}>
                <Card variant="interactive" className="h-full">
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 mb-3 shadow-xs">
                      {feat.icon}
                    </div>
                    <CardTitle className="text-base sm:text-lg">{feat.title}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed mt-2">
                      {feat.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. BUILT FOR EVERYONE (STUDENTS VS WARDENS)
          ===================================================================== */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="brand" className="mb-3">Role-Based Experiences</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              Built for Students. Trusted by Wardens.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Panel 1: Students */}
            <Reveal effect="slide-right">
              <div className="h-full rounded-3xl border border-indigo-200/80 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 dark:from-indigo-950/20 dark:via-slate-900 dark:to-purple-950/10 p-8 shadow-md">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-md shadow-indigo-500/25">
                    🎓
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">For Students</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Autonomous Roommate & Room Selection</p>
                  </div>
                </div>

                <ul className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-3">
                    <IconCheck className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                    <span><strong>Accurate Lifestyle Fit:</strong> Discover compatible peers with transparent pairwise compatibility ratings.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                    <span><strong>Deal-Breaker Defense:</strong> Guaranteed exclusion from habits you can't tolerate (smoking, noise, AC temperature).</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                    <span><strong>First-Come Room Picking:</strong> Instant room reservation during the window with no approval paperwork.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                    <span><strong>Seamless Join Requests:</strong> Request to join forming groups that have an available bed.</span>
                  </li>
                </ul>
              </div>
            </Reveal>

            {/* Panel 2: Wardens and Admins */}
            <Reveal effect="fade-up">
              <div className="h-full rounded-3xl border border-purple-200/80 dark:border-purple-900/40 bg-gradient-to-br from-purple-50/40 via-white to-slate-50/30 dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-950/30 p-8 shadow-md">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-700 text-white font-bold text-xl shadow-md shadow-purple-700/25">
                    🛡️
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">For Wardens & Admins</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Institutional Governance & Demand Optimization</p>
                  </div>
                </div>

                <ul className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-3">
                    <IconCheck className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <span><strong>Selection Finalization:</strong> One-click lock and automated seat auto-fill for roomed groups.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <span><strong>Multi-Round Fallback Engine:</strong> Borda-count aggregated placement for all remaining students.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <span><strong>Self-Healing Diagnostics:</strong> Invariant integrity verification across room occupancy and allocations.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <span><strong>Targeted Announcements:</strong> Broadcast notices to specific hostels, academic years, or roles.</span>
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. ACCESSIBLE FAQ ACCORDION
          ===================================================================== */}
      <section id="faq" className="py-20 sm:py-28 bg-slate-100/60 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="brand" className="mb-3">Answers & Clarity</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <IconChevronDown
                      className={`h-5 w-5 text-slate-400 shrink-0 ml-4 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 leading-relaxed animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. FINAL CALL-TO-ACTION BANNER
          ===================================================================== */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 p-8 sm:p-12 lg:p-16 text-center text-white shadow-2xl shadow-indigo-500/20">
            <div className="relative z-10 max-w-2xl mx-auto space-y-5">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Ready to find your ideal campus roommate?
              </h2>
              <p className="text-sm sm:text-base text-indigo-100 leading-relaxed">
                Take the lifestyle questionnaire today and claim your preferred room in the upcoming selection window.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <button
                    type="button"
                    className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-600 shadow-md hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all"
                  >
                    Register Student Account
                  </button>
                </Link>
                <Link href="/login">
                  <button
                    type="button"
                    className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/20 transition-all"
                  >
                    Sign In to Portal
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

