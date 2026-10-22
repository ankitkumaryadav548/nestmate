"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "@/lib/axios";
import HostelForm from "@/components/hostels/HostelForm";
import Alert from "@/components/ui/Alert";

export default function EditHostelPage() {
  const { id } = useParams();
  const router = useRouter();

  const [hostel, setHostel] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadHostel() {
      try {
        setFetching(true);
        const res = await axios.get(`/api/hostels/${id}`);
        if (res.data?.success) {
          setHostel(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch hostel:", err);
        setError(err.response?.data?.message || "Failed to load hostel details.");
      } finally {
        setFetching(false);
      }
    }
    if (id) loadHostel();
  }, [id]);

  const handleUpdateHostel = async (formData) => {
    try {
      setSaving(true);
      setError(null);
      const res = await axios.put(`/api/hostels/${id}`, formData);
      if (res.data?.success) {
        router.push(`/admin/hostels/${id}`);
      }
    } catch (err) {
      console.error("Failed to update hostel:", err);
      setError(err.response?.data?.message || err.message || "Failed to update hostel.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
          <Link href="/admin" className="hover:text-indigo-600">Admin</Link>
          <span>/</span>
          <Link href="/admin/hostels" className="hover:text-indigo-600">Hostels</Link>
          <span>/</span>
          <span className="text-slate-800">Edit {hostel?.name || "Hostel"}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Edit Hostel: {hostel?.name || "..."}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Update facilities, rules, active status, or allowed academic years.
        </p>
      </div>

      {fetching ? (
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : error && !hostel ? (
        <Alert type="error" title="Error Loading Hostel" message={error} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <HostelForm
            initialData={hostel}
            onSubmit={handleUpdateHostel}
            loading={saving}
            error={error}
          />
        </div>
      )}
    </div>
  );
}
