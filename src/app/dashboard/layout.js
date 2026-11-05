import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardShell from "@/components/layout/DashboardShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: {
    template: "%s | HostelMatch",
    default: "Dashboard | HostelMatch",
  },
};

export default async function DashboardLayout({ children }) {
  // Server-side authentication verification
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
