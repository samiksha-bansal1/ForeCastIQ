"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  isLoading?: boolean;
}

export function StatCard({
  label,
  value,
  trend,
  trendDirection = "neutral",
  isLoading = false,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="h-3 w-24 bg-muted rounded animate-pulse mb-4" />
        <div className="h-8 w-20 bg-muted rounded animate-pulse mb-2" />
        <div className="h-3 w-28 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Label */}
      <span className="text-[11px] font-mono tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </span>

      {/* Value */}
      <p className="text-[32px] font-light mt-2 leading-none">{value}</p>

      {/* Trend */}
      {trend && (
        <div
          className={cn(
            "flex items-center gap-1 mt-2 text-xs",
            trendDirection === "up" && "text-green-600",
            trendDirection === "down" && "text-red-600",
            trendDirection === "neutral" && "text-muted-foreground"
          )}
        >
          {trendDirection === "up" && <TrendingUp className="w-3 h-3" />}
          {trendDirection === "down" && <TrendingDown className="w-3 h-3" />}
          {trend}
        </div>
      )}
    </div>
  );
}
