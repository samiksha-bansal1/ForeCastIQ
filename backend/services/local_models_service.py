"""
services/local_models_service.py

Local forecasting candidates — no external API needed.
Selected automatically by holdout MAE alongside Prophet.

Models:
  1. Naive              — last observed value repeated
  2. Seasonal Naive     — same week last season (period=52)
  3. Moving Average     — rolling 4-week mean
  4. Holt               — double exponential smoothing (trend)
  5. Holt-Winters-style — additive trend + seasonal smoothing
"""

import logging
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

HOLDOUT_WEEKS = 4
MIN_ROWS      = 8


# ── Public API ────────────────────────────────────────────────────────────────

def run_local_forecast(df: pd.DataFrame, periods: int = 4) -> dict[str, Any]:
    """
    Select best local model via holdout MAE and return a forecast.

    Returns:
        forecast     — list of {date, yhat, yhat_lower, yhat_upper}
        model_name   — winning model name
        holdout_mae  — MAE on the holdout window
        all_mae      — {model_name: mae} for transparency panel
    """
    df = _prepare(df)
    n  = len(df)

    if n < MIN_ROWS:
        raise ValueError(f"Need at least {MIN_ROWS} rows, got {n}.")

    train  = df.iloc[:-HOLDOUT_WEEKS].copy()
    hold   = df.iloc[-HOLDOUT_WEEKS:].copy()
    y_hold = hold["y"].values

    candidates = _build_candidates(train, HOLDOUT_WEEKS)
    mae_scores: dict[str, float] = {}
    for name, pred in candidates.items():
        mae_scores[name] = _mae(y_hold, pred)

    best_name = min(mae_scores, key=lambda k: mae_scores[k])
    best_mae  = mae_scores[best_name]
    logger.info("Selected local model: %s (MAE=%.2f)", best_name, best_mae)

    yhats = _forecast_model(best_name, df, periods)
    band  = best_mae * 1.5

    last_date = pd.Timestamp(df["ds"].max())
    forecast  = []
    for i, yhat in enumerate(yhats):
        date = last_date + pd.Timedelta(weeks=i + 1)
        forecast.append({
            "date":       date.strftime("%Y-%m-%d"),
            "yhat":       round(max(0.0, float(yhat)), 2),
            "yhat_lower": round(max(0.0, float(yhat) - band), 2),
            "yhat_upper": round(max(0.0, float(yhat) + band), 2),
        })

    return {
        "forecast":    forecast,
        "model_name":  best_name,
        "holdout_mae": round(best_mae, 2),
        "all_mae":     {k: round(v, 2) for k, v in mae_scores.items()},
    }


# ── Candidate model builders ──────────────────────────────────────────────────

def _build_candidates(train: pd.DataFrame, steps: int) -> dict[str, np.ndarray]:
    y = train["y"].values
    return {
        "Naive":          _naive(y, steps),
        "Seasonal Naive": _seasonal_naive(y, steps),
        "Moving Average": _moving_average(y, steps),
        "Holt":           _holt(y, steps),
        "Holt-Winters":   _holt_winters(y, steps),
    }


def _naive(y: np.ndarray, steps: int) -> np.ndarray:
    return np.full(steps, y[-1])


def _seasonal_naive(y: np.ndarray, steps: int) -> np.ndarray:
    season = 52
    preds  = []
    for i in range(steps):
        idx = len(y) - season + i
        preds.append(float(y[idx]) if idx >= 0 else float(y[i % len(y)]))
    return np.array(preds)


def _moving_average(y: np.ndarray, steps: int) -> np.ndarray:
    window = min(4, len(y))
    avg    = float(np.mean(y[-window:]))
    return np.full(steps, avg)


def _holt(y: np.ndarray, steps: int) -> np.ndarray:
    alpha, beta = 0.3, 0.1
    n = len(y)
    l = float(y[0])
    b = float(y[1] - y[0]) if n > 1 else 0.0
    for t in range(1, n):
        l_prev, b_prev = l, b
        l = alpha * float(y[t]) + (1 - alpha) * (l_prev + b_prev)
        b = beta  * (l - l_prev) + (1 - beta) * b_prev
    return np.array([l + (h + 1) * b for h in range(steps)])


def _holt_winters(y: np.ndarray, steps: int) -> np.ndarray:
    period = 52
    n      = len(y)
    if n < period * 2:
        return _holt(y, steps)

    alpha, beta, gamma = 0.2, 0.05, 0.1
    n_seasons   = n // period
    season_avgs = np.array([np.mean(y[i * period:(i + 1) * period]) for i in range(n_seasons)])
    grand_avg   = float(np.mean(season_avgs))

    s = np.zeros(period)
    for j in range(period):
        vals = [float(y[k * period + j]) - float(season_avgs[k])
                for k in range(n_seasons) if k * period + j < n]
        s[j] = float(np.mean(vals)) if vals else 0.0

    l, b = grand_avg, 0.0
    for t in range(n):
        l_prev, b_prev = l, b
        s_t = s[t % period]
        y_t = float(y[t])
        l = alpha * (y_t - s_t) + (1 - alpha) * (l_prev + b_prev)
        b = beta  * (l - l_prev) + (1 - beta) * b_prev
        s[t % period] = gamma * (y_t - l_prev - b_prev) + (1 - gamma) * s_t

    preds = []
    for h in range(steps):
        preds.append(l + (h + 1) * b + s[(n + h) % period])
    return np.array(preds)


# ── Refit on full data ────────────────────────────────────────────────────────

def _forecast_model(name: str, df: pd.DataFrame, steps: int) -> np.ndarray:
    y = df["y"].values
    dispatch = {
        "Naive":          _naive,
        "Seasonal Naive": _seasonal_naive,
        "Moving Average": _moving_average,
        "Holt":           _holt,
        "Holt-Winters":   _holt_winters,
    }
    if name not in dispatch:
        raise ValueError(f"Unknown model: {name}")
    return dispatch[name](y, steps)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    return float(np.mean(np.abs(actual - predicted[:len(actual)])))


def _prepare(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["ds"] = pd.to_datetime(df["ds"])
    df["y"]  = pd.to_numeric(df["y"], errors="coerce")
    df = df.dropna(subset=["ds", "y"])
    df = df[df["y"] >= 0]
    df = df.drop_duplicates(subset="ds", keep="last")
    df = df.sort_values("ds").reset_index(drop=True)
    return df