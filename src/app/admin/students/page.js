"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import {
  PageContainer,
  Card,
  Badge,
  Button,
  Pagination,
  ConfirmDialog,
  EmptyState,
  Alert,
  Avatar,
  Select,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui";
import {
  AdminPageHeader,
  FilterBar,
  DataTable,
} from "@/components/admin";

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
  const [roomSize, setRoomSize] = useState("");

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
      if (roomSize) params.set("roomSize", roomSize);

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
  }, [search, gender, year, isInternational, preferencesCompleted, isActive, isDemo, roomSize]);

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

  const hasActiveFilters = Boolean(
    search || gender || year || isInternational || preferencesCompleted || isActive || isDemo || roomSize
  );

  const handleResetFilters = () => {
    setSearch("");
    setGender("");
    setYear("");
    setIsInternational("");
    setPreferencesCompleted("");
    setIsActive("");
    setIsDemo("");
    setRoomSize("");
  };

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      {/* Header */}
      <AdminPageHeader
        title="Student Directory"
        description="View registered students, review questionnaire completion, and inspect roommate preferences."
        breadcrumbs={[{ label: "Students" }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStudents(pagination.page)}
            isLoading={loading}
          >
            ↻ Refresh Directory
          </Button>
        }
      />

      {/* Error state */}
      {error && (
        <div className="mb-6">
          <Alert variant="danger" title="Error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {/* Filter and Search Panel */}
      <FilterBar
        search={search}
        onSearchChange={(val) => setSearch(val)}
        searchPlaceholder="Search by name, email, or registration number..."
        hasActiveFilters={hasActiveFilters}
        onClear={handleResetFilters}
      >
        <div className="w-full sm:w-36">
          <Select
            value={gender}
            onChange={(val) => setGender(val)}
            placeholder="All Genders"
            options={[
              { value: "", label: "All Genders" },
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>

        <div className="w-full sm:w-32">
          <Select
            value={year}
            onChange={(val) => setYear(val)}
            placeholder="All Years"
            options={[
              { value: "", label: "All Years" },
              { value: "1", label: "Year 1" },
              { value: "2", label: "Year 2" },
              { value: "3", label: "Year 3" },
              { value: "4", label: "Year 4" },
            ]}
          />
        </div>

        <div className="w-full sm:w-36">
          <Select
            value={isInternational}
            onChange={(val) => setIsInternational(val)}
            placeholder="All Origins"
            options={[
              { value: "", label: "All Origins" },
              { value: "false", label: "Domestic (India)" },
              { value: "true", label: "International" },
            ]}
          />
        </div>

        <div className="w-full sm:w-40">
          <Select
            value={preferencesCompleted}
            onChange={(val) => setPreferencesCompleted(val)}
            placeholder="Questionnaire"
            options={[
              { value: "", label: "All Questionnaires" },
              { value: "true", label: "✓ Completed" },
              { value: "false", label: "⏳ Pending" },
            ]}
          />
        </div>

        <div className="w-full sm:w-32">
          <Select
            value={isActive}
            onChange={(val) => setIsActive(val)}
            placeholder="Account Status"
            options={[
              { value: "", label: "All Accounts" },
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
        </div>

        <div className="w-full sm:w-32">
          <Select
            value={roomSize}
            onChange={(val) => setRoomSize(val)}
            placeholder="Room Size"
            options={[
              { value: "", label: "All Sizes" },
              { value: "1", label: "Single (1)" },
              { value: "2", label: "Double (2)" },
              { value: "3", label: "Triple (3)" },
              { value: "4", label: "Quad (4)" },
            ]}
          />
        </div>
      </FilterBar>

      {/* Students Data Table */}
      <DataTable
        isLoading={loading}
        isEmpty={students.length === 0}
        emptyTitle="No students found"
        emptyDescription="No student records matched your search criteria or filters."
        emptyAction={
          <Button variant="secondary" size="sm" onClick={handleResetFilters}>
            Clear Filters
          </Button>
        }
        pagination={{
          currentPage: pagination.page,
          totalPages: pagination.totalPages,
          totalItems: pagination.total,
          onPageChange: handlePageChange,
        }}
        skeletonRows={8}
        skeletonCols={7}
      >
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Course &amp; Year</TableHead>
            <TableHead>Origin / Country</TableHead>
            <TableHead>Room Size</TableHead>
            <TableHead>Preferences</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((st) => {
            const prefCompleted = Boolean(st.preferences?.completedAt);
            return (
              <TableRow key={st._id}>
                {/* Student Avatar, Name & Reg No */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar name={st.name} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {st.name}
                        </span>
                        {st.isDemo && (
                          <Badge variant="warning" size="xs">
                            DEMO
                          </Badge>
                        )}
                      </div>
                      <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 block">
                        {st.registrationNumber || "—"}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[180px] block">
                        {st.email}
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Course & Year */}
                <TableCell>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {st.course || "Unassigned"}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {st.year ? `Year ${st.year}` : "—"} •{" "}
                      <span className="capitalize">{st.gender || "—"}</span>
                    </span>
                  </div>
                </TableCell>

                {/* Origin & International */}
                <TableCell>
                  <div>
                    <div className="flex items-center gap-1.5">
                      {st.profile?.isInternational ? (
                        <Badge variant="brand" size="xs">
                          ✈️ Intl
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="xs">
                          Domestic
                        </Badge>
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {st.profile?.homeCountry || "India"}
                      </span>
                    </div>
                    {st.profile?.homeState && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                        {st.profile.homeState}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Room Size */}
                <TableCell>
                  {st.preferences?.roomSize ? (
                    <Badge variant="info" size="sm">
                      {st.preferences.roomSize === 1
                        ? "Single (1)"
                        : `${st.preferences.roomSize}-Bed`}
                    </Badge>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                  )}
                </TableCell>

                {/* Preferences Status */}
                <TableCell>
                  {prefCompleted ? (
                    <Badge variant="success" size="sm" dot>
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm" dot>
                      Pending
                    </Badge>
                  )}
                </TableCell>

                {/* Account Status with Toggle */}
                <TableCell>
                  <button
                    type="button"
                    onClick={() => handleOpenToggleConfirm(st)}
                    className="cursor-pointer group flex items-center gap-1.5"
                    title="Click to toggle account status"
                  >
                    <Badge
                      variant={st.isActive ? "success" : "neutral"}
                      size="sm"
                      className="group-hover:opacity-80 transition-opacity"
                    >
                      {st.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </button>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <Link href={`/admin/students/${st._id}`}>
                    <Button variant="ghost" size="xs" className="text-indigo-600 dark:text-indigo-400">
                      View Profile &rarr;
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </DataTable>

      {/* Confirmation Modal for Toggle Active/Inactive */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={targetStudent?.isActive ? "Deactivate Student Account?" : "Activate Student Account?"}
        message={
          targetStudent?.isActive
            ? `Are you sure you want to deactivate ${targetStudent?.name}? The student will lose access to the portal and will not be eligible for matching.`
            : `Are you sure you want to activate ${targetStudent?.name}? The student will regain access to their portal and preferences.`
        }
        confirmText={targetStudent?.isActive ? "Deactivate" : "Activate"}
        variant={targetStudent?.isActive ? "danger" : "primary"}
        isLoading={toggling}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetStudent(null);
        }}
        onConfirm={handleConfirmToggle}
      />
    </PageContainer>
  );
}
