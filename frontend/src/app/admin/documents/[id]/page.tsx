import type { Metadata } from "next";
import { AdminDocumentDetailView } from "@/components/admin/document-detail-view";

export const metadata: Metadata = { title: "Document" };

export default async function AdminDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminDocumentDetailView id={id} />;
}
