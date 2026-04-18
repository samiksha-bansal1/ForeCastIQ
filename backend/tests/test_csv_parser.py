"""
tests/test_csv_parser.py
Unit tests for utils/csv_parser.py.
Run with: pytest tests/test_csv_parser.py -v
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from utils.csv_parser import parse_csv_payload, parse_demo_data


def _make_rows(n: int = 15) -> list[dict]:
    """Generate n rows of valid CSV data."""
    from datetime import date, timedelta
    start = date(2023, 1, 2)
    return [
        {"date": (start + timedelta(weeks=i)).isoformat(), "value": str(100 + i * 5)}
        for i in range(n)
    ]


def _make_daily_rows(n: int = 50) -> list[dict]:
    """Generate n rows of daily CSV data."""
    from datetime import date, timedelta
    start = date(2023, 1, 2)
    return [
        {"date": (start + timedelta(days=i)).isoformat(), "value": str(10 + i)}
        for i in range(n)
    ]


class TestParseCsvPayload:

    def test_valid_data_returns_dataframe(self):
        rows = _make_rows(20)
        df = parse_csv_payload(rows, "date", "value")
        assert len(df) == 20
        assert list(df.columns) == ["ds", "y"]

    def test_empty_data_raises(self):
        with pytest.raises(ValueError, match="No data"):
            parse_csv_payload([], "date", "value")

    def test_missing_date_column_raises(self):
        rows = _make_rows(10)
        with pytest.raises(ValueError, match="Date column"):
            parse_csv_payload(rows, "wrong_date", "value")

    def test_missing_value_column_raises(self):
        rows = _make_rows(10)
        with pytest.raises(ValueError, match="Value column"):
            parse_csv_payload(rows, "date", "wrong_value")

    def test_fewer_than_8_rows_raises(self):
        rows = _make_rows(5)
        with pytest.raises(ValueError, match="8 rows"):
            parse_csv_payload(rows, "date", "value")

    def test_exactly_8_rows_is_accepted(self):
        rows = _make_rows(8)
        df = parse_csv_payload(rows, "date", "value")
        assert len(df) == 8

    def test_output_sorted_by_date(self):
        # Reverse the rows — parser should sort them
        rows = list(reversed(_make_rows(15)))
        df = parse_csv_payload(rows, "date", "value")
        assert df["ds"].is_monotonic_increasing

    def test_non_numeric_values_dropped(self):
        rows = _make_rows(20)
        rows[5]["value"] = "N/A"   # inject bad value
        df = parse_csv_payload(rows, "date", "value")
        assert len(df) == 19       # one row dropped

    def test_y_column_is_float(self):
        rows = _make_rows(15)
        df = parse_csv_payload(rows, "date", "value")
        assert df["y"].dtype == float

    def test_daily_data_resamples_to_weekly(self):
        rows = _make_daily_rows(50)  # 50 days ≈ 7-8 weeks
        df = parse_csv_payload(rows, "date", "value")
        assert len(df) == 8  # Should be resampled to 8 weekly rows
        # Check that dates are Mondays (start of week)
        for _, row in df.iterrows():
            assert row["ds"].weekday() == 0  # Monday

    def test_monthly_data_logs_warning(self):
        # This test would require capturing logs, but for now, just ensure it doesn't crash
        from datetime import date
        rows = [
            {"date": date(2023, 1, 1).isoformat(), "value": "100"},
            {"date": date(2023, 2, 1).isoformat(), "value": "110"},
            {"date": date(2023, 3, 1).isoformat(), "value": "120"},
            {"date": date(2023, 4, 1).isoformat(), "value": "130"},
            {"date": date(2023, 5, 1).isoformat(), "value": "140"},
            {"date": date(2023, 6, 1).isoformat(), "value": "150"},
            {"date": date(2023, 7, 1).isoformat(), "value": "160"},
            {"date": date(2023, 8, 1).isoformat(), "value": "170"},
        ]
        df = parse_csv_payload(rows, "date", "value")
        assert len(df) == 8  # No resampling for monthly


class TestParseDemoData:

    def test_returns_171_rows(self):
        df = parse_demo_data()
        assert len(df) == 171

    def test_has_correct_columns(self):
        df = parse_demo_data()
        assert list(df.columns) == ["ds", "y"]

    def test_no_missing_values(self):
        df = parse_demo_data()
        assert df["ds"].notna().all()
        assert df["y"].notna().all()

    def test_values_are_positive(self):
        df = parse_demo_data()
        assert (df["y"] >= 0).all()
