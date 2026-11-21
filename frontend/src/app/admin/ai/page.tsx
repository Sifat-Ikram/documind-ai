import type { Metadata } from "next";
import { AdminAiView } from "@/components/admin/ai-view";

export const metadata: Metadata = { title: "AI Usage & Analytics" };

export default function AdminAiPage() {
  return <AdminAiView />;
}
