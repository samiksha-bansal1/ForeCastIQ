"""
services/outlier_service.py

Outlier-aware cleaned forecast comparison.

Algorithm:
  1. Compute rolling median and MAD over a sliding window
  2. Flag points whose deviation > threshold * MAD as outliers
  3. Replace flagged values with the rolling median (conservative cap)
  4. Run Prophet on the cleaned series
  5. Return both original and cleaned forecasts + audit trail
"""

import logging
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

ROLLING_WINDOW = 8      # weeks for rolling stats
MAD_THRESHOLD  = 3.0    # how many MADs before a point is capped
MIN_ROWS       = 10


def compare_cleaned_forecast(
    df: pd.DataFrame,
    periods: int = 4,
) -> dict[str, Any]:
    """
    Run Prophet on original and outlier-capped versions of df.

    Args:
        df:      DataFrame with columns ds (datetime) and y (float).
        periods: Forecast horizon in weeks.

    Returns:
        original_forecast  — Prophet output on raw data
        cleaned_forecast   — Prophet output on capped data
        adjusted_points    — list of {date, original, cleaned, reason}
        summary            — {adjusted_count, method, message}
    """
    from services.prophet_service import run_forecast   # local import avoids circular

    df = _prepare(df)
    n  = len(df)

    if n < MIN_ROWS:
        raise ValueError(f"Need at least {MIN_ROWS} rows for outlier comparison, got {n}.")

    # ── Original forecast ─────────────────────────────────────────────────────
    original_result = run_forecast(df, periods=periods)

    # ── Detect and cap outliers ───────────────────────────────────────────────
    cleaned_df, adjusted_points = _cap_outliers(df)

    if not adjusted_points:
        return {
            "original_forecast": original_result["forecast"],
            "cleaned_forecast":  original_result["forecast"],   # identical
            "adjusted_points":   [],
            "summary": {
                "adjusted_count": 0,
                "method":  "rolling median + MAD",
                "message": "No extreme recent outliers detected; cleaned forecast matches original.",
            },
        }

    # ── Cleaned forecast ──────────────────────────────────────────────────────
    cleaned_result = run_forecast(cleaned_df, periods=periods)

    return {
        "original_forecast": original_result["forecast"],
        "cleaned_forecast":  cleaned_result["forecast"],
        "adjusted_points":   adjusted_points,
        "summary": {
            "adjusted_count": len(adjusted_points),
            "method":  "rolling median + MAD",
            "message": (
                f"{len(adjusted_points)} extreme point(s) were capped using rolling "
                f"median ± {MAD_THRESHOLD}×MAD before re-forecasting."
            ),
        },
    }


# ── Internal helpers ──────────────────────────────────────────────────────────

def _cap_outliers(df: pd.DataFrame) -> tuple[pd.DataFrame, list[dict]]:
    """Return (cleaned_df, list_of_adjusted_points)."""
    y      = df["y"].values.copy()
    n      = len(y)
    capped = y.copy()
    adjusted_points: list[dict] = []

    for i in range(ROLLING_WINDOW, n):
        window = y[max(0, i - ROLLING_WINDOW):i]
        median = float(np.median(window))
        mad    = float(np.median(np.abs(window - median)))

        if mad == 0:
            continue    # no spread — skip

        deviation = abs(float(y[i]) - median)
        if deviation > MAD_THRESHOLD * mad:
            original_val = float(y[i])
            # Cap to median ± threshold*mad
            cap = median + MAD_THRESHOLD * mad * np.sign(float(y[i]) - median)
            capped[i] = max(0.0, cap)
            adjusted_points.append({
                "date":     df["ds"].iloc[i].strftime("%Y-%m-%d"),
                "original": round(original_val, 2),
                "cleaned":  round(float(capped[i]), 2),
                "reason":   f"Deviation {deviation:.1f} > {MAD_THRESHOLD}×MAD ({MAD_THRESHOLD * mad:.1f})",
            })
            logger.debug("Capped outlier at index %d: %.1f → %.1f", i, original_val, capped[i])

    cleaned_df      = df.copy()
    cleaned_df["y"] = capped
    return cleaned_df, adjusted_points


def _prepare(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["ds"] = pd.to_datetime(df["ds"])
    df["y"]  = pd.to_numeric(df["y"], errors="coerce")
    df = df.dropna(subset=["ds", "y"])
    df = df[df["y"] >= 0]
    df = df.drop_duplicates(subset="ds", keep="last")
    df = df.sort_values("ds").reset_index(drop=True)
    return df