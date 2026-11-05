"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { IconShield, IconSparkles, IconCheck, IconBed, IconUser } from "@/components/ui/Icons";

export default function RegisterPage() {
  useDocumentTitle("Student Registration");
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "male",
    registrationNumber: "",
    course: "",
    department: "",
    year: "1",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear inline error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (generalError) setGeneralError("");
  };

  // Visual-only password strength indicator (no validation rule changes)
  const calculatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: "None", color: "bg-slate-200" };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score === 1) return { score: 1, label: "Weak", color: "bg-rose-500" };
    if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 3, label: "Good", color: "bg-teal-500" };
    return { score: 4, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = calculatePasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGeneralError("");
    setFieldErrors({});

    // Client-side quick check for passwords
    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      setLoading(false);
      return;
    }

    const payload = {
      ...formData,
      year: formData.year ? parseInt(formData.year, 10) : null,
    };

    const result = await register(payload);
    setLoading(false);

    if (result.success) {
      router.push("/dashboard");
      router.refresh();
    } else {
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      setGeneralError(
        result.message || "Registration could not be completed. Please fix the errors below."
      );
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl grid grid-cols-1 lg:grid-cols-12 animate-scale-in">
        {/* ===================================================================
            LEFT DECORATIVE BRAND PANEL (DESKTOP)
            =================================================================== */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white relative overflow-hidden">
          <div aria-hidden="true" className="absolute -top-12 -left-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden="true" className="absolute -bottom-12 -right-12 h-52 w-52 rounded-full bg-purple-400/20 blur-3xl" />

          {/* Header */}
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md text-white font-extrabold text-sm border border-white/20">
                HM
              </div>
              <span className="text-lg font-bold tracking-tight text-white">HostelMatch</span>
            </Link>

            <div className="mt-8 space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-indigo-100 border border-white/20">
                <IconSparkles className="h-3.5 w-3.5 text-teal-300" />
                Student Enrollment
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
                Join your campus housing network
              </h2>
              <p className="text-xs text-indigo-100/90 leading-relaxed">
                Complete your profile once to unlock roommate compatibility matches and live room selection.
              </p>
            </div>
          </div>

          {/* Core Values */}
          <div className="relative z-10 my-8 space-y-4 border-y border-white/15 py-6">
            <div className="flex items-start gap-3 text-xs text-indigo-100">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/15 mt-0.5">
                <IconCheck className="h-3.5 w-3.5 text-teal-300" />
              </div>
              <div>
                <p className="font-bold text-white">Guaranteed Privacy</p>
                <p className="text-[11px] text-indigo-200">Personal questionnaire answers are never shown to other students.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs text-indigo-100">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/15 mt-0.5">
                <IconCheck className="h-3.5 w-3.5 text-teal-300" />
              </div>
              <div>
                <p className="font-bold text-white">Same-Gender Verification</p>
                <p className="text-[11px] text-indigo-200">Strict gender isolation enforced at both matching and hostel level.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs text-indigo-100">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/15 mt-0.5">
                <IconCheck className="h-3.5 w-3.5 text-teal-300" />
              </div>
              <div>
                <p className="font-bold text-white">Live Selection Rights</p>
                <p className="text-[11px] text-indigo-200">First-come-first-serve room claiming with zero warden delays.</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="relative z-10 text-[11px] text-indigo-200">
            Official University Campus Housing Portal.
          </div>
        </div>

        {/* ===================================================================
            RIGHT FORM CARD
            =================================================================== */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-xl w-full mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                Student Registration
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Create your student account to apply for hostel rooms and connect with compatible roommates.
              </p>
            </div>

            {generalError && (
              <Alert
                type="error"
                message={generalError}
                onClose={() => setGeneralError("")}
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Aman Sharma"
                  value={formData.name}
                  onChange={handleChange}
                  error={fieldErrors.name}
                />

                <Input
                  label="University Email"
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="student@university.edu"
                  value={formData.email}
                  onChange={handleChange}
                  error={fieldErrors.email}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Input
                    label="Password"
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    error={fieldErrors.password}
                  />

                  {/* Visual-only Password Strength Meter */}
                  {formData.password && (
                    <div className="space-y-1 pt-1 animate-fade-in">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Strength:</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">{strength.label}</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex gap-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-full flex-1 rounded-full transition-colors ${
                              i < strength.score ? strength.color : "bg-transparent"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Input
                  label="Confirm Password"
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={fieldErrors.confirmPassword}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Gender"
                  id="gender"
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleChange}
                  error={fieldErrors.gender}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Select>

                <Select
                  label="Academic Year"
                  id="year"
                  name="year"
                  required
                  value={formData.year}
                  onChange={handleChange}
                  error={fieldErrors.year}
                >
                  <option value="1">Year 1 (Freshman)</option>
                  <option value="2">Year 2 (Sophomore)</option>
                  <option value="3">Year 3 (Junior)</option>
                  <option value="4">Year 4 (Senior)</option>
                  <option value="5">Year 5 (PG / Dual)</option>
                </Select>

                <Input
                  label="Registration / Roll No."
                  id="registrationNumber"
                  name="registrationNumber"
                  type="text"
                  required
                  placeholder="e.g. 2024CS012"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  error={fieldErrors.registrationNumber}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Course / Degree"
                  id="course"
                  name="course"
                  type="text"
                  placeholder="e.g. B.Tech"
                  value={formData.course}
                  onChange={handleChange}
                  error={fieldErrors.course}
                />

                <Input
                  label="Department"
                  id="department"
                  name="department"
                  type="text"
                  placeholder="e.g. CSE"
                  value={formData.department}
                  onChange={handleChange}
                  error={fieldErrors.department}
                />

                <Input
                  label="Phone Number"
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  error={fieldErrors.phone}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                className="w-full mt-4"
              >
                Complete Registration & Continue
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already registered?{" "}
                <Link
                  href="/login"
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>

            {/* Quick links to How It Works, Features, and FAQ */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                How It Works
              </Link>
              <span>•</span>
              <Link href="/#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Features
              </Link>
              <span>•</span>
              <Link href="/#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
