import type { Metadata } from "next";
import { AdminFeedbackView } from "@/components/admin/feedback-view";

export const metadata: Metadata = { title: "Feedback & Support" };

export default function AdminFeedbackPage() {
  return <AdminFeedbackView />;
}
