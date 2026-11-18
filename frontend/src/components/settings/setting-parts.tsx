import type { ReactNode } from "react";

export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 border-t border-gray-400 pt-4 sm:pt-6 pb-10 sm:pb-14"
    >
      <h2 className="text-[15px] font-semibold text-text">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm text-text-muted">{description}</p>
      )}
      <div className="mt-4 divide-y divide-border">{children}</div>
    </section>
  );
}

export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 sm:max-w-md">
        <p className="text-sm font-medium text-text">{label}</p>
        {description && (
          <p className="mt-0.5 text-sm text-text-muted">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
