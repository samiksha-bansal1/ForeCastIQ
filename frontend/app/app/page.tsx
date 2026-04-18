"use client";

/**
 * app/app/page.tsx  (Forecast tab)
 * Wired to real API via DataContext. Shows live Prophet forecast data.
 */

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { AppTopbar } from "@/components/forecastiq/app-topbar";
import { StatCard } from "@/components/forecastiq/stat-card";
import { InsightCard } from "@/components/forecastiq/insight-card";
import { ForecastChart } from "@/components/forecastiq/charts/forecast-chart";
import { DataSummary } from "@/components/forecastiq/data-summary";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";

export default function ForecastPage() {
  const [periods, setPeriods] = useState(4);
  const {
    forecastResult,
    forecastLoading,
    forecastError,
    fetchForecast,
    isUsingDemo,
    csvData,
  } = useData();

  // Auto-run forecast on first visit so the chart is pre-populated
  useEffect(() => {
    if (!forecastResult && !forecastLoading) {
      fetchForecast(periods);
    }
  }, [periods]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = forecastResult?.summary;

  // Export CSV handler
  const handleExportCsv = () => {
    if (!forecastResult?.forecast) return;
    const headers = ["date", "yhat", "yhat_lower", "yhat_upper", "baseline"];
    const rows = forecastResult.forecast.map((pt) =>
      [pt.date, pt.yhat, pt.yhat_lower, pt.yhat_upper, pt.baseline].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forecast_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppTopbar
        title="Short-Term Forecast"
        onRunAnalysis={() => fetchForecast(periods)}
        onExportCsv={forecastResult ? handleExportCsv : undefined}
        isLoading={forecastLoading}
        dataLabel={`Data: ${csvData?.fileName ?? "demo_sales.csv"}`}
      />

      <div className="flex-1 p-6 lg:p-8 space-y-6">
        {/* Error banner */}
        {forecastError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <span className="text-red-600 text-lg">⚠</span>
            <div>
              <p className="text-sm font-medium text-red-700">Forecast failed</p>
              <p className="text-xs text-red-600 mt-0.5">{forecastError}</p>
            </div>
            <button
              onClick={() => fetchForecast(periods)}
              className="ml-auto text-xs text-red-600 underline hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Horizon selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Horizon:</span>
          {[1, 2, 3, 4, 5, 6].map((w) => (
            <button
              key={w}
              onClick={() => { setPeriods(w); fetchForecast(w); }}
              className={cn(
                "h-8 w-12 rounded-full text-sm border transition-colors",
                periods === w
                  ? "bg-foreground text-background border-foreground"
                  : "border-border hover:border-foreground/50"
              )}
            >
              {w}w
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <StatCard
            label="FORECAST TREND"
            value={
              summary
                ? `${summary.trend_pct >= 0 ? "+" : ""}${summary.trend_pct}%`
                : "—"
            }
            trend="upward over 4wks"
            trendDirection={
              summary ? (summary.trend_pct >= 0 ? "up" : "down") : "neutral"
            }
            isLoading={forecastLoading}
          />
          <StatCard
            label="CONFIDENCE RANGE"
            value={
              summary ? `±${summary.confidence_range.toLocaleString()}` : "—"
            }
            trend="p10–p90 band"
            trendDirection="neutral"
            isLoading={forecastLoading}
          />
          <StatCard
            label="PEAK WEEK"
            value={summary?.peak_week ?? "—"}
            trend="highest forecast point"
            trendDirection="neutral"
            isLoading={forecastLoading}
          />
          <StatCard
            label="VS BASELINE"
            value={
              summary
                ? `${summary.vs_baseline_pct >= 0 ? "+" : ""}${summary.vs_baseline_pct}%`
                : "—"
            }
            trend="above moving average"
            trendDirection={
              summary
                ? summary.vs_baseline_pct >= 0
                  ? "up"
                  : "down"
                : "neutral"
            }
            isLoading={forecastLoading}
          />
        </div>

        {/* Chart + insight */}
        <div className="grid lg:grid-cols-[65%_35%] gap-6">
          <ForecastChart
            isLoading={forecastLoading}
            isEmpty={!forecastResult && !forecastLoading}
            historical={forecastResult?.historical}
            forecast={forecastResult?.forecast}
            isDemo={isUsingDemo}
            periods={periods}
          />

          <div className="space-y-6">
            <InsightCard
              insight={
                forecastResult?.insight ??
                "Run an analysis to generate an AI insight."
              }
              isLoading={forecastLoading}
            />
            <DataSummary
              forecast={forecastResult?.forecast}
              isLoading={forecastLoading}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
