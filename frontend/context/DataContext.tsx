"use client";

/**
 * context/DataContext.tsx
 * Global state for ForecastIQ.
 * Stores uploaded CSV data + results from all three API calls.
 * Wrap the app layout with <DataProvider> so any page can read/write state.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

import {
  runForecast,
  runAnomalyDetection,
  runScenario,
  ForecastResponse,
  AnomalyResponse,
  ScenarioResponse,
  ForecastPoint,
  HistoryItem,
} from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CsvData {
  rows: Record<string, string>[];
  dateColumn: string;
  valueColumn: string;
  fileName: string;
}

interface DataContextValue {
  // Uploaded CSV data (null = using demo data)
  csvData: CsvData | null;
  setCsvData: (data: CsvData | null) => void;
  isUsingDemo: boolean;

  // Forecast
  forecastResult: ForecastResponse | null;
  forecastLoading: boolean;
  forecastError: string | null;
  fetchForecast: (periods?: number) => Promise<void>;

  // Anomaly
  anomalyResult: AnomalyResponse | null;
  anomalyLoading: boolean;
  anomalyError: string | null;
  fetchAnomalies: () => Promise<void>;

  // Scenario
  scenarioResult: ScenarioResponse | null;
  scenarioLoading: boolean;
  scenarioError: string | null;
  fetchScenario: (
    question: string,
    history: HistoryItem[]
  ) => Promise<ScenarioResponse | null>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [csvData, setCsvDataState] = useState<CsvData | null>(null);

  const [forecastResult, setForecastResult] = useState<ForecastResponse | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const [anomalyResult, setAnomalyResult] = useState<AnomalyResponse | null>(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [anomalyError, setAnomalyError] = useState<string | null>(null);

  const [scenarioResult, setScenarioResult] = useState<ScenarioResponse | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  const setCsvData = useCallback((data: CsvData | null) => {
    setCsvDataState(data);
    // Clear cached results when data source changes
    setForecastResult(null);
    setAnomalyResult(null);
    setScenarioResult(null);
  }, []);

  const fetchForecast = useCallback(async (periods: number = 4) => {
    setForecastLoading(true);
    setForecastError(null);
    try {
      const result = await runForecast(
        csvData
          ? {
              data: csvData.rows,
              dateColumn: csvData.dateColumn,
              valueColumn: csvData.valueColumn,
              periods,
            }
          : { useDemo: true, periods }
      );
      setForecastResult(result);
    } catch (err) {
      setForecastError(err instanceof Error ? err.message : "Forecast failed.");
    } finally {
      setForecastLoading(false);
    }
  }, [csvData]);

  const fetchAnomalies = useCallback(async () => {
    setAnomalyLoading(true);
    setAnomalyError(null);
    try {
      const result = await runAnomalyDetection(
        csvData
          ? {
              data: csvData.rows,
              dateColumn: csvData.dateColumn,
              valueColumn: csvData.valueColumn,
            }
          : { useDemo: true }
      );
      setAnomalyResult(result);
    } catch (err) {
      setAnomalyError(
        err instanceof Error ? err.message : "Anomaly detection failed."
      );
    } finally {
      setAnomalyLoading(false);
    }
  }, [csvData]);

  const fetchScenario = useCallback(
    async (
      question: string,
      history: HistoryItem[]
    ): Promise<ScenarioResponse | null> => {
      setScenarioLoading(true);
      setScenarioError(null);
      try {
        // Re-use cached forecast baseline if available
        const baselineForecast = forecastResult?.forecast as
          | ForecastPoint[]
          | undefined;

        const result = await runScenario(
          csvData
            ? {
                question,
                history,
                baselineForecast,
                data: csvData.rows,
                dateColumn: csvData.dateColumn,
                valueColumn: csvData.valueColumn,
              }
            : { question, history, baselineForecast, useDemo: true }
        );
        setScenarioResult(result);
        return result;
      } catch (err) {
        setScenarioError(
          err instanceof Error ? err.message : "Scenario analysis failed."
        );
        return null;
      } finally {
        setScenarioLoading(false);
      }
    },
    [csvData, forecastResult]
  );

  return (
    <DataContext.Provider
      value={{
        csvData,
        setCsvData,
        isUsingDemo: csvData === null,
        forecastResult,
        forecastLoading,
        forecastError,
        fetchForecast,
        anomalyResult,
        anomalyLoading,
        anomalyError,
        fetchAnomalies,
        scenarioResult,
        scenarioLoading,
        scenarioError,
        fetchScenario,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useData must be used inside <DataProvider>");
  }
  return ctx;
}
