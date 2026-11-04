import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardShell from "@/components/layout/DashboardShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: {
    template: "%s | Admin Portal | HostelMatch",
    default: "Admin Portal | HostelMatch",
  },
};

export default async function AdminLayout({ children }) {
  // Server-side strict authentication and role verification
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (user.role !== "admin") {
    redirect("/unauthorized");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
