import type { Metadata } from "next";
import { GeneratorView } from "@/components/generator/generator-view";

export const metadata: Metadata = {
  title: "AI Writer",
  description:
    "Describe the document you need and DocuMind AI writes it for you. Free to try, no account needed.",
};

export default function GeneratePage() {
  return <GeneratorView />;
}
