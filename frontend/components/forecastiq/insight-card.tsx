"use client";

import { Sparkles } from "lucide-react";

interface InsightCardProps {
  insight: string;
  isLoading?: boolean;
}

export function InsightCard({ insight, isLoading = false }: InsightCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 bg-muted rounded animate-pulse" />
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse w-full" />
          <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
          <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-foreground" />
        <span className="text-[11px] font-mono tracking-[0.08em] text-muted-foreground uppercase">
          AI Insight
        </span>
      </div>

      {/* Insight text */}
      <p className="text-base leading-relaxed text-foreground">{insight}</p>
    </div>
  );
}
