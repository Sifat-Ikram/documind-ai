"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, retry } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "error") {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-4 text-center">
        <div>
          <p className="text-sm text-text-muted">
            Could not reach the server. Your session is still saved.
          </p>
          <Button variant="secondary" className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <Spinner className="size-6 text-text-muted" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
