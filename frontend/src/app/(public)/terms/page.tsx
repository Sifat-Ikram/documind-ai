import type { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content/content-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using DocuMind AI.",
};

export default function TermsPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="By using DocuMind AI you agree to these terms. They are short on purpose."
      updated="November 2026"
    >
      <ContentSection title="Your account">
        <p>
          You are responsible for the content you upload and for keeping your
          password safe. Use a real email address, because that is how you get
          back into your account. One person, one account.
        </p>
      </ContentSection>
      <ContentSection title="Acceptable use">
        <p>
          Do not upload files you have no right to share, and do not use the
          service to produce content that is illegal, harassing or designed to
          deceive. Automated scraping of the AI features is not allowed.
        </p>
      </ContentSection>
      <ContentSection title="AI output">
        <p>
          Text produced by the AI can be wrong. It is your responsibility to
          review anything you send, publish or rely on. The AI does not give
          legal, medical or financial advice.
        </p>
      </ContentSection>
      <ContentSection title="Availability">
        <p>
          The service is provided as it is. Features can change, and free
          generation limits exist to keep the service available for everyone. We
          may suspend an account that abuses the service.
        </p>
      </ContentSection>
      <ContentSection title="Your content stays yours">
        <p>
          You keep all rights to the documents you upload and to the drafts you
          generate. We store them to run the service for you, and nothing more.
        </p>
      </ContentSection>
      <ContentSection title="Ending your use">
        <p>
          You can stop using DocuMind AI at any time and delete your account from
          Settings. These terms stay in force for the content you created while
          using the service.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
