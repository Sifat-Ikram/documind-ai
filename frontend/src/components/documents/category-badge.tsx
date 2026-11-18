import { categoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/cn";
import type { Category } from "@/types/api";

export function CategoryBadge({
  category,
  className,
}: {
  category: Pick<Category, "name" | "icon">;
  className?: string;
}) {
  const Icon = categoryIcon(category.icon);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-muted",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {category.name}
    </span>
  );
}
