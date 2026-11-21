import type { Metadata } from "next";
import { ConverterView } from "@/components/converter/converter-view";

export const metadata: Metadata = { title: "Document Converter" };

export default function ConverterPage() {
  return <ConverterView />;
}
