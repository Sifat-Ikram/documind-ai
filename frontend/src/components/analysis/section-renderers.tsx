import { FiAlertTriangle, FiGlobe } from "react-icons/fi";
import { Markdown } from "@/components/ui/markdown";
import type {
  ActionItemsData,
  ExtractedData,
  KeyPointsData,
  QaData,
  SimplifyData,
  SummaryData,
  TaskSection,
  TranslateData,
} from "@/types/api";

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <li
          key={`${item}-${i}`}
          className="rounded-full border border-border bg-surface-muted px-3 py-1 text-sm text-text"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
      {children}
    </h4>
  );
}

function SummaryBody({ data }: { data: SummaryData }) {
  return (
    <div className="space-y-5">
      <Markdown>{data.overview}</Markdown>
      {data.sections?.length > 0 && (
        <div className="space-y-4">
          {data.sections.map((s, i) => (
            <div key={`${s.heading}-${i}`}>
              <h4 className="text-sm font-semibold text-text">{s.heading}</h4>
              <Markdown className="mt-1 text-text-muted">{s.content}</Markdown>
            </div>
          ))}
        </div>
      )}
      {data.highlights?.length > 0 && (
        <div className="rounded-xl bg-ai-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ai">
            Highlights
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-text">
            {data.highlights.map((h, i) => (
              <li key={`${h}-${i}`}>{h}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KeyPointsBody({ data }: { data: KeyPointsData }) {
  if (!data.points?.length) {
    return <p className="text-sm text-text-muted">No key points were found.</p>;
  }
  return (
    <ol className="space-y-3">
      {data.points.map((point, i) => (
        <li key={`${point}-${i}`} className="flex gap-3 text-sm text-text">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-text-muted">
            {i + 1}
          </span>
          <span className="leading-relaxed">{point}</span>
        </li>
      ))}
    </ol>
  );
}

function QaBody({ data }: { data: QaData }) {
  return (
    <div className="space-y-3">
      {!data.found && (
        <div className="flex gap-2.5 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          <FiAlertTriangle
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>The answer was not found in this document.</span>
        </div>
      )}
      <Markdown>{data.answer}</Markdown>
    </div>
  );
}

function PairTable({
  title,
  rows,
}: {
  title: string;
  rows: { value: string; context: string }[];
}) {
  if (!rows?.length) return null;
  return (
    <div>
      <Label>{title}</Label>
      <div className="mt-2 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Value</th>
              <th className="px-4 py-2 font-medium">Context</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, i) => (
              <tr key={`${row.value}-${i}`}>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium text-text">
                  {row.value}
                </td>
                <td className="px-4 py-2.5 text-text-muted">{row.context}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExtractedBody({ data }: { data: ExtractedData }) {
  const groups: [string, string[]][] = [
    ["People", data.people ?? []],
    ["Organizations", data.organizations ?? []],
    ["Locations", data.locations ?? []],
  ];
  const hasAny =
    groups.some(([, items]) => items.length > 0) ||
    data.dates?.length > 0 ||
    data.numbers?.length > 0 ||
    data.other?.length > 0;

  if (!hasAny) {
    return (
      <p className="text-sm text-text-muted">
        No matching data was found in the document for this request.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(([label, items]) =>
        items.length > 0 ? (
          <div key={label}>
            <Label>{label}</Label>
            <div className="mt-2">
              <Chips items={items} />
            </div>
          </div>
        ) : null,
      )}
      <PairTable title="Dates" rows={data.dates} />
      <PairTable title="Numbers" rows={data.numbers} />
      {data.other?.map((group, i) =>
        group.values.length > 0 ? (
          <div key={`${group.label}-${i}`}>
            <Label>{group.label}</Label>
            <div className="mt-2">
              <Chips items={group.values} />
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}

function SimplifyBody({ data }: { data: SimplifyData }) {
  return (
    <div className="space-y-5">
      <Markdown>{data.simplified}</Markdown>
      {data.glossary?.length > 0 && (
        <div>
          <Label>Glossary</Label>
          <dl className="mt-2 divide-y divide-border rounded-xl border border-border">
            {data.glossary.map((g, i) => (
              <div
                key={`${g.term}-${i}`}
                className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-3 sm:gap-4"
              >
                <dt className="font-medium text-text">{g.term}</dt>
                <dd className="text-text-muted sm:col-span-2">{g.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function TranslateBody({ data }: { data: TranslateData }) {
  return (
    <div className="space-y-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-ai-soft px-3 py-1 text-xs font-medium text-ai">
        <FiGlobe className="size-3.5" aria-hidden="true" />
        {data.language}
      </span>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text">
        {data.translation}
      </p>
    </div>
  );
}

function ActionItemsBody({ data }: { data: ActionItemsData }) {
  if (!data.items?.length) {
    return (
      <p className="text-sm text-text-muted">
        No action items were found in the document.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {data.items.map((item, i) => (
        <li
          key={`${item.task}-${i}`}
          className="rounded-xl border border-border p-4"
        >
          <p className="text-sm font-medium text-text">{item.task}</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-muted">
            <span>
              Responsible:{" "}
              <span className="text-text">
                {item.responsible ?? "Not stated"}
              </span>
            </span>
            <span>
              Deadline:{" "}
              <span className="text-text">{item.deadline ?? "Not stated"}</span>
            </span>
          </div>
          {item.notes && (
            <p className="mt-2 text-sm text-text-muted">{item.notes}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SectionBody({ section }: { section: TaskSection }) {
  if (section.error) {
    return (
      <div className="rounded-xl bg-error-soft px-4 py-3 text-sm text-error-text">
        {section.error}
      </div>
    );
  }
  if (!section.data) return null;

  switch (section.task) {
    case "SUMMARIZE":
      return <SummaryBody data={section.data as SummaryData} />;
    case "EXTRACT_KEY_POINTS":
      return <KeyPointsBody data={section.data as KeyPointsData} />;
    case "DOCUMENT_QA":
      return <QaBody data={section.data as QaData} />;
    case "EXTRACT_DATA":
      return <ExtractedBody data={section.data as ExtractedData} />;
    case "SIMPLIFY":
      return <SimplifyBody data={section.data as SimplifyData} />;
    case "TRANSLATE":
      return <TranslateBody data={section.data as TranslateData} />;
    case "EXTRACT_ACTION_ITEMS":
      return <ActionItemsBody data={section.data as ActionItemsData} />;
  }
}
