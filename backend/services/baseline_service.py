"""
services/baseline_service.py
Computes a simple moving average baseline using NumPy.
No AI involved — pure math.
"""

import logging

import numpy as np
import pandas as pd

from config import config

logger = logging.getLogger(__name__)


def compute_baseline(df: pd.DataFrame) -> list[float]:
    """
    Compute a rolling moving average over the full series and
    extend it as a flat projection for the forecast horizon.

    Args:
        df: DataFrame with columns ['ds', 'y'], sorted ascending.

    Returns:
        List of baseline values — same length as df.
        Each value is the rolling mean up to that point.
        The last WINDOW values are used to project forward.
    """
    window = config.MOVING_AVERAGE_WINDOW
    values = df["y"].to_numpy(dtype=float)

    # Rolling mean — for early rows where window isn't full,
    # use whatever data is available (min_periods=1)
    baseline = (
        pd.Series(values)
        .rolling(window=window, min_periods=1)
        .mean()
        .to_numpy()
    )

    logger.debug("Baseline computed: window=%d, last value=%.2f",
                 window, baseline[-1])
    return baseline.tolist()


def project_baseline(df: pd.DataFrame, periods: int) -> list[float]:
    """
    Project the baseline forward for `periods` future weeks.
    Uses the mean of the last WINDOW actual values as the flat projection.

    Args:
        df:      DataFrame with columns ['ds', 'y'], sorted ascending.
        periods: Number of future periods to project.

    Returns:
        List of `periods` projected baseline values.
    """
    window = config.MOVING_AVERAGE_WINDOW
    last_values = df["y"].tail(window).to_numpy(dtype=float)
    projected_value = float(np.mean(last_values))

    logger.debug("Baseline projection: %.2f × %d periods", projected_value, periods)
    return [projected_value] * periods
