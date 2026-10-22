"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "@/lib/axios";
import HostelForm from "@/components/hostels/HostelForm";

export default function NewHostelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateHostel = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post("/api/hostels", formData);
      if (res.data?.success) {
        const createdId = res.data.data?._id;
        router.push(createdId ? `/admin/hostels/${createdId}` : "/admin/hostels");
      }
    } catch (err) {
      console.error("Failed to create hostel:", err);
      setError(err.response?.data?.message || err.message || "Failed to create hostel");
    } finally {
      setLoading(false);
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
          <span className="text-slate-800">Add New</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Create New Hostel
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Define building attributes, floor count, gender designation, and eligibility rules.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <HostelForm onSubmit={handleCreateHostel} loading={loading} error={error} />
      </div>
    </div>
  );
}
