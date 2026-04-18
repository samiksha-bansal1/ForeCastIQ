"use client";

import { useCallback, useEffect } from "react";
import { AppTopbar } from "@/components/forecastiq/app-topbar";
import { ScenarioChart } from "@/components/forecastiq/charts/scenario-chart";
import { ScenarioChat } from "@/components/forecastiq/scenario-chat";
import { useData } from "@/context/DataContext";
import type { HistoryItem, Message } from "@/lib/api";

export default function ScenarioPage() {
  // ✅ ALL hooks at top (CORRECT)
  const {
    fetchScenario,
    scenarioLoading,
    scenarioError,
    csvData,
    scenarioChatKey,
    scenarioMessages,
    setScenarioMessages,
    scenarioChartData,
    setScenarioChartData,
    scenarioTotalDelta,
    setScenarioTotalDelta,
    forecastResult,
    fetchForecast,
  } = useData();

  // Fetch baseline forecast on page load if not already loaded
  useEffect(() => {
    if (forecastResult === null) {
      fetchForecast();
    }
  }, [forecastResult, fetchForecast]);

  const buildHistory = useCallback(
    (currentMessages: Message[]): HistoryItem[] =>
      currentMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    []
  );

  const handleScenarioQuery = useCallback(
    async (query: string) => {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: query,
      };

      setScenarioMessages((prev) => [...prev, userMessage]);

      const history = buildHistory([...scenarioMessages, userMessage]);

      // ✅ Call context (data handled internally)
      const result = await fetchScenario(query, history);

      if (result) {
        setScenarioChartData(result.scenario_data);
        setScenarioTotalDelta(result.delta);

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.summary,
          delta: result.delta,
        };

        setScenarioMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            scenarioError ??
            "Sorry, I couldn't process that scenario. Please try again.",
        };

        setScenarioMessages((prev) => [...prev, errorMessage]);
      }
    },
    [scenarioMessages, fetchScenario, buildHistory, scenarioError, setScenarioMessages, setScenarioChartData, setScenarioTotalDelta]
  );

  return (
    <div key={scenarioChatKey} className="flex flex-col min-h-screen">
      {/* ✅ FIXED: dynamic dataset name */}
      <AppTopbar
        title="Scenario Analysis"
        dataLabel={`Data: ${csvData?.fileName ?? "demo_sales.csv"}`}
      />

      <div className="flex-1 p-6 lg:p-8 space-y-6">
        {/* Chart - show scenario if available, else show baseline */}
        {scenarioChartData && (
          <ScenarioChart
            data={scenarioChartData}
            delta={scenarioTotalDelta}
            isLoading={scenarioLoading}
          />
        )}
        {!scenarioChartData && forecastResult && (
          <ScenarioChart
            data={forecastResult.forecast.map((pt, i) => ({
              week: `Week ${i + 1}`,
              baseline: pt.yhat,
              scenario: pt.yhat,
            }))}
            delta={0}
            isLoading={scenarioLoading}
            label="Baseline (no scenario applied yet)"
          />
        )}

        {/* Chat */}
        <ScenarioChat
          onScenarioQuery={handleScenarioQuery}
          messages={scenarioMessages}
          isLoading={scenarioLoading}
        />
      </div>
    </div>
  );
}
