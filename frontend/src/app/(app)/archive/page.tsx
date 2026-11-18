import { Suspense } from "react";
import type { Metadata } from "next";
import { ArchiveView } from "@/components/documents/archive-view";

export const metadata: Metadata = { title: "Archive" };

export default function ArchivePage() {
  return (
    <Suspense fallback={null}>
      <ArchiveView />
    </Suspense>
  );
}
