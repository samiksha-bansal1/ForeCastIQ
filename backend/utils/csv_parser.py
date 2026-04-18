"""
utils/csv_parser.py
Validates and parses raw CSV data sent from the frontend.
Accepts a list of row-dicts and returns a clean pandas DataFrame
with exactly two columns: 'ds' (datetime) and 'y' (float).
Raises ValueError with a user-readable message on any problem.
"""

import logging
from io import StringIO
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


def parse_csv_payload(
    data: list[dict[str, Any]],
    date_column: str,
    value_column: str,
) -> pd.DataFrame:
    """
    Convert raw frontend payload into a clean Prophet-ready DataFrame.

    Args:
        data:         List of row dicts from the frontend CSV parser.
        date_column:  Name of the column containing date strings.
        value_column: Name of the column containing numeric values.

    Returns:
        DataFrame with columns ['ds', 'y'], sorted ascending by 'ds'.

    Raises:
        ValueError: If data is missing, columns don't exist, or
                    fewer than 8 valid rows remain after cleaning.
    """
    if not data or len(data) == 0:
        raise ValueError("No data provided.")

    df = pd.DataFrame(data)

    if date_column not in df.columns:
        raise ValueError(f"Date column '{date_column}' not found in data.")
    if value_column not in df.columns:
        raise ValueError(f"Value column '{value_column}' not found in data.")

    # Rename to Prophet's expected column names
    df = df[[date_column, value_column]].copy()
    df.columns = ["ds", "y"]

    # Parse dates — infer format, coerce bad values to NaT
    df["ds"] = pd.to_datetime(df["ds"], errors="coerce")

    # Parse numeric values — coerce non-numeric to NaN, always float
    df["y"] = pd.to_numeric(df["y"], errors="coerce").astype(float)

    # Drop rows with missing date or value
    before = len(df)
    df = df.dropna(subset=["ds", "y"])
    dropped = before - len(df)
    if dropped > 0:
        logger.warning("Dropped %d rows with unparseable date or value.", dropped)

    df = df.sort_values("ds").reset_index(drop=True)

    # Auto-detect and resample to weekly if needed
    if len(df) >= 2:
        deltas = df["ds"].diff().dropna()
        median_days = deltas.median().days
        if median_days < 3:  # daily data → resample to weekly sum
            df = df.set_index("ds").resample("W-MON")["y"].sum().reset_index()
            df.columns = ["ds", "y"]
            df = df.dropna()
            logger.info("Resampled daily→weekly: %d rows", len(df))
        elif median_days > 35:  # monthly data
            logger.warning(
                "Monthly data detected (%d-day median interval). "
                "Forecasts will be in weekly steps; consider providing weekly data for best results.",
                median_days
            )

    if len(df) < 8:
        raise ValueError(
            f"Only {len(df)} valid rows found after cleaning. "
            "At least 8 rows are required for reliable forecasting."
        )
    logger.info("CSV parsed successfully: %d rows, date range %s to %s",
                len(df), df["ds"].min().date(), df["ds"].max().date())
    return df


def parse_demo_data() -> pd.DataFrame:
    """
    Load the real demo_sales.csv shipped with the backend.
    Falls back to generated data only if the file is missing.
    """
    import os

    csv_path = os.path.join(os.path.dirname(__file__), "..", "demo_sales.csv")
    csv_path = os.path.normpath(csv_path)

    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        df = df.rename(columns={"date": "ds", "value": "y"})
        df["ds"] = pd.to_datetime(df["ds"])
        df["y"]  = pd.to_numeric(df["y"], errors="coerce")
        df = df.dropna(subset=["ds", "y"])
        df = df.sort_values("ds").reset_index(drop=True)
        logger.info(
            "Loaded demo_sales.csv: %d rows, %s → %s",
            len(df), df["ds"].min().date(), df["ds"].max().date()
        )
        return df

    # Fallback only if file is missing
    logger.warning("demo_sales.csv not found — generating synthetic data")
    import numpy as np
    rng   = np.random.default_rng(42)
    dates = pd.date_range(start="2022-01-03", periods=171, freq="W-MON")
    trend = np.linspace(12000, 210000, 171)
    noise = rng.normal(0, 3000, 171)
    df = pd.DataFrame({"ds": dates, "y": (trend + noise).clip(0)})
    return df
