"use client";

/**
 * app/app/page.tsx  (Forecast tab)
 * Wired to real API via DataContext. Shows live Prophet forecast data.
 */

import { useEffect } from "react";
import { AppTopbar } from "@/components/forecastiq/app-topbar";
import { StatCard } from "@/components/forecastiq/stat-card";
import { InsightCard } from "@/components/forecastiq/insight-card";
import { ForecastChart } from "@/components/forecastiq/charts/forecast-chart";
import { DataSummary } from "@/components/forecastiq/data-summary";
import { useData } from "@/context/DataContext";

export default function ForecastPage() {
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
      fetchForecast();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = forecastResult?.summary;

  return (
    <div className="flex flex-col min-h-screen">
      <AppTopbar
        title="Short-Term Forecast"
        onRunAnalysis={fetchForecast}
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
              onClick={fetchForecast}
              className="ml-auto text-xs text-red-600 underline hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}

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
