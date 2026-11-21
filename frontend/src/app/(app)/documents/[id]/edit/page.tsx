import type { Metadata } from "next";
import { EditDocumentView } from "@/components/editor/edit-document-view";

export const metadata: Metadata = { title: "Edit document" };

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { id } = await params;
  const { version } = await searchParams;
  const parsed = Number(version);
  return (
    <EditDocumentView
      id={id}
      version={Number.isInteger(parsed) && parsed > 0 ? parsed : undefined}
    />
  );
}
