"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { explainAnomaly, type AnomalyPoint } from "@/lib/api";

interface AnomalyCardProps {
  anomaly: AnomalyPoint;
  isLoading?: boolean;
}

export function AnomalyCard({ anomaly, isLoading = false }: AnomalyCardProps) {
  const [isExplaining, setIsExplaining] = useState(false);
  const [localAnomaly, setLocalAnomaly] = useState(anomaly);

  const handleExplain = async () => {
    setIsExplaining(true);
    try {
      const explanation = await explainAnomaly({
        date:         localAnomaly.date,
        value:        localAnomaly.value,
        deviation:    localAnomaly.deviation ?? 0,
        severity:     localAnomaly.severity,
        upperBand:    localAnomaly.upperBand,
        lowerBand:    localAnomaly.lowerBand,
        rollingMean:  null,
      });
      setLocalAnomaly((prev) => ({
        ...prev,
        cause:   explanation.cause,
        action:  explanation.action,
        urgency: explanation.urgency,
        aiEnriched: true,
      }));
    } catch (err) {
      console.error("Failed to explain anomaly:", err);
    } finally {
      setIsExplaining(false);
    }
  };

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

  const isHigh = localAnomaly.severity === "HIGH";
  const isPositiveDeviation = (localAnomaly.deviation ?? 0) > 0;
  const borderColor = isHigh ? "border-l-red-600" : "border-l-amber-600";
  const severityBadgeColor = isHigh
    ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";

  const urgencyConfig = {
    immediate: { label: "Act Now", color: "bg-red-100 text-red-700 border border-red-200" },
    "this week": { label: "This Week", color: "bg-amber-100 text-amber-700 border border-amber-200" },
    monitor: { label: "Monitor", color: "bg-gray-100 text-gray-600 border border-gray-200" },
  };
  const urgency = urgencyConfig[localAnomaly.urgency] ?? urgencyConfig.monitor;

  const formattedDate = new Date(localAnomaly.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const deviationText = localAnomaly.deviation == null
    ? "deviation unknown"
    : localAnomaly.deviation > 0
    ? `${localAnomaly.deviation}σ above mean`
    : `${Math.abs(localAnomaly.deviation)}σ below mean`;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border border-l-4 bg-card p-6 shadow-sm",
        borderColor
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{formattedDate}</span>
          {localAnomaly.aiEnriched && (
            <span className="text-[8px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
              AI
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[11px] font-medium px-2.5 py-1 rounded-full",
              severityBadgeColor
            )}
          >
            {localAnomaly.severity}
          </span>
          <span
            className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full",
              urgency.color
            )}
          >
            {urgency.label}
          </span>
        </div>
      </div>


      {/* Value row */}
      <p className="text-sm text-muted-foreground mb-1">
        <span className="font-mono">Value: {localAnomaly.value.toLocaleString()}</span>
        <span className="mx-2">·</span>
        <span className="font-mono">Deviation: {deviationText}</span>
      </p>

      {/* Normal Range row */}
      {localAnomaly.upperBand != null && localAnomaly.lowerBand != null && (
        <p className="text-xs text-muted-foreground font-mono mb-4">
          Normal range: {localAnomaly.lowerBand.toLocaleString()} – {localAnomaly.upperBand.toLocaleString()}
        </p>
      )}

      {/* AI Explain Button */}
      {!localAnomaly.aiEnriched && (
        <button
          type="button"
          onClick={handleExplain}
          disabled={isExplaining}
          className="text-[10px] text-blue-600 hover:text-blue-800 disabled:opacity-50 mb-3 flex items-center gap-1"
        >
          {isExplaining ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Explaining...
            </>
          ) : (
            "✨ Re-explain with AI"
          )}
        </button>
      )}

      {/* Divider */}
      <div className="h-px bg-border mb-4" />

      {/* Likely cause */}
      <div className="mb-4">
        <span className="text-[10px] font-mono tracking-[0.08em] text-muted-foreground uppercase block mb-1">
          Likely Cause
        </span>
        <p className="text-sm leading-relaxed">{localAnomaly.cause}</p>
      </div>

      {/* Recommended action */}
      <div>
        <span className="text-[10px] font-mono tracking-[0.08em] text-muted-foreground uppercase block mb-1">
          Recommended Action
        </span>
        <p className="text-sm leading-relaxed">{localAnomaly.action}</p>
      </div>
    </div>
  );
}
