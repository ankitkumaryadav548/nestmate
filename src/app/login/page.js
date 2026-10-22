"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

function LoginForm() {
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

  const handleFillAdminDemo = () => {
    setFormData({
      email: "admin@hostelmatch.edu",
      password: "AdminPassword123!",
    });
    setError("");
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
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="w-full max-w-md space-y-6">
        {/* Header with dynamic icon */}
        <div className="text-center">
          <div
            className={`inline-flex h-13 w-13 items-center justify-center rounded-2xl text-white shadow-lg mb-3 transition-colors ${
              isStudent
                ? "bg-gradient-to-br from-indigo-600 to-blue-600 shadow-indigo-500/25"
                : "bg-gradient-to-br from-purple-700 to-indigo-900 shadow-purple-900/30"
            }`}
          >
            {isStudent ? (
              <span className="text-2xl">🎓</span>
            ) : (
              <span className="text-2xl">🛡️</span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {isStudent ? "Student Sign In" : "Administrator Sign In"}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600">
            {isStudent
              ? "Access your room allocations, roommate preferences & profile"
              : "Institutional management console for wardens and staff"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50">
          {/* Role Preference Selector Tabs */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Select Login Role:
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5 border border-slate-200/70">
              <button
                type="button"
                onClick={() => handleRoleSelect("student")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs sm:text-sm font-semibold transition-all ${
                  isStudent
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <span>🎓</span>
                Student
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect("admin")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs sm:text-sm font-semibold transition-all ${
                  !isStudent
                    ? "bg-purple-700 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
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
              className="mb-5"
              onClose={() => setError("")}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={isStudent ? "Student Email Address" : "Admin Email Address"}
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
              className={`w-full shadow-md ${
                !isStudent ? "!bg-purple-700 hover:!bg-purple-800 focus-visible:!outline-purple-700" : ""
              }`}
            >
              Sign In as {isStudent ? "Student" : "Administrator"}
            </Button>
          </form>

          {/* Role-Specific Helpers */}
          {!isStudent && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleFillAdminDemo}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/70 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100/70 transition-colors"
              >
                <span>⚡</span>
                Fill Seed Admin Credentials
              </button>
              <p className="text-[11px] text-center text-slate-400">
                Created with <code className="font-mono text-slate-600">npm run seed:admin</code>
              </p>
            </div>
          )}

          {isStudent && (
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-600">
                Don&apos;t have a student account yet?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
                >
                  Register here
                </Link>
              </p>
            </div>
          )}
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
