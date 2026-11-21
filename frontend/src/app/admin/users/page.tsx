import type { Metadata } from "next";
import { AdminUsersView } from "@/components/admin/users-view";

export const metadata: Metadata = { title: "User Management" };

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
