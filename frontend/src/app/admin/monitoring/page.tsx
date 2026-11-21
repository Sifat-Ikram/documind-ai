import type { Metadata } from "next";
import { AdminMonitoringView } from "@/components/admin/monitoring-view";

export const metadata: Metadata = { title: "System Monitoring" };

export default function AdminMonitoringPage() {
  return <AdminMonitoringView />;
}
