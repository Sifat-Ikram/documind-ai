import { Suspense } from "react";
import type { Metadata } from "next";
import { ConversationsView } from "@/components/conversations/conversations-view";

export const metadata: Metadata = { title: "AI Conversations" };

export default function ConversationsPage() {
  return (
    <Suspense fallback={null}>
      <ConversationsView />
    </Suspense>
  );
}
