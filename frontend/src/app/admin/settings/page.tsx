import type { Metadata } from "next";
import { AdminSettingsView } from "@/components/admin/settings-view";

export const metadata: Metadata = { title: "Admin Settings" };

export default function AdminSettingsPage() {
  return <AdminSettingsView />;
}
