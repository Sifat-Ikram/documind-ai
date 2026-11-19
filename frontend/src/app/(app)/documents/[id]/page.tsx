import type { Metadata } from "next";
import { DocumentDetailsView } from "@/components/documents/document-details-view";

export const metadata: Metadata = { title: "Document" };

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  return <DocumentDetailsView id={id} initialTab={tab} />;
}
