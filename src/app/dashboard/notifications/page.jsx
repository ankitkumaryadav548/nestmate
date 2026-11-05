"use client";

import NotificationsCenter from "@/components/notifications/NotificationsCenter";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function StudentNotificationsPage() {
  useDocumentTitle("Notifications");
  return <NotificationsCenter portalRole="student" />;
}
