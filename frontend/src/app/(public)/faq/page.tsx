import type { Metadata } from "next";
import { FaqView } from "@/components/faq/faq-view";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about accounts, uploads, the AI Writer, exports and how DocuMind AI handles your documents.",
};

export default function FaqPage() {
  return <FaqView />;
}
