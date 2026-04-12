"use client";

/**
 * components/forecastiq/data-summary.tsx
 * Accepts real forecast data as props.
 * Falls back to demo data when props are not provided.
 */

import { demoForecast } from "@/lib/demo-data";
import type { ForecastPoint } from "@/lib/api";

interface DataSummaryProps {
  forecast?: ForecastPoint[];
  isLoading?: boolean;
}

export function DataSummary({ forecast, isLoading = false }: DataSummaryProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="h-4 w-24 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Use real forecast if provided, otherwise fall back to demo
  const rows = forecast
    ? forecast.map((pt, i) => ({
        label:   `Week ${i + 1}`,
        low:     pt.yhat_lower,
        likely:  pt.yhat,
        high:    pt.yhat_upper,
      }))
    : demoForecast.map((pt, i) => ({
        label:  `Week ${i + 1}`,
        low:    pt.forecastLow ?? 0,
        likely: pt.forecast ?? 0,
        high:   pt.forecastHigh ?? 0,
      }));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h4 className="text-sm font-medium mb-4">Forecast Data</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-xs font-mono text-muted-foreground">Date</th>
              <th className="text-right py-2 text-xs font-mono text-muted-foreground">Low</th>
              <th className="text-right py-2 text-xs font-mono text-muted-foreground">Likely</th>
              <th className="text-right py-2 text-xs font-mono text-muted-foreground">High</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td className="py-2.5 font-mono text-xs">{row.label}</td>
                <td className="py-2.5 text-right font-mono text-xs">
                  {Math.round(row.low).toLocaleString()}
                </td>
                <td className="py-2.5 text-right font-mono text-xs font-medium">
                  {Math.round(row.likely).toLocaleString()}
                </td>
                <td className="py-2.5 text-right font-mono text-xs">
                  {Math.round(row.high).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
