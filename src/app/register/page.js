"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function RegisterPage() {
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
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25 mb-4">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Student Registration
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Create your account to apply for hostels and match with roommates
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
          {generalError && (
            <Alert
              type="error"
              message={generalError}
              className="mb-6"
              onClose={() => setGeneralError("")}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Basic Account Info */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">
                Account Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  id="name"
                  name="name"
                  required
                  placeholder="Jane Doe"
                  value={formData.name}
                  onChange={handleChange}
                  error={fieldErrors.name}
                />

                <Input
                  label="Email Address"
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="jane.doe@university.edu"
                  value={formData.email}
                  onChange={handleChange}
                  error={fieldErrors.email}
                />

                <Input
                  label="Password"
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  error={fieldErrors.password}
                />

                <Input
                  label="Confirm Password"
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={fieldErrors.confirmPassword}
                />
              </div>
            </div>

            {/* Section 2: Student Identification & Academic Details */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">
                Academic & Profile Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Registration / Student ID"
                  id="registrationNumber"
                  name="registrationNumber"
                  required
                  placeholder="e.g. STU-2026-0891"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  error={fieldErrors.registrationNumber}
                />

                {/* Gender Dropdown */}
                <div className="w-full space-y-1.5">
                  <label
                    htmlFor="gender"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {fieldErrors.gender && (
                    <p className="text-xs text-rose-600">{fieldErrors.gender}</p>
                  )}
                </div>

                <Input
                  label="Course / Degree"
                  id="course"
                  name="course"
                  placeholder="e.g. B.Tech Computer Engineering"
                  value={formData.course}
                  onChange={handleChange}
                  error={fieldErrors.course}
                />

                <Input
                  label="Department"
                  id="department"
                  name="department"
                  placeholder="e.g. School of Engineering"
                  value={formData.department}
                  onChange={handleChange}
                  error={fieldErrors.department}
                />

                {/* Academic Year Dropdown */}
                <div className="w-full space-y-1.5">
                  <label
                    htmlFor="year"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Academic Year
                  </label>
                  <select
                    id="year"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="1">1st Year (Freshman)</option>
                    <option value="2">2nd Year (Sophomore)</option>
                    <option value="3">3rd Year (Junior)</option>
                    <option value="4">4th Year (Senior)</option>
                    <option value="5">5th Year</option>
                    <option value="6">6th Year</option>
                  </select>
                  {fieldErrors.year && (
                    <p className="text-xs text-rose-600">{fieldErrors.year}</p>
                  )}
                </div>

                <Input
                  label="Phone Number"
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                  error={fieldErrors.phone}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full shadow-md mt-6"
            >
              Complete Registration
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
              >
                Log in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
