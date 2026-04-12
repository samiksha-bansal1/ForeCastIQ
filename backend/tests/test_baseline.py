"""
tests/test_baseline.py
Unit tests for baseline_service.py.
Run with: pytest tests/test_baseline.py -v
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pandas as pd
import pytest

from services.baseline_service import compute_baseline, project_baseline


def _make_df(values: list[float]) -> pd.DataFrame:
    """Helper: build a minimal DataFrame from a list of values."""
    dates = pd.date_range(start="2023-01-02", periods=len(values), freq="W-MON")
    return pd.DataFrame({"ds": dates, "y": values})


class TestComputeBaseline:

    def test_output_length_matches_input(self):
        df = _make_df([100.0] * 20)
        result = compute_baseline(df)
        assert len(result) == len(df)

    def test_flat_series_baseline_equals_value(self):
        """For a flat series, baseline should equal the constant value."""
        df = _make_df([250.0] * 20)
        result = compute_baseline(df)
        # After warm-up, all values should equal 250
        for v in result[4:]:
            assert abs(v - 250.0) < 0.01

    def test_returns_list_of_floats(self):
        df = _make_df([100.0 + i for i in range(10)])
        result = compute_baseline(df)
        assert isinstance(result, list)
        assert all(isinstance(v, float) for v in result)

    def test_rolling_mean_lags_behind_rising_series(self):
        """On a rising series, rolling mean should be below current value."""
        values = [float(i * 10) for i in range(1, 21)]
        df = _make_df(values)
        result = compute_baseline(df)
        # Last baseline value should be less than last actual value
        assert result[-1] < values[-1]


class TestProjectBaseline:

    def test_projection_length_matches_periods(self):
        df = _make_df([100.0] * 20)
        result = project_baseline(df, periods=4)
        assert len(result) == 4

    def test_flat_series_projects_constant(self):
        """For a flat series the projection should be that constant value."""
        df = _make_df([400.0] * 20)
        result = project_baseline(df, periods=4)
        for v in result:
            assert abs(v - 400.0) < 0.01

    def test_projection_uses_last_window(self):
        """Projection should be mean of the last 4 values only."""
        # Make a series where the last 4 values are all 200
        values = [100.0] * 16 + [200.0] * 4
        df = _make_df(values)
        result = project_baseline(df, periods=4)
        for v in result:
            assert abs(v - 200.0) < 0.01

    def test_custom_periods(self):
        df = _make_df([300.0] * 20)
        for p in [1, 2, 4, 8]:
            result = project_baseline(df, periods=p)
            assert len(result) == p

    def test_returns_list_of_floats(self):
        df = _make_df([500.0] * 10)
        result = project_baseline(df, periods=4)
        assert isinstance(result, list)
        assert all(isinstance(v, float) for v in result)
