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

    if len(df) < 8:
        raise ValueError(
            f"Only {len(df)} valid rows found after cleaning. "
            "At least 8 rows are required for reliable forecasting."
        )

    df = df.sort_values("ds").reset_index(drop=True)
    logger.info("CSV parsed successfully: %d rows, date range %s to %s",
                len(df), df["ds"].min().date(), df["ds"].max().date())
    return df


def parse_demo_data() -> pd.DataFrame:
    """
    Generate 52 weeks of demo data for testing without an upload.
    Returns a DataFrame with columns ['ds', 'y'].
    """
    import numpy as np

    rng = np.random.default_rng(42)
    dates = pd.date_range(start="2023-01-02", periods=52, freq="W-MON")
    trend = np.linspace(3200, 4800, 52)
    seasonality = 300 * np.sin(np.linspace(0, 4 * np.pi, 52))
    noise = rng.normal(0, 120, 52)
    values = trend + seasonality + noise

    # Inject 3 anomalies
    values[14] += 1200   # HIGH spike
    values[31] -= 900    # HIGH drop
    values[44] += 600    # MEDIUM spike

    df = pd.DataFrame({"ds": dates, "y": values.clip(0)})
    return df
