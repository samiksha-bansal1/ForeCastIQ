"""
routes/forecast.py
POST /api/forecast
Accepts CSV data + column names, runs Prophet, returns forecast JSON.
"""

import logging

from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, ValidationError

from services.prophet_service import run_forecast
from services.baseline_service import compute_baseline, project_baseline
from services.gemini_service import explain_forecast
from utils.csv_parser import parse_csv_payload, parse_demo_data

logger = logging.getLogger(__name__)
forecast_bp = Blueprint("forecast", __name__)


class ForecastRequestSchema(Schema):
    """Validates the incoming forecast request body."""
    data        = fields.List(fields.Dict(), load_default=None)
    date_column  = fields.Str(load_default="date")
    value_column = fields.Str(load_default="value")
    periods      = fields.Int(load_default=4)
    use_demo     = fields.Bool(load_default=False)


@forecast_bp.post("/forecast")
def forecast():
    """
    Run a 4-week Prophet forecast on the provided CSV data.

    Request body (JSON):
        data:         List of row dicts from the frontend CSV parser.
        date_column:  Name of the date column (default: "date").
        value_column: Name of the value column (default: "value").
        periods:      Number of weeks to forecast ahead (default: 4).
        use_demo:     If true, ignore data and use built-in demo dataset.

    Response (JSON):
        success:    true / false
        data:       { historical, forecast, baseline_historical,
                      baseline_forecast, summary, insight }
        error:      error message string (only on failure)
    """
    try:
        body = ForecastRequestSchema().load(request.get_json(force=True) or {})
    except ValidationError as exc:
        return jsonify({"success": False, "data": None,
                        "error": str(exc.messages)}), 400

    try:
        # Parse input data
        if body["use_demo"] or not body["data"]:
            df = parse_demo_data()
            logger.info("Using demo data for forecast")
        else:
            df = parse_csv_payload(
                body["data"],
                body["date_column"],
                body["value_column"],
            )

        periods = body["periods"]

        # Run Prophet forecast
        result = run_forecast(df, periods=periods)

        # Compute moving average baseline
        baseline_hist = compute_baseline(df)
        baseline_fore = project_baseline(df, periods=periods)

        # Attach baseline to historical points
        for i, pt in enumerate(result["historical"]):
            pt["baseline"] = round(baseline_hist[i], 2)

        # Attach baseline to forecast points
        for i, pt in enumerate(result["forecast"]):
            pt["baseline"] = round(baseline_fore[i], 2)

        # Generate Gemini plain-English insight
        summary = result["summary"]
        insight = explain_forecast(
            trend_pct=summary.get("trend_pct", 0),
            peak_week=summary.get("peak_week", "Week 1"),
            confidence_range=summary.get("confidence_range", 0),
            vs_baseline_pct=summary.get("vs_baseline_pct", 0),
            periods=periods,
        )

        return jsonify({
            "success": True,
            "data": {
                "historical":        result["historical"],
                "forecast":          result["forecast"],
                "summary":           summary,
                "insight":           insight,
            },
            "error": None,
        })

    except ValueError as exc:
        logger.warning("Forecast validation error: %s", exc)
        return jsonify({"success": False, "data": None,
                        "error": str(exc)}), 422

    except RuntimeError as exc:
        logger.error("Forecast runtime error: %s", exc)
        return jsonify({"success": False, "data": None,
                        "error": str(exc)}), 500

    except Exception as exc:
        logger.exception("Unexpected error in /api/forecast")
        return jsonify({"success": False, "data": None,
                        "error": "An unexpected error occurred."}), 500
