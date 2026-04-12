"use client";

/**
 * app/app/anomalies/page.tsx
 * Wired to real API via DataContext. Shows live z-score anomaly detection.
 */

import { useEffect } from "react";
import { AppTopbar } from "@/components/forecastiq/app-topbar";
import { StatCard } from "@/components/forecastiq/stat-card";
import { AnomalyChart } from "@/components/forecastiq/charts/anomaly-chart";
import { AnomalyCard } from "@/components/forecastiq/anomaly-card";
import { useData } from "@/context/DataContext";

export default function AnomaliesPage() {
  const {
    anomalyResult,
    anomalyLoading,
    anomalyError,
    fetchAnomalies,
    isUsingDemo,
    csvData,
  } = useData();

  // Auto-run on first visit
  useEffect(() => {
    if (!anomalyResult && !anomalyLoading) {
      fetchAnomalies();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = anomalyResult?.stats;

  return (
    <div className="flex flex-col min-h-screen">
      <AppTopbar
        title="Anomaly Detection"
        onRunAnalysis={fetchAnomalies}
        isLoading={anomalyLoading}
        dataLabel={csvData ? `Data: ${csvData.fileName}` : "Data: demo_sales.csv"}
      />

      <div className="flex-1 p-6 lg:p-8 space-y-6">
        {/* Error banner */}
        {anomalyError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <span className="text-red-600 text-lg">⚠</span>
            <div>
              <p className="text-sm font-medium text-red-700">
                Anomaly detection failed
              </p>
              <p className="text-xs text-red-600 mt-0.5">{anomalyError}</p>
            </div>
            <button
              onClick={fetchAnomalies}
              className="ml-auto text-xs text-red-600 underline hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 lg:gap-6">
          <StatCard
            label="ANOMALIES FOUND"
            value={stats ? stats.total.toString() : "—"}
            trend="in last 52 weeks"
            trendDirection="neutral"
            isLoading={anomalyLoading}
          />
          <StatCard
            label="HIGH SEVERITY"
            value={stats ? stats.high.toString() : "—"}
            trend="requires attention"
            trendDirection={stats && stats.high > 0 ? "down" : "neutral"}
            isLoading={anomalyLoading}
          />
          <StatCard
            label="MEDIUM SEVERITY"
            value={stats ? stats.medium.toString() : "—"}
            trend="monitor closely"
            trendDirection="neutral"
            isLoading={anomalyLoading}
          />
        </div>

        {/* Anomaly chart */}
        <AnomalyChart
          isLoading={anomalyLoading}
          isEmpty={!anomalyResult && !anomalyLoading}
          chartData={anomalyResult?.chart_data}
          isDemo={isUsingDemo}
        />

        {/* Anomaly cards */}
        {(anomalyResult?.anomalies?.length ?? 0) > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Detected Anomalies</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {anomalyResult!.anomalies.map((anomaly) => (
                <AnomalyCard
                  key={anomaly.date}
                  anomaly={anomaly}
                  isLoading={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* No anomalies found state */}
        {anomalyResult && anomalyResult.anomalies.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-2xl mb-2">✓</p>
            <p className="font-medium">No anomalies detected</p>
            <p className="text-sm text-muted-foreground mt-1">
              All data points are within ±2σ of the rolling mean.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
