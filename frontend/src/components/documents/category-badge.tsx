import {
  FiBarChart2,
  FiBookOpen,
  FiBriefcase,
  FiDollarSign,
  FiEdit3,
  FiFile,
  FiMail,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import { getCategoryIconName } from "@/lib/category-icons";
import { cn } from "@/lib/cn";
import type { Category } from "@/types/api";

export function CategoryBadge({
  category,
  className,
}: {
  category: Pick<Category, "name" | "icon">;
  className?: string;
}) {
  const iconName = getCategoryIconName(category.icon);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-muted",
        className,
      )}
    >
      {iconName === "FiEdit3" && (
        <FiEdit3 className="size-3" aria-hidden="true" />
      )}
      {iconName === "FiBarChart2" && (
        <FiBarChart2 className="size-3" aria-hidden="true" />
      )}
      {iconName === "FiDollarSign" && (
        <FiDollarSign className="size-3" aria-hidden="true" />
      )}
      {iconName === "FiUser" && (
        <FiUser className="size-3" aria-hidden="true" />
      )}
      {iconName === "FiMail" && (
        <FiMail className="size-3" aria-hidden="true" />
      )}
      {iconName === "FiUsers" && (
        <FiUsers className="size-3" aria-hidden="true" />
      )}
      {iconName === "FiBriefcase" && (
        <FiBriefcase className="size-3" aria-hidden="true" />
      )}
      {iconName === "FiBookOpen" && (
        <FiBookOpen className="size-3" aria-hidden="true" />
      )}
      {iconName === "FiFile" && (
        <FiFile className="size-3" aria-hidden="true" />
      )}

      {category.name}
    </span>
  );
}
