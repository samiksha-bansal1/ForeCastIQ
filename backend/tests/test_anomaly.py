"""
tests/test_anomaly.py
Unit tests for anomaly_service.py.
Run with: pytest tests/test_anomaly.py -v
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import numpy as np
import pandas as pd
import pytest

from services.anomaly_service import detect_anomalies


def _make_df(values: list[float]) -> pd.DataFrame:
    """Helper: build a minimal DataFrame from a list of values."""
    dates = pd.date_range(start="2023-01-02", periods=len(values), freq="W-MON")
    return pd.DataFrame({"ds": dates, "y": values})


class TestDetectAnomalies:

    def test_returns_required_keys(self):
        df = _make_df([100.0] * 20)
        result = detect_anomalies(df)
        assert "chart_data" in result
        assert "anomalies" in result
        assert "stats" in result

    def test_flat_series_has_no_anomalies(self):
        """A perfectly flat series should produce zero anomalies."""
        df = _make_df([500.0] * 20)
        result = detect_anomalies(df)
        assert result["stats"]["total"] == 0
        assert len(result["anomalies"]) == 0

    def test_detects_high_spike(self):
        """A value far above a tight cluster should be flagged as HIGH."""
        # Tight cluster (std ~1) then a massive spike so z >> 3
        base = [100.0, 101.0, 99.0, 100.0,
                100.0, 101.0, 99.0, 100.0,
                100.0, 101.0, 99.0, 100.0,
                100.0, 101.0, 99.0, 600.0,
                100.0, 101.0, 99.0, 100.0]
        df = _make_df(base)
        result = detect_anomalies(df)
        severities = [a["anomalySeverity"] for a in result["anomalies"]]
        assert "HIGH" in severities

    def test_chart_data_length_matches_input(self):
        """chart_data should have same number of rows as input."""
        values = [300.0 + i * 5 for i in range(30)]
        df = _make_df(values)
        result = detect_anomalies(df)
        assert len(result["chart_data"]) == len(df)

    def test_stats_counts_match_anomaly_list(self):
        """stats.total must equal len(anomalies)."""
        values = [500.0] * 20
        values[10] = 2000.0   # spike
        values[17] = 2000.0   # another spike
        df = _make_df(values)
        result = detect_anomalies(df)
        assert result["stats"]["total"] == len(result["anomalies"])
        assert result["stats"]["high"] + result["stats"]["medium"] == result["stats"]["total"]

    def test_chart_data_has_required_fields(self):
        """Every chart_data point must have the fields the frontend expects."""
        df = _make_df([400.0 + i for i in range(20)])
        result = detect_anomalies(df)
        required = {"date", "value", "rollingMean", "upperBand",
                    "lowerBand", "isAnomaly", "anomalySeverity", "deviation"}
        for point in result["chart_data"]:
            assert required.issubset(point.keys()), f"Missing keys in: {point}"

    def test_anomaly_fields(self):
        """Each flagged anomaly must expose the fields AnomalyCard expects."""
        values = [500.0] * 20
        values[15] = 3000.0
        df = _make_df(values)
        result = detect_anomalies(df)
        if result["anomalies"]:
            a = result["anomalies"][0]
            for key in ("date", "value", "isAnomaly",
                        "anomalySeverity", "deviation"):
                assert key in a

    def test_minimum_rows_requirement(self):
        """Should work with exactly 8 rows (minimum allowed by csv_parser)."""
        df = _make_df([100.0, 120.0, 110.0, 90.0, 200.0, 105.0, 108.0, 112.0])
        result = detect_anomalies(df)
        assert "chart_data" in result
