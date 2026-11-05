"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import { PageContainer, Card } from "@/components/ui";
import { AdminPageHeader } from "@/components/admin";
import HostelForm from "@/components/hostels/HostelForm";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function NewHostelPage() {
  useDocumentTitle("New Hostel", true);
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
    <PageContainer maxWidth="4xl" className="py-8">
      <AdminPageHeader
        title="Create New Hostel"
        description="Define building attributes, floor count, gender designation, and eligibility rules."
        breadcrumbs={[
          { href: "/admin/hostels", label: "Hostels" },
          { label: "Add New" },
        ]}
      />

      <Card className="p-6 sm:p-8">
        <HostelForm onSubmit={handleCreateHostel} loading={loading} error={error} />
      </Card>
    </PageContainer>
  );
}
