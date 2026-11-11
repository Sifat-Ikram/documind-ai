import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalysisView } from "@/components/analysis/analysis-view";

export const metadata: Metadata = { title: "Analyze document" };

export default async function AnalyzePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <AnalysisView documentId={id} />
    </Suspense>
  );
}
