import type { Metadata } from "next";
import { ContactView } from "@/components/contact/contact-view";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions, problems or feedback about DocuMind AI.",
};

export default function ContactPage() {
  return <ContactView />;
}
