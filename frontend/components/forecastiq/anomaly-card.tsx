"use client";

import { cn } from "@/lib/utils";
import type { AnomalyPoint } from "@/lib/api";

interface AnomalyCardProps {
  anomaly: AnomalyPoint;
  isLoading?: boolean;
}

export function AnomalyCard({ anomaly, isLoading = false }: AnomalyCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="h-4 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="h-px bg-border mb-4" />
        <div className="space-y-3">
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          <div className="h-12 bg-muted rounded animate-pulse" />
          <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          <div className="h-12 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const isHigh = anomaly.severity === "HIGH";
  const borderColor = isHigh ? "border-l-red-600" : "border-l-amber-600";
  const badgeColor = isHigh
    ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";

  const formattedDate = new Date(anomaly.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const deviationText =
    anomaly.deviation > 0
      ? `${anomaly.deviation}σ above mean`
      : `${Math.abs(anomaly.deviation)}σ below mean`;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border border-l-4 bg-card p-6 shadow-sm",
        borderColor
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">{formattedDate}</span>
        <span
          className={cn(
            "text-[11px] font-medium px-2.5 py-1 rounded-full",
            badgeColor
          )}
        >
          {anomaly.severity}
        </span>
      </div>

      {/* Value row */}
      <p className="text-sm text-muted-foreground mb-4">
        <span className="font-mono">Value: {anomaly.value.toLocaleString()}</span>
        <span className="mx-2">·</span>
        <span className="font-mono">Deviation: {deviationText}</span>
      </p>

      {/* Divider */}
      <div className="h-px bg-border mb-4" />

      {/* Likely cause */}
      <div className="mb-4">
        <span className="text-[10px] font-mono tracking-[0.08em] text-muted-foreground uppercase block mb-1">
          Likely Cause
        </span>
        <p className="text-sm leading-relaxed">{anomaly.cause}</p>
      </div>

      {/* Recommended action */}
      <div>
        <span className="text-[10px] font-mono tracking-[0.08em] text-muted-foreground uppercase block mb-1">
          Recommended Action
        </span>
        <p className="text-sm leading-relaxed">{anomaly.action}</p>
      </div>
    </div>
  );
}
