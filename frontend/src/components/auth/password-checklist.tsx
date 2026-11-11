import { FiCheckCircle, FiCircle } from "react-icons/fi";
import { cn } from "@/lib/cn";

const RULES = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "Contains a letter", test: (v: string) => /[A-Za-z]/.test(v) },
  { label: "Contains a number", test: (v: string) => /\d/.test(v) },
];

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="space-y-1.5" aria-label="Password requirements">
      {RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-2 text-sm",
              ok ? "text-success" : "text-text-muted",
            )}
          >
            {ok ? (
              <FiCheckCircle className="size-4" aria-hidden="true" />
            ) : (
              <FiCircle className="size-4" aria-hidden="true" />
            )}
            <span>{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
