import { Suspense } from "react";
import type { Metadata } from "next";
import { DocumentsView } from "@/components/documents/documents-view";

export const metadata: Metadata = { title: "My Documents" };

export default function DocumentsPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsView />
    </Suspense>
  );
}
