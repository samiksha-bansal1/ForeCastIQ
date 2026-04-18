"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, Search, MessageSquare, Upload } from "lucide-react";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";

const analysisNav = [
  { href: "/app", icon: TrendingUp, label: "Forecast" },
  { href: "/app/anomalies", icon: Search, label: "Anomalies" },
  { href: "/app/scenario", icon: MessageSquare, label: "Scenario" },
];

const dataNav = [
  { href: "/app/upload", icon: Upload, label: "Upload CSV" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isUsingDemo, csvData } = useData();

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/" className="text-lg font-semibold">
          ForecastIQ<sup className="text-[10px] ml-0.5">™</sup>
        </Link>
        <span className="ml-2 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          v1.0
        </span>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 p-4 space-y-6">
        {/* Analysis section */}
        <div>
          <span className="text-[10px] font-mono tracking-[0.08em] text-muted-foreground uppercase px-3 mb-2 block">
            Analysis
          </span>
          <div className="space-y-1">
            {analysisNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Data section */}
        <div>
          <span className="text-[10px] font-mono tracking-[0.08em] text-muted-foreground uppercase px-3 mb-2 block">
            Data
          </span>
          <div className="space-y-1">
            {dataNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-1">
          {isUsingDemo
            ? "Demo mode — using demo_sales.csv"
            : `Using: ${csvData?.fileName}`}
        </p>
        <Link
          href="/app/upload"
          className="text-xs text-foreground hover:underline"
        >
          Upload your own →
        </Link>
      </div>
    </aside>
  );
}
