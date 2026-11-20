import type { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content/content-page";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Why DocuMind AI exists: one calm place to read, write and organize documents.",
};

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="About us"
      title="Documents should not be hard work"
      intro="DocuMind AI started with a simple annoyance: the most time-consuming part of most jobs is not the thinking, it is the reading and the first draft."
    >
      <ContentSection title="What we build">
        <p>
          A workspace where a document can be uploaded, understood, discussed,
          organized and written. Analysis turns a long file into something you
          can act on. Chat answers questions from the file itself. Search finds
          the one paragraph you remember. The AI Writer produces the first draft
          of the next document.
        </p>
      </ContentSection>
      <ContentSection title="How we think about AI">
        <p>
          The AI is a fast assistant, not an authority. Answers are based on your
          own files rather than the open web, and every draft is a starting
          point that you review. We would rather show you where a statement came
          from than pretend it is always right.
        </p>
      </ContentSection>
      <ContentSection title="Your documents belong to you">
        <p>
          Files are private by default. You decide what to share and with whom,
          and you can remove access again at any time. Nothing you upload is used
          to train models.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
