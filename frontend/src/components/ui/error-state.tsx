import { FiAlertCircle } from "react-icons/fi";
import { errorMessage } from "@/lib/api";
import { Button } from "./button";

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-4 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-error-soft text-error">
        <FiAlertCircle className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-text">
        Could not load this
      </h3>
      <p className="mt-1 max-w-sm text-sm text-text-muted">
        {errorMessage(error)}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
