"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "@/lib/axios";
import { PageContainer, Card, Alert, Button } from "@/components/ui";
import { AdminPageHeader } from "@/components/admin";
import HostelForm from "@/components/hostels/HostelForm";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function EditHostelPage() {
  const { id } = useParams();
  const router = useRouter();

  const [hostel, setHostel] = useState(null);
  useDocumentTitle(hostel ? `Edit ${hostel.name}` : "Edit Hostel", true);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadHostel = useCallback(async () => {
    try {
      setFetching(true);
      setError(null);
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
  }, [id]);

  useEffect(() => {
    if (id) loadHostel();
  }, [id, loadHostel]);

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

  if (fetching) {
    return (
      <PageContainer maxWidth="4xl" className="py-8">
        <div className="h-64 animate-pulse rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
      </PageContainer>
    );
  }

  if (error && !hostel) {
    return (
      <PageContainer maxWidth="4xl" className="py-8">
        <Alert
          variant="danger"
          title="Error Loading Hostel"
          action={
            <Button variant="outline" size="sm" onClick={loadHostel}>
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => router.push("/admin/hostels")}>
            &larr; Back to Hostels
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="4xl" className="py-8">
      <AdminPageHeader
        title={`Edit Hostel: ${hostel?.name || "Loading..."}`}
        description="Update capacity boundaries, gender policy, and operational rules."
        breadcrumbs={[
          { href: "/admin/hostels", label: "Hostels" },
          { href: `/admin/hostels/${id}`, label: hostel?.code || "Hostel" },
          { label: "Edit" },
        ]}
      />

      {error && (
        <div className="mb-6">
          <Alert variant="danger" title="Error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      <Card className="p-6 sm:p-8">
        <HostelForm
          initialData={hostel}
          onSubmit={handleUpdateHostel}
          loading={saving}
          error={error}
        />
      </Card>
    </PageContainer>
  );
}
