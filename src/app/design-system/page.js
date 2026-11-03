import { notFound } from "next/navigation";
import DesignSystemClient from "./DesignSystemClient";

export const metadata = {
  title: "Design System Showcase | HostelMatch",
};

export default function DesignSystemPage() {
  // Excluded in production
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DesignSystemClient />;
}

