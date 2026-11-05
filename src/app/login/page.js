"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { IconShield, IconSparkles, IconCheck, IconBed, IconLock } from "@/components/ui/Icons";

function LoginForm() {
  useDocumentTitle("Sign In");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState("student"); // "student" | "admin"
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError("");
    setFormData({ email: "", password: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login({
      email: formData.email,
      password: formData.password,
      role: selectedRole,
    });
    setLoading(false);

    if (result.success) {
      if (nextPath) {
        router.push(nextPath);
      } else if (result.user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } else {
      setError(result.message || "Invalid email or password");
    }
  };

  const isStudent = selectedRole === "student";

  return (
    <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl grid grid-cols-1 md:grid-cols-12 animate-scale-in">
        {/* ===================================================================
            LEFT DECORATIVE BRAND PANEL (DESKTOP)
            =================================================================== */}
        <div className="hidden md:flex md:col-span-5 flex-col justify-between p-8 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white relative overflow-hidden">
          {/* Subtle blurred background auras */}
          <div aria-hidden="true" className="absolute -top-12 -left-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden="true" className="absolute -bottom-12 -right-12 h-52 w-52 rounded-full bg-purple-400/20 blur-3xl" />

          {/* Top Brand Mark */}
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
                Campus Living Elevated
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
                Welcome to your housing portal
              </h2>
              <p className="text-xs text-indigo-100/90 leading-relaxed">
                Log in to review lifestyle matches, manage group invitations, or claim your dorm room live.
              </p>
            </div>
          </div>

          {/* Mini Feature List */}
          <div className="relative z-10 my-8 space-y-3.5 border-y border-white/15 py-6">
            <div className="flex items-center gap-2.5 text-xs text-indigo-100">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <IconCheck className="h-3.5 w-3.5 text-teal-300" />
              </div>
              <span>Multi-factor compatibility engine</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-indigo-100">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <IconCheck className="h-3.5 w-3.5 text-teal-300" />
              </div>
              <span>Automated deal-breaker filtering</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-indigo-100">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <IconCheck className="h-3.5 w-3.5 text-teal-300" />
              </div>
              <span>First-come-first-serve selection</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="relative z-10 text-[11px] text-indigo-200">
            Protected by role-based campus authentication.
          </div>
        </div>

        {/* ===================================================================
            RIGHT FORM CARD
            =================================================================== */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                {isStudent ? "Student Sign In" : "Administrator Sign In"}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {isStudent
                  ? "Access your lifestyle matches, group, and room allocation"
                  : "Management console for hostel wardens and administrative staff"}
              </p>
            </div>

            {/* Role Preference Selector Tabs */}
            <div>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1.5 border border-slate-200/80 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => handleRoleSelect("student")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs sm:text-sm font-bold transition-all ${
                    isStudent
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <span>🎓</span>
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect("admin")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs sm:text-sm font-bold transition-all ${
                    !isStudent
                      ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <span>🛡️</span>
                  Administrator
                </button>
              </div>
            </div>

            {error && (
              <Alert
                type="error"
                message={error}
                onClose={() => setError("")}
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={isStudent ? "Student Email Address" : "Staff / Warden Email Address"}
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={isStudent ? "student@university.edu" : "admin@hostelmatch.edu"}
                value={formData.email}
                onChange={handleChange}
              />

              <Input
                label="Password"
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />

              <Button
                type="submit"
                variant={isStudent ? "primary" : "primary"}
                size="lg"
                isLoading={loading}
                className="w-full mt-2"
              >
                Sign In as {isStudent ? "Student" : "Administrator"}
              </Button>
            </form>

            {isStudent && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Don&apos;t have a student account yet?{" "}
                  <Link
                    href="/register"
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Register here
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
