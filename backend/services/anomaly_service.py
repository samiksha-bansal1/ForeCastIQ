"""
services/anomaly_service.py
Detects anomalies in time-series data using a rolling z-score (FIXED).
"""

import logging
import numpy as np
import pandas as pd

from config import config

logger = logging.getLogger(__name__)


def detect_anomalies(df: pd.DataFrame) -> dict:
    """
    Detect anomalies using rolling z-score (FIXED VERSION).
    """

    window = config.ANOMALY_ROLLING_WINDOW
    high_t = config.ANOMALY_HIGH_THRESHOLD
    med_t  = config.ANOMALY_MEDIUM_THRESHOLD

    logger.info("Running anomaly detection: %d rows, window=%d", len(df), window)

    # ✅ Ensure clean indexing
    df = df.reset_index(drop=True)

    series = df["y"].astype(float)

    # 🔥 FIX 1: Use ONLY past data (shifted rolling window)
    rolling_mean = (
        series.rolling(window=window, min_periods=2)
        .mean()
        .shift(1)
    )

    rolling_std = (
        series.rolling(window=window, min_periods=2)
        .std()
        .shift(1)
    )

    # 🔥 FIX 2: Avoid division by zero (DO NOT use NaN)
    rolling_std = rolling_std.replace(0, 1e-8)

    # ✅ Z-score
    z_scores = (series - rolling_mean) / rolling_std

    chart_data = []

    # 🔥 FIX 3: Use fixed band (2σ) for visualization
    band_sigma = 2

    for i in range(len(df)):
        row = df.iloc[i]

        mean_val = rolling_mean.iloc[i]
        std_val  = rolling_std.iloc[i]
        z        = z_scores.iloc[i]

        is_anomaly = False
        severity = None

        if pd.notna(z):
            if abs(z) >= med_t:
                is_anomaly = True
                severity = "HIGH" if abs(z) >= high_t else "MEDIUM"

        chart_data.append({
            "date": row["ds"].strftime("%Y-%m-%d"),

            # value
            "value": float(round(row["y"], 2)),

            # rolling mean
            "rollingMean": float(round(mean_val, 2)) if pd.notna(mean_val) else None,

            # 🔥 FIXED BAND (independent of threshold)
            "upperBand": float(round(mean_val + band_sigma * std_val, 2))
            if pd.notna(mean_val) and pd.notna(std_val) else None,

            "lowerBand": float(round(mean_val - band_sigma * std_val, 2))
            if pd.notna(mean_val) and pd.notna(std_val) else None,

            # anomaly flags
            "isAnomaly": bool(is_anomaly),
            "anomalySeverity": str(severity) if severity else None,

            # z-score
            "deviation": float(round(z, 2)) if pd.notna(z) else None,
        })

    # ✅ Extract anomalies
    anomaly_rows = [pt for pt in chart_data if pt["isAnomaly"]]

    stats = {
        "total": int(len(anomaly_rows)),
        "high": int(sum(1 for a in anomaly_rows if a["anomalySeverity"] == "HIGH")),
        "medium": int(sum(1 for a in anomaly_rows if a["anomalySeverity"] == "MEDIUM")),
    }

    logger.info(
        "Anomaly detection complete: %d total (%d HIGH, %d MEDIUM)",
        stats["total"], stats["high"], stats["medium"]
    )

    return {
        "chart_data": chart_data,
        "anomalies": anomaly_rows,
        "stats": stats,
    }