/**
 * lib/api.ts
 * All Axios calls to the Flask backend.
 * Never import a hardcoded URL — always use NEXT_PUBLIC_API_URL from .env.local
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HistoricalPoint {
  date: string;
  value: number | null;
  baseline: number;
}

export interface ForecastPoint {
  date: string;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
  baseline: number;
}

export interface ForecastSummary {
  trend_pct: number;
  peak_week: string;
  confidence_range: number;
  vs_baseline_pct: number;
}

export interface ForecastResponse {
  historical: HistoricalPoint[];
  forecast: ForecastPoint[];
  summary: ForecastSummary;
  insight: string;
}

export interface AnomalyPoint {
  date: string;
  value: number;
  severity: "HIGH" | "MEDIUM";
  deviation: number | null;
  cause: string;
  action: string;
  urgency: "immediate" | "this week" | "monitor";
  aiEnriched: boolean;
}

export interface AnomalyChartPoint {
  date: string;
  value: number;
  rollingMean: number | null;
  upperBand: number | null;
  lowerBand: number | null;
  isAnomaly: boolean;
  anomalySeverity: "HIGH" | "MEDIUM" | null;
  deviation: number | null;
}

export interface AnomalyStats {
  total: number;
  high: number;
  medium: number;
}

export interface AnomalyResponse {
  chart_data: AnomalyChartPoint[];
  anomalies: AnomalyPoint[];
  stats: AnomalyStats;
}

export interface ScenarioDataPoint {
  week: string;
  baseline: number;
  scenario: number;
}

export interface ScenarioResponse {
  scenario_data: ScenarioDataPoint[];
  summary: string;
  delta: number;
}

export interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface AdjustedPoint {
  date: string;
  original: number;
  cleaned: number;
  reason: string;
}

export interface CleanedForecastSummary {
  adjusted_count: number;
  method: string;
  message: string;
}

export interface CleanedForecastResponse {
  original_forecast: ForecastPoint[];
  cleaned_forecast: ForecastPoint[];
  adjusted_points: AdjustedPoint[];
  summary: CleanedForecastSummary;
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function post<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Request to ${path} failed (${res.status})`);
  }

  return json.data as T;
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * Run a 4-week Prophet forecast.
 * Pass useDemo=true to use the built-in demo dataset.
 */
export async function runForecast(params: {
  data?: Record<string, string>[];
  dateColumn?: string;
  valueColumn?: string;
  periods?: number;
  useDemo?: boolean;
}): Promise<ForecastResponse> {
  return post<ForecastResponse>("/api/forecast", {
    data: params.data ?? null,
    date_column: params.dateColumn ?? "date",
    value_column: params.valueColumn ?? "value",
    periods: params.periods ?? 4,
    use_demo: params.useDemo ?? false,
  });
}

/**
 * Detect anomalies using rolling z-score.
 */
export async function runAnomalyDetection(params: {
  data?: Record<string, string>[];
  dateColumn?: string;
  valueColumn?: string;
  useDemo?: boolean;
}): Promise<AnomalyResponse> {
  return post<AnomalyResponse>("/api/anomalies", {
    data: params.data ?? null,
    date_column: params.dateColumn ?? "date",
    value_column: params.valueColumn ?? "value",
    use_demo: params.useDemo ?? false,
  });
}

/**
 * Model a business scenario against the baseline forecast.
 */
export async function runScenario(params: {
  question: string;
  baselineForecast?: ForecastPoint[];
  history?: HistoryItem[];
  data?: Record<string, string>[];
  dateColumn?: string;
  valueColumn?: string;
  useDemo?: boolean;
}): Promise<ScenarioResponse> {
  return post<ScenarioResponse>("/api/scenario", {
    question: params.question,
    baseline_forecast: params.baselineForecast ?? null,
    history: params.history ?? [],
    data: params.data ?? null,
    date_column: params.dateColumn ?? "date",
    value_column: params.valueColumn ?? "value",
    use_demo: params.useDemo ?? false,
  });
}

/**
 * Run outlier-cleaned forecast comparison.
 */
export async function runCleanedForecast(params: {
  data?: Record<string, string>[];
  dateColumn?: string;
  valueColumn?: string;
  periods?: number;
  useDemo?: boolean;
}): Promise<CleanedForecastResponse> {
  return post<CleanedForecastResponse>("/api/forecast/compare-cleaned", {
    data: params.data ?? null,
    date_column: params.dateColumn ?? "date",
    value_column: params.valueColumn ?? "value",
    periods: params.periods ?? 4,
    use_demo: params.useDemo ?? false,
  });
}

/**
 * Check the backend health endpoint.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
