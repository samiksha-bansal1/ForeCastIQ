"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface ScenarioData {
  week: string;
  baseline: number;
  scenario: number;
}

interface ScenarioChartProps {
  data: ScenarioData[];
  delta?: number;
  isLoading?: boolean;
  label?: string;
}

export function ScenarioChart({
  data,
  delta,
  isLoading = false,
  label,
}: ScenarioChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-5 w-40 bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-56 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-[300px] bg-muted rounded animate-pulse" />
      </div>
    );
  }

  const isPositive = (delta ?? 0) >= 0;
  const displayDelta = delta ?? data.reduce((sum, d) => sum + (d.scenario - d.baseline), 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">
            {label ? label : "Scenario Comparison"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Baseline forecast vs scenario projection — 4 weeks
          </p>
        </div>
      </div>

      {/* Delta headline */}
      <div className="mb-6">
        <span
          className={`text-2xl font-light ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}
        >
          Scenario projects {isPositive ? "+" : ""}
          {displayDelta.toLocaleString()} units vs baseline
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#94A3B8] rounded-sm" />
          <span className="text-muted-foreground">Baseline</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-foreground rounded-sm" />
          <span className="text-muted-foreground">Scenario</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E5E0"
              vertical={false}
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "#6B6B6B" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E5E0" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6B6B6B" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E5E0",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name.charAt(0).toUpperCase() + name.slice(1),
              ]}
            />
            <Bar
              dataKey="baseline"
              fill="#94A3B8"
              radius={[4, 4, 0, 0]}
              barSize={40}
            />
            <Bar
              dataKey="scenario"
              fill="#0A0A0A"
              radius={[4, 4, 0, 0]}
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Comparison Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                Week
              </th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">
                Baseline
              </th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">
                Scenario
              </th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">
                Difference
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const diff = row.scenario - row.baseline;
              return (
                <tr key={row.week} className="border-b border-border/50">
                  <td className="py-2 px-2">{row.week}</td>
                  <td className="py-2 px-2 text-right font-mono">
                    {row.baseline.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-right font-mono">
                    {row.scenario.toLocaleString()}
                  </td>
                  <td
                    className={cn(
                      "py-2 px-2 text-right font-mono font-medium",
                      diff >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {diff >= 0 ? "+" : ""}
                    {diff.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-medium">
              <td className="py-2 px-2">Total</td>
              <td className="py-2 px-2 text-right font-mono">
                {data
                  .reduce((s, r) => s + r.baseline, 0)
                  .toLocaleString()}
              </td>
              <td className="py-2 px-2 text-right font-mono">
                {data
                  .reduce((s, r) => s + r.scenario, 0)
                  .toLocaleString()}
              </td>
              <td
                className={cn(
                  "py-2 px-2 text-right font-mono font-medium",
                  (delta ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {(delta ?? 0) >= 0 ? "+" : ""}
                {(delta ?? 0).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
