"use client";

/**
 * app/app/anomalies/page.tsx
 * Wired to real API via DataContext. Shows live z-score anomaly detection.
 */

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { X } from "lucide-react";
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
    cleanedForecastResult,
    cleanedForecastLoading,
    fetchCleanedForecast,
    isUsingDemo,
    csvData,
  } = useData();

  const [showCleanedForecast, setShowCleanedForecast] = useState(false);

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

        {/* See How Outliers Affect Forecast button - after anomaly detection */}
        <button
          onClick={() => { fetchCleanedForecast(); setShowCleanedForecast(true); }}
          disabled={cleanedForecastLoading || anomalyLoading}
          className="text-sm border border-border rounded-full px-4 py-2 hover:bg-muted transition-colors disabled:opacity-50"
        >
          See How Outliers Affect Forecast
        </button>

        {/* Cleaned forecast result card */}
        {cleanedForecastResult && showCleanedForecast && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium">How Outliers Affect Your Forecast</h3>
                <p className="text-sm text-muted-foreground">
                  {cleanedForecastResult.summary.message}
                </p>
              </div>
              <button
                onClick={() => setShowCleanedForecast(false)}
                className="p-1 hover:bg-muted rounded-md transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Adjusted points table */}
            {cleanedForecastResult.adjusted_points.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Date</th>
                      <th className="text-right py-2 font-medium">Original</th>
                      <th className="text-right py-2 font-medium">Cleaned</th>
                      <th className="text-left py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cleanedForecastResult.adjusted_points.map((pt, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2">{pt.date}</td>
                        <td className="text-right text-muted-foreground">{pt.original.toLocaleString()}</td>
                        <td className="text-right text-blue-600">{pt.cleaned.toLocaleString()}</td>
                        <td className="text-muted-foreground">{pt.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Comparison chart */}
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={cleanedForecastResult.original_forecast.map((orig, i) => ({
                    date: new Date(orig.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    original: orig.yhat,
                    cleaned: cleanedForecastResult.cleaned_forecast[i]?.yhat ?? orig.yhat,
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="original"
                    name="Original"
                    stroke="#6b7280"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cleaned"
                    name="Cleaned"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Conclusion */}
            {(() => {
              const origTotal = cleanedForecastResult.original_forecast.reduce((sum, p) => sum + p.yhat, 0);
              const cleanTotal = cleanedForecastResult.cleaned_forecast.reduce((sum, p) => sum + p.yhat, 0);
              return (
                <p className="text-sm font-medium">
                  {cleanTotal > origTotal
                    ? "⬆ Outliers were suppressing the true trend"
                    : "⬇ Outliers were inflating the trend"}
                </p>
              );
            })()}
          </div>
        )}

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
