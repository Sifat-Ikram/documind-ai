import { cn } from "@/lib/cn";

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className={cn(
        "size-4 shrink-0 cursor-pointer rounded accent-primary",
        className,
      )}
    />
  );
}
