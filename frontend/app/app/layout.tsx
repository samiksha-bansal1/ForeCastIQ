"use client";

/**
 * app/app/layout.tsx
 * Wraps all /app/* routes with:
 *   - DataProvider (global CSV + API result state)
 *   - AppSidebar (fixed left nav)
 *   - MobileNav (bottom nav for mobile)
 */

import { AppSidebar } from "@/components/forecastiq/app-sidebar";
import { MobileNav } from "@/components/forecastiq/mobile-nav";
import { DataProvider } from "@/context/DataContext";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider>
      <div className="flex min-h-screen bg-background">
        {/* Fixed left sidebar — hidden on mobile */}
        <AppSidebar />

        {/* Main content area — offset by sidebar width on desktop */}
        <main className="flex-1 min-h-screen lg:pb-0 pb-16">
          {children}
        </main>

        {/* Bottom nav — visible on mobile only */}
        <MobileNav />
      </div>
    </DataProvider>
  );
}
