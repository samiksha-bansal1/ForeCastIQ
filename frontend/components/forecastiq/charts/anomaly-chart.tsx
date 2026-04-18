"use client";

/**
 * components/forecastiq/charts/anomaly-chart.tsx
 * Accepts real API chart_data as props.
 * Falls back to demo data when props are not provided.
 */

import { useState, useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { demoDataWithStats } from "@/lib/demo-data";
import type { AnomalyChartPoint } from "@/lib/api";

interface AnomalyChartProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  chartData?: AnomalyChartPoint[];
  isDemo?: boolean;
}

// Custom dot renderer — only renders for anomaly points
const AnomalyDot = (props: {
  cx?: number;
  cy?: number;
  payload?: AnomalyChartPoint;
}) => {
  const { cx, cy, payload } = props;
  if (!payload?.isAnomaly || cx == null || cy == null) return null;

  const color = payload.anomalySeverity === "HIGH" ? "#DC2626" : "#D97706";
  const r = payload.anomalySeverity === "HIGH" ? 8 : 6;

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="#fff" strokeWidth={2} />
    </g>
  );
};

export function AnomalyChart({
  isLoading = false,
  isEmpty = false,
  chartData,
  isDemo = true,
}: AnomalyChartProps) {
  const [windowSize, setWindowSize] = useState<number | "all">(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  const fullChartWidth = useMemo(
    () => `calc(${Math.max(0, zoomScale) * 100}%)`,
    [zoomScale]
  );

  const zoomIn = () => setZoomScale((value) => Math.min(2.5, value + 0.25));
  const zoomOut = () => setZoomScale((value) => Math.max(0, value - 0.25));

  // ── Loading ─────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="h-[350px] bg-muted rounded animate-pulse" />
      </div>
    );
  }

  // ── Empty ───────────────────────────────────
  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6">
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          Run anomaly detection to see results
        </div>
      </div>
    );
  }

  // ── Data ────────────────────────────────────
  const sourceData = chartData ?? demoDataWithStats;
  const totalPoints = sourceData.length;
  const displayCount = windowSize === "all" ? totalPoints : Math.min(windowSize, totalPoints);
  const rawData = windowSize === "all"
    ? sourceData
    : sourceData.slice(-windowSize);

  const formatted = rawData.map((pt: any) => ({
    ...pt,
    date: new Date(pt.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  const renderBaseChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="anomalyBandFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#DBEAFE" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#DBEAFE" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
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
        {/* Band */}
        <Area type="monotone" dataKey="upperBand" stroke="none" fill="url(#anomalyBandFill)" fillOpacity={1} legendType="none" isAnimationActive={false} />
        <Area type="monotone" dataKey="lowerBand" stroke="none" fill="white" fillOpacity={1} legendType="none" isAnimationActive={false} stackId="band" />
        {/* Mean */}
        <Line type="monotone" dataKey="rollingMean" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
        {/* Actual with anomaly dots */}
        <Line
          type="monotone"
          dataKey="value"
          stroke="#0A0A0A"
          strokeWidth={2}
          dot={(props) => {
            const { key, ...rest } = props;
            return <AnomalyDot key={key} {...rest} />;
          }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const chartPanel = (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
        <div>
          <h3 className="text-lg font-medium">Anomaly Detection</h3>
          <p className="text-sm text-muted-foreground">
            Rolling z-score with ±2σ threshold bands
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Showing {displayCount} of {totalPoints} weeks
          </span>
          <div className="flex gap-1">
            {([30, 52, "all"] as const).map((w) => (
              <button
                key={w}
                onClick={() => setWindowSize(w)}
                className={cn(
                  "text-xs px-2 py-1 rounded border transition-colors",
                  windowSize === w
                    ? "bg-foreground text-background border-foreground"
                    : "border-border hover:border-foreground/50"
                )}
              >
                {w === "all" ? "All" : `Last ${w}W`}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground transition hover:bg-muted/80"
            title="Expand chart"
          >
            ⛶
          </button>
          {isDemo && (
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded-full">
              Demo data
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-foreground" />
          <span className="text-muted-foreground">Actual</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-[#94A3B8]" />
          <span className="text-muted-foreground">Rolling Mean</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#DBEAFE] rounded-sm" />
          <span className="text-muted-foreground">±2σ Band</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-600 rounded-full" />
          <span className="text-muted-foreground">High Anomaly</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-600 rounded-full" />
          <span className="text-muted-foreground">Medium Anomaly</span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[300px]">
        {renderBaseChart()}
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6">
        <div className="relative w-full max-w-[1700px] h-[90vh] rounded-3xl bg-card p-6 shadow-2xl flex flex-col">
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute right-4 top-4 text-2xl text-foreground hover:text-muted-foreground transition"
            title="Close"
          >
            ✕
          </button>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-medium">Anomaly Explorer</h3>
              <p className="text-sm text-muted-foreground">
                Expanded view with scroll + zoom controls
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Week window buttons */}
              <div className="flex gap-1">
                {([30, 52, "all"] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setWindowSize(w)}
                    className={cn(
                      "text-xs px-2 py-1 rounded border transition-colors",
                      windowSize === w
                        ? "bg-foreground text-background border-foreground"
                        : "border-border hover:border-foreground/50"
                    )}
                  >
                    {w === "all" ? "All" : `Last ${w}W`}
                  </button>
                ))}
              </div>
              {/* Zoom controls */}
              <button
                type="button"
                onClick={zoomOut}
                className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground transition hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={zoomScale <= 0.0}
              >
                −
              </button>
              <button
                type="button"
                onClick={zoomIn}
                className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground transition hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={zoomScale >= 2.5}
              >
                +
              </button>
              <span className="text-sm text-muted-foreground">Zoom: {Math.round(zoomScale * 100)}%</span>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto rounded-2xl border border-border bg-background p-3">
            <div style={{ width: fullChartWidth, height: "100%", minHeight: 500 }}>
              {renderBaseChart()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return chartPanel;
}