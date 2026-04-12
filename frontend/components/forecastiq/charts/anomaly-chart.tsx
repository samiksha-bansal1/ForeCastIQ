"use client";

/**
 * components/forecastiq/charts/anomaly-chart.tsx
 * Accepts real API chart_data as props.
 * Falls back to demo data when props are not provided.
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
  const rawData = chartData
    ? chartData.slice(-30)
    : demoDataWithStats.slice(-30);

  const formatted = rawData.map((pt: any) => ({
    ...pt,
    date: new Date(pt.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-medium">Anomaly Detection</h3>
        {isDemo && <span className="text-xs text-muted-foreground">Demo</span>}
      </div>

      {/* Chart */}
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" />
            <YAxis />

            <Tooltip />

            {/* Band */}
            <Area dataKey="upperBand" fill="#DBEAFE" stroke="none" />
            <Area dataKey="lowerBand" fill="#fff" stroke="none" />

            {/* Mean */}
            <Line dataKey="rollingMean" stroke="#94A3B8" dot={false} />

            {/* Actual with FIXED dot */}
            <Line
              dataKey="value"
              stroke="#000"
              strokeWidth={2}
              dot={(props) => {
                const { key, ...rest } = props;
                return <AnomalyDot key={key} {...rest} />;
              }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}