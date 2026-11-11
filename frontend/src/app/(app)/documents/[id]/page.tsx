import type { Metadata } from "next";
import { DocumentDetailsView } from "@/components/documents/document-details-view";

export const metadata: Metadata = { title: "Document" };

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentDetailsView id={id} />;
}
