import type { Metadata } from "next";
import { FeaturesView } from "@/components/features/features-view";

export const metadata: Metadata = {
  title: "Features",
  description:
    "AI document analysis, chat, the AI Writer, document conversion, version history, sharing and organization — everything DocuMind AI can do.",
};

export default function FeaturesPage() {
  return <FeaturesView />;
}
