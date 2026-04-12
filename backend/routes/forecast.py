"""
routes/forecast.py
POST /api/forecast               — main Prophet forecast
POST /api/forecast/compare-cleaned — outlier-aware comparison
"""

import logging

from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, ValidationError

from services.prophet_service import run_forecast
from services.local_models_service import run_local_forecast
from services.baseline_service import compute_baseline, project_baseline
from services.gemini_service import explain_forecast
from services.outlier_service import compare_cleaned_forecast
from utils.csv_parser import parse_csv_payload, parse_demo_data

logger = logging.getLogger(__name__)
forecast_bp = Blueprint("forecast", __name__)


# ── Schemas ───────────────────────────────────────────────────────────────────

class ForecastRequestSchema(Schema):
    data         = fields.List(fields.Dict(), load_default=None)
    date_column  = fields.Str(load_default="date")
    value_column = fields.Str(load_default="value")
    periods      = fields.Int(load_default=4)
    use_demo     = fields.Bool(load_default=False)


class CleanedForecastRequestSchema(Schema):
    records      = fields.List(fields.Dict(), load_default=None)
    data         = fields.List(fields.Dict(), load_default=None)
    date_column  = fields.Str(load_default="ds")
    value_column = fields.Str(load_default="y")
    periods      = fields.Int(load_default=4)
    use_demo     = fields.Bool(load_default=False)


# ── /api/forecast ─────────────────────────────────────────────────────────────

@forecast_bp.post("/forecast")
def forecast():
    try:
        body = ForecastRequestSchema().load(request.get_json(force=True) or {})
    except ValidationError as exc:
        return jsonify({"success": False, "data": None, "error": str(exc.messages)}), 400

    try:
        if body["use_demo"] or not body["data"]:
            df = parse_demo_data()
            logger.info("Using demo data for forecast")
        else:
            df = parse_csv_payload(body["data"], body["date_column"], body["value_column"])

        periods = body["periods"]

        # ── Try Prophet; fall back to best local model ────────────────────────
        local_meta: dict = {}
        try:
            result = run_forecast(df, periods=periods)
            model_used = "Prophet"
        except Exception as prophet_exc:
            logger.warning("Prophet failed (%s), falling back to local models.", prophet_exc)
            local_result = run_local_forecast(df, periods=periods)
            # Wrap local result to match Prophet's shape
            result = {
                "historical": [
                    {"date": r["ds"].strftime("%Y-%m-%d") if hasattr(r["ds"], "strftime") else str(r["ds"]),
                     "actual": float(r["y"])}
                    for _, r in df.iterrows()
                ],
                "forecast": local_result["forecast"],
                "summary":  {
                    "trend_pct":      0,
                    "peak_week":      "Week 1",
                    "confidence_range": int(
                        (local_result["forecast"][0]["yhat_upper"] -
                         local_result["forecast"][0]["yhat_lower"]) / 2
                    ) if local_result["forecast"] else 0,
                    "vs_baseline_pct": 0,
                },
            }
            model_used = local_result["model_name"]
            local_meta = {
                "model_name":  local_result["model_name"],
                "holdout_mae": local_result["holdout_mae"],
                "all_mae":     local_result["all_mae"],
            }

        # ── Baseline ──────────────────────────────────────────────────────────
        baseline_hist = compute_baseline(df)
        baseline_fore = project_baseline(df, periods=periods)

        for i, pt in enumerate(result["historical"]):
            if i < len(baseline_hist):
                pt["baseline"] = round(baseline_hist[i], 2)

        for i, pt in enumerate(result["forecast"]):
            if i < len(baseline_fore):
                pt["baseline"] = round(baseline_fore[i], 2)

        # ── AI insight ────────────────────────────────────────────────────────
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
                "historical": result["historical"],
                "forecast":   result["forecast"],
                "summary":    summary,
                "insight":    insight,
                "transparency": {
                    "model_used":  model_used,
                    "local_meta":  local_meta,
                },
            },
            "error": None,
        })

    except ValueError as exc:
        return jsonify({"success": False, "data": None, "error": str(exc)}), 422
    except Exception:
        logger.exception("Unexpected error in /api/forecast")
        return jsonify({"success": False, "data": None, "error": "An unexpected error occurred."}), 500


# ── /api/forecast/compare-cleaned ────────────────────────────────────────────

@forecast_bp.post("/forecast/compare-cleaned")
def forecast_compare_cleaned():
    try:
        body = CleanedForecastRequestSchema().load(request.get_json(force=True) or {})
    except ValidationError as exc:
        return jsonify({"success": False, "data": None, "error": str(exc.messages)}), 400

    try:
        # Accept either "records" (raw ds/y) or "data" (frontend CSV rows)
        raw = body.get("records") or body.get("data")

        if body["use_demo"] or not raw:
            df = parse_demo_data()
        else:
            date_col  = body["date_column"]
            value_col = body["value_column"]
            import pandas as pd
            df = pd.DataFrame(raw)
            df = df.rename(columns={date_col: "ds", value_col: "y"})
            df["ds"] = pd.to_datetime(df["ds"])
            df["y"]  = pd.to_numeric(df["y"], errors="coerce")
            df = df.dropna(subset=["ds", "y"])

        comparison = compare_cleaned_forecast(df, periods=body["periods"])

        return jsonify({
            "success": True,
            "data":    comparison,
            "error":   None,
        })

    except ValueError as exc:
        return jsonify({"success": False, "data": None, "error": str(exc)}), 422
    except Exception:
        logger.exception("Unexpected error in /api/forecast/compare-cleaned")
        return jsonify({"success": False, "data": None, "error": "An unexpected error occurred."}), 500