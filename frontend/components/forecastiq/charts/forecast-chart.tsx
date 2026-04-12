"use client";

/**
 * components/forecastiq/charts/forecast-chart.tsx
 * Accepts real API data as props. Falls back to demo data when props
 * are not provided so the chart still looks good out of the box.
 */

import {
  Area,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { demoChartData } from "@/lib/demo-data";
import type { HistoricalPoint, ForecastPoint } from "@/lib/api";

interface ForecastChartProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  historical?: HistoricalPoint[];
  forecast?: ForecastPoint[];
  isDemo?: boolean;
}

export function ForecastChart({
  isLoading = false,
  isEmpty = false,
  historical,
  forecast,
  isDemo = true,
}: ForecastChartProps) {
  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-5 w-32 bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-56 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-[300px] bg-muted rounded animate-pulse" />
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6">
        <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
          <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p className="text-sm">Run an analysis to see results here</p>
        </div>
      </div>
    );
  }

  // ── Build chart data ────────────────────────────────────────────────────────
  // Use real API data if provided, otherwise fall back to demo data
  let chartData: {
    date: string;
    actual?: number | null;
    forecast?: number | null;
    forecastLow?: number | null;
    forecastHigh?: number | null;
    baseline?: number | null;
  }[];

  if (historical && forecast) {
    // Map real API response to chart shape
    const histPoints = historical.map((pt) => ({
      date: new Date(pt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      actual: pt.value,
      forecast: undefined,
      forecastLow: undefined,
      forecastHigh: undefined,
      baseline: pt.baseline,
    }));

    const forePoints = forecast.map((pt) => ({
      date: new Date(pt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      actual: undefined,
      forecast: pt.yhat,
      forecastLow: pt.yhat_lower,
      forecastHigh: pt.yhat_upper,
      baseline: pt.baseline,
    }));

    chartData = [...histPoints, ...forePoints];
  } else {
    // Demo data fallback
    chartData = demoChartData.map((point) => ({
      date: new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      actual: point.type === "historical" ? point.value : undefined,
      forecast: point.type === "forecast" ? point.forecast : undefined,
      forecastLow: point.type === "forecast" ? point.forecastLow : undefined,
      forecastHigh: point.type === "forecast" ? point.forecastHigh : undefined,
      baseline: point.baseline,
    }));
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium">4-Week Forecast</h3>
          <p className="text-sm text-muted-foreground">
            Historical actuals + Prophet forecast with confidence bands
          </p>
        </div>
        {isDemo && (
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded-full">
            Demo data
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-foreground" />
          <span className="text-muted-foreground">Actual</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-[#2563EB]" />
          <span className="text-muted-foreground">Forecast</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#DBEAFE] rounded-sm" />
          <span className="text-muted-foreground">Band</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-[#94A3B8]" />
          <span className="text-muted-foreground">Baseline</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#6B6B6B" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E5E0" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6B6B6B" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E5E0",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                value?.toLocaleString() ?? "—",
                name.charAt(0).toUpperCase() + name.slice(1),
              ]}
            />
            {/* Confidence band */}
            
            <Area type="monotone" dataKey="forecastHigh" stroke="none" fill="#DBEAFE" fillOpacity={0.5} legendType="none" isAnimationActive={false} />
            <Area type="monotone" dataKey="forecastLow"  stroke="none" fill="#FFFFFF"  fillOpacity={1}   legendType="none" isAnimationActive={false} />
            {/* <Area type="monotone" dataKey="forecastHigh" stroke="none" fill="#DBEAFE" fillOpacity={0.5} />
            <Area type="monotone" dataKey="forecastLow"  stroke="none" fill="#FFFFFF"  fillOpacity={1}   /> */}
            {/* Baseline */}
            <Line type="monotone" dataKey="baseline" stroke="#94A3B8" strokeWidth={1.5}
              strokeDasharray="3 3" dot={false} />
            {/* Actuals */}
            <Line type="monotone" dataKey="actual" stroke="#0A0A0A" strokeWidth={2}
              dot={{ r: 3, fill: "#0A0A0A" }} connectNulls={false} />
            {/* Forecast */}
            <Line type="monotone" dataKey="forecast" stroke="#2563EB" strokeWidth={2}
              strokeDasharray="6 3" dot={{ r: 3, fill: "#2563EB" }} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
