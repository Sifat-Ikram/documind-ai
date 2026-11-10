import type { ReactNode } from "react";
import type { IconType } from "react-icons";

interface EmptyStateProps {
  icon: IconType;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-text-muted">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-text">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
