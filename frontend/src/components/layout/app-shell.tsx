"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SidebarContent } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    // below 1024px = drawer; if the window grows past it, close the drawer
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (media.matches) setDrawerOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    media.addEventListener("change", onChange);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onChange);
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-dvh bg-bg">
      {/* 1024px and above: fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
        <SidebarContent />
      </aside>

      {/* below 1024px: drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="overlay"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        )}
        {drawerOpen && (
          <motion.aside
            key="drawer"
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border bg-surface lg:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.2 }}
          >
            <SidebarContent
              onNavigate={() => setDrawerOpen(false)}
              onClose={() => setDrawerOpen(false)}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
