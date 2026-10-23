"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [year, setYear] = useState("");
  const [isInternational, setIsInternational] = useState("");
  const [preferencesCompleted, setPreferencesCompleted] = useState("");
  const [isActive, setIsActive] = useState("");
  const [isDemo, setIsDemo] = useState("");

  // Confirmation modal state for status toggle
  const [targetStudent, setTargetStudent] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchStudents = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      if (search.trim()) params.set("search", search.trim());
      if (gender) params.set("gender", gender);
      if (year) params.set("year", year);
      if (isInternational) params.set("isInternational", isInternational);
      if (preferencesCompleted) params.set("preferencesCompleted", preferencesCompleted);
      if (isActive) params.set("isActive", isActive);
      if (isDemo) params.set("isDemo", isDemo);

      const res = await axios.get(`/api/admin/students?${params.toString()}`);
      if (res.data?.success) {
        setStudents(res.data.data.students || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error("Failed to load students:", err);
      setError(err.response?.data?.message || "Failed to retrieve student directory");
    } finally {
      setLoading(false);
    }
  }, [search, gender, year, isInternational, preferencesCompleted, isActive, isDemo]);

  useEffect(() => {
    fetchStudents(1);
  }, [fetchStudents]);

  const handlePageChange = (newPage) => {
    fetchStudents(newPage);
  };

  const handleOpenToggleConfirm = (student) => {
    setTargetStudent(student);
    setIsConfirmOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!targetStudent) return;
    try {
      setToggling(true);
      const newStatus = !targetStudent.isActive;
      const res = await axios.patch(`/api/admin/students/${targetStudent._id}`, {
        isActive: newStatus,
      });

      if (res.data?.success) {
        setStudents((prev) =>
          prev.map((s) => (s._id === targetStudent._id ? { ...s, isActive: newStatus } : s))
        );
        setIsConfirmOpen(false);
        setTargetStudent(null);
      }
    } catch (err) {
      console.error("Failed to toggle student status:", err);
      alert(err.response?.data?.message || "Could not update student status");
    } finally {
      setToggling(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setGender("");
    setYear("");
    setIsInternational("");
    setPreferencesCompleted("");
    setIsActive("");
    setIsDemo("");
  };

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              &larr; Admin Console
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Student Directory
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View registered students, review questionnaire completion, and inspect roommate preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStudents(pagination.page)}
            isLoading={loading}
          >
            ↻ Refresh List
          </Button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              label="Search Students"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or registration no..."
            />
          </div>

          {/* Gender */}
          <Select
            label="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            placeholder="All Genders"
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
            ]}
          />

          {/* Academic Year */}
          <Select
            label="Year of Study"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="All Years"
            options={[
              { value: "1", label: "Year 1" },
              { value: "2", label: "Year 2" },
              { value: "3", label: "Year 3" },
              { value: "4", label: "Year 4" },
              { value: "5", label: "Year 5" },
              { value: "6", label: "Year 6" },
            ]}
          />

          {/* International Status */}
          <Select
            label="Student Origin"
            value={isInternational}
            onChange={(e) => setIsInternational(e.target.value)}
            placeholder="All Origins"
            options={[
              { value: "false", label: "Domestic (India)" },
              { value: "true", label: "International" },
            ]}
          />

          {/* Preferences Completion */}
          <Select
            label="Questionnaire Status"
            value={preferencesCompleted}
            onChange={(e) => setPreferencesCompleted(e.target.value)}
            placeholder="All Statuses"
            options={[
              { value: "true", label: "✓ Preferences Completed" },
              { value: "false", label: "⏳ Pending Preferences" },
            ]}
          />

          {/* Account Status */}
          <Select
            label="Account Status"
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
            placeholder="All Statuses"
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />

          {/* Demo Records */}
          <Select
            label="Data Type"
            value={isDemo}
            onChange={(e) => setIsDemo(e.target.value)}
            placeholder="All Records"
            options={[
              { value: "false", label: "Real Students Only" },
              { value: "true", label: "Demo Students Only" },
            ]}
          />
        </div>

        {/* Clear Filters Row */}
        {(search || gender || year || isInternational || preferencesCompleted || isActive || isDemo) && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Active filters applied</span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-semibold text-rose-600 hover:text-rose-700 transition-colors"
            >
              ✕ Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* Students Data Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Course & Year</th>
                <th className="py-3.5 px-4">Origin / Country</th>
                <th className="py-3.5 px-4">Preferences</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading student records...
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12">
                    <EmptyState
                      title="No students found"
                      description="No student records matched your search criteria or filters."
                      action={
                        <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                          Clear Filters
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                students.map((st) => {
                  const prefCompleted = Boolean(st.preferences?.completedAt);
                  return (
                    <tr key={st._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Reg No */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{st.name}</span>
                            {st.isDemo && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                                DEMO
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-xs text-indigo-600">
                            {st.registrationNumber || "—"}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            {st.email}
                          </span>
                        </div>
                      </td>

                      {/* Course & Year */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">
                            {st.course || "Unassigned"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {st.year ? `Year ${st.year}` : "—"} ·{" "}
                            <span className="capitalize">{st.gender || "—"}</span>
                          </span>
                        </div>
                      </td>

                      {/* Origin & International */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            {st.profile?.isInternational ? (
                              <span className="inline-flex items-center rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                                ✈️ Intl
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                🇮🇳 Domestic
                              </span>
                            )}
                            <span className="font-semibold text-slate-800">
                              {st.profile?.homeCountry || "India"}
                            </span>
                          </div>
                          {st.profile?.homeState && (
                            <span className="text-xs text-slate-500">
                              {st.profile.homeState}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Preferences */}
                      <td className="py-3.5 px-4">
                        {prefCompleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            ✓ Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            ⏳ Pending
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {st.isActive ? (
                          <Badge variant="success" size="sm">Active</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Inactive</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/students/${st._id}`}
                            className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            Details &rarr;
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenToggleConfirm(st)}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                              st.isActive
                                ? "border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {st.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Confirmation Dialog for Active Status Toggle */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetStudent(null);
        }}
        onConfirm={handleConfirmToggle}
        title={targetStudent?.isActive ? "Deactivate Student Account?" : "Activate Student Account?"}
        message={
          targetStudent?.isActive
            ? `Are you sure you want to deactivate ${targetStudent?.name}? They will be temporarily barred from logging into the portal and participating in room allocation.`
            : `Are you sure you want to reactivate ${targetStudent?.name}? They will immediately regain access to the student dashboard and roommate matching.`
        }
        confirmText={targetStudent?.isActive ? "Deactivate Account" : "Activate Account"}
        variant={targetStudent?.isActive ? "danger" : "primary"}
        isLoading={toggling}
      />
    </div>
  );
}
