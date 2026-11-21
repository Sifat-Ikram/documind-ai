import type { Metadata } from "next";
import { AdminDocumentsView } from "@/components/admin/documents-view";

export const metadata: Metadata = { title: "Document Management" };

export default function AdminDocumentsPage() {
  return <AdminDocumentsView />;
}
