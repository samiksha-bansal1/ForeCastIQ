"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, Search, MessageSquare, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", icon: TrendingUp, label: "Forecast" },
  { href: "/app/anomalies", icon: Search, label: "Anomalies" },
  { href: "/app/scenario", icon: MessageSquare, label: "Scenario" },
  { href: "/app/upload", icon: Upload, label: "Upload" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
