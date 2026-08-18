"use client";

import { useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MobileDrawer } from "@/components/mobile-drawer";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen]);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-950">
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar (visible on xl:) */}
        <Sidebar />

        {/* Mobile Drawer (visible on < xl when open) */}
        <MobileDrawer
          isOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar with Mobile Hamburger Toggle */}
          <Topbar
            isMobileOpen={isMobileOpen}
            onToggleMobile={() => setIsMobileOpen((prev) => !prev)}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
