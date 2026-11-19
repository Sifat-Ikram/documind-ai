import type { Metadata } from "next";
import { SharedView } from "@/components/sharing/shared-view";

export const metadata: Metadata = { title: "Shared with Me" };

export default function SharedPage() {
  return <SharedView />;
}
