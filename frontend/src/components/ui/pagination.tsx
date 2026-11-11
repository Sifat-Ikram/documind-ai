import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Button } from "./button";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between"
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <FiChevronLeft className="size-4" aria-hidden="true" />
        Previous
      </Button>
      <p className="text-sm text-text-muted">
        Page {page} of {totalPages}
      </p>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
        <FiChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}
