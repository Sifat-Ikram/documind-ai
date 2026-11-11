import type {
  ActionItemsData,
  AnalysisDetail,
  ExtractedData,
  KeyPointsData,
  QaData,
  SimplifyData,
  SummaryData,
  TaskSection,
  TranslateData,
} from "@/types/api";

const list = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

export function sectionToText(section: TaskSection): string {
  if (section.error) return `${section.title}\n${section.error}`;
  const data = section.data;
  const body: string[] = [];

  switch (section.task) {
    case "SUMMARIZE": {
      const d = data as SummaryData;
      body.push(d.overview);
      for (const s of d.sections ?? []) body.push(`${s.heading}\n${s.content}`);
      if (d.highlights?.length) body.push(`Highlights\n${list(d.highlights)}`);
      break;
    }
    case "EXTRACT_KEY_POINTS":
      body.push(list((data as KeyPointsData).points ?? []));
      break;
    case "DOCUMENT_QA": {
      const d = data as QaData;
      body.push(d.found ? d.answer : `Not found in the document.\n${d.answer}`);
      break;
    }
    case "EXTRACT_DATA": {
      const d = data as ExtractedData;
      if (d.people?.length) body.push(`People\n${list(d.people)}`);
      if (d.organizations?.length)
        body.push(`Organizations\n${list(d.organizations)}`);
      if (d.locations?.length) body.push(`Locations\n${list(d.locations)}`);
      if (d.dates?.length) {
        body.push(
          `Dates\n${list(d.dates.map((x) => (x.context ? `${x.value} (${x.context})` : x.value)))}`,
        );
      }
      if (d.numbers?.length) {
        body.push(
          `Numbers\n${list(d.numbers.map((x) => (x.context ? `${x.value} (${x.context})` : x.value)))}`,
        );
      }
      for (const o of d.other ?? []) body.push(`${o.label}\n${list(o.values)}`);
      break;
    }
    case "SIMPLIFY": {
      const d = data as SimplifyData;
      body.push(d.simplified);
      if (d.glossary?.length) {
        body.push(
          `Glossary\n${list(d.glossary.map((g) => `${g.term}: ${g.meaning}`))}`,
        );
      }
      break;
    }
    case "TRANSLATE": {
      const d = data as TranslateData;
      body.push(`Language: ${d.language}`, d.translation);
      break;
    }
    case "EXTRACT_ACTION_ITEMS": {
      const d = data as ActionItemsData;
      body.push(
        list(
          (d.items ?? []).map((i) => {
            const extra = [
              i.responsible ? `Responsible: ${i.responsible}` : "",
              i.deadline ? `Deadline: ${i.deadline}` : "",
              i.notes ?? "",
            ].filter(Boolean);
            return extra.length ? `${i.task} (${extra.join("; ")})` : i.task;
          }),
        ),
      );
      break;
    }
  }

  return `${section.title}\n\n${body.join("\n\n")}`;
}

export function analysisToText(analysis: AnalysisDetail): string {
  const { sections, notes } = analysis.result;
  const header = `Document: ${analysis.document.originalName}\nInstruction: ${analysis.originalInstruction}`;
  const tail = notes.length ? `\n\nNotes\n${list(notes)}` : "";
  return `${header}\n\n${sections.map(sectionToText).join("\n\n")}${tail}`;
}
