import type { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content/content-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What DocuMind AI stores, who can see it, and how to remove it.",
};

export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="This page explains what DocuMind AI stores when you use it, and the choices you have."
      updated="November 2026"
    >
      <ContentSection title="What we store">
        <p>
          Your name and email address when you create an account, the documents
          you upload or generate, and the analyses, chats, notes and comments you
          create. Technical data such as the file size and word count is stored
          with each document so the interface can show it.
        </p>
      </ContentSection>
      <ContentSection title="Who can see your documents">
        <p>
          Only you, unless you share a document or a collection with someone. A
          share is either view or edit access and can be removed at any time.
          Shared documents stay visible to the people you added until you remove
          them.
        </p>
      </ContentSection>
      <ContentSection title="Analyses and AI processing">
        <p>
          The text of a document is sent to the AI provider only to produce the
          result you asked for. Uploaded documents are not used to train models,
          and guest drafts are not linked to an account.
        </p>
      </ContentSection>
      <ContentSection title="How long data is kept">
        <p>
          Documents stay in your library until you move them to Trash. Trash is
          emptied automatically after 30 days. Generated drafts are available for
          24 hours unless you save them to My Documents.
        </p>
      </ContentSection>
      <ContentSection title="Cookies">
        <p>
          We use a session cookie to keep you logged in and, for guests, a cookie
          that remembers the free drafts used on this browser. Preferences such
          as theme and layout are stored in your browser, not on our servers.
        </p>
      </ContentSection>
      <ContentSection title="Deleting your data">
        <p>
          You can delete documents, drafts and your account from the app. When an
          account is deleted, its documents and generated drafts are removed as
          well. If something does not work as described here, write to us from
          the Contact page.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
