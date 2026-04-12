"use client";

import { useState, useCallback } from "react";
import { AppTopbar } from "@/components/forecastiq/app-topbar";
import { ScenarioChart } from "@/components/forecastiq/charts/scenario-chart";
import { ScenarioChat } from "@/components/forecastiq/scenario-chat";
import { useData } from "@/context/DataContext";
import type { HistoryItem } from "@/lib/api";

interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  delta?: number;
}

const SYSTEM_MESSAGE: Message = {
  id: "system-1",
  role: "system",
  content:
    'Hello! I can model any business scenario for you. Try asking: "What if I run a 20% marketing push for 2 weeks?" or "What happens if demand drops 15% in week 2?"',
};

export default function ScenarioPage() {
  // ✅ ALL hooks at top (CORRECT)
  const { fetchScenario, scenarioLoading, scenarioError, csvData } = useData();

  const [messages, setMessages] = useState<Message[]>([SYSTEM_MESSAGE]);
  const [scenarioData, setScenarioData] = useState<
    { week: string; baseline: number; scenario: number }[] | null
  >(null);
  const [totalDelta, setTotalDelta] = useState<number>(0);

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

      setMessages((prev) => [...prev, userMessage]);

      const history = buildHistory([...messages, userMessage]);

      // ✅ Call context (data handled internally)
      const result = await fetchScenario(query, history);

      if (result) {
        setScenarioData(result.scenario_data);
        setTotalDelta(result.delta);

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.summary,
          delta: result.delta,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            scenarioError ??
            "Sorry, I couldn't process that scenario. Please try again.",
        };

        setMessages((prev) => [...prev, errorMessage]);
      }
    },
    [messages, fetchScenario, buildHistory, scenarioError]
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* ✅ FIXED: dynamic dataset name */}
      <AppTopbar
        title="Scenario Analysis"
        dataLabel={`Data: ${csvData?.fileName ?? "demo_sales.csv"}`}
      />

      <div className="flex-1 p-6 lg:p-8 space-y-6">
        {/* Chart */}
        {scenarioData && (
          <ScenarioChart
            data={scenarioData}
            delta={totalDelta}
            isLoading={scenarioLoading}
          />
        )}

        {/* Chat */}
        <ScenarioChat
          onScenarioQuery={handleScenarioQuery}
          messages={messages}
          isLoading={scenarioLoading}
        />
      </div>
    </div>
  );
}