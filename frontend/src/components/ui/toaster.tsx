"use client";

import { Toaster } from "sonner";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
} from "react-icons/fi";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      theme="system"
      icons={{
        success: <FiCheckCircle className="size-5 text-success" />,
        error: <FiAlertCircle className="size-5 text-error" />,
        warning: <FiAlertTriangle className="size-5 text-warning" />,
        info: <FiInfo className="size-5 text-text-muted" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-md border border-border bg-surface-raised p-4 text-sm text-text shadow-lg",
          title: "font-medium",
          description: "mt-0.5 text-text-muted",
          actionButton:
            "ml-auto shrink-0 rounded-lg border border-border-strong px-3 py-1 text-sm font-medium text-text hover:bg-surface-muted",
        },
      }}
    />
  );
}
