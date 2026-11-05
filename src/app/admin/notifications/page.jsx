"use client";

import NotificationsCenter from "@/components/notifications/NotificationsCenter";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function AdminNotificationsPage() {
  useDocumentTitle("Notifications", true);
  return <NotificationsCenter portalRole="admin" />;
}
