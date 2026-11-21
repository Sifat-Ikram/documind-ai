import type { Metadata } from "next";
import { AdminAnalyticsView } from "@/components/admin/analytics-view";

export const metadata: Metadata = { title: "System Analytics" };

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsView />;
}
