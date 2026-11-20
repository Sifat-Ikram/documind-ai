import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "DocuMind AI — documents, written and understood by AI",
  description:
    "Analyze documents with AI, chat about their contents, search everything you own, and write new drafts in seconds. Free to try.",
};

export default function HomePage() {
  return <LandingPage />;
}
