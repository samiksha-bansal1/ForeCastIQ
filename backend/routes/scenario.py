"""
routes/scenario.py
POST /api/scenario
"""

import logging

from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, ValidationError

from services.prophet_service import run_forecast
from services.gemini_service import answer_scenario
from services.scenario_engine import apply_scenario
from utils.csv_parser import parse_demo_data

logger = logging.getLogger(__name__)
scenario_bp = Blueprint("scenario", __name__)


class HistoryItemSchema(Schema):
    role    = fields.Str(required=True)
    content = fields.Str(required=True)


class ScenarioRequestSchema(Schema):
    question          = fields.Str(required=True)
    baseline_forecast = fields.List(fields.Dict(), load_default=None)
    historical        = fields.List(fields.Dict(), load_default=None)
    history           = fields.List(fields.Nested(HistoryItemSchema), load_default=[])
    data              = fields.List(fields.Dict(), load_default=None)
    date_column       = fields.Str(load_default="date")
    value_column      = fields.Str(load_default="value")
    use_demo          = fields.Bool(load_default=False)


@scenario_bp.post("/scenario")
def scenario():
    try:
        body = ScenarioRequestSchema().load(request.get_json(force=True) or {})
    except ValidationError as exc:
        return jsonify({"success": False, "data": None, "error": str(exc.messages)}), 400

    if not body["question"].strip():
        return jsonify({"success": False, "data": None, "error": "Question cannot be empty."}), 400

    try:
        baseline_forecast = body.get("baseline_forecast")
        historical        = body.get("historical")

        if not baseline_forecast:
            if body["use_demo"] or not body["data"]:
                df = parse_demo_data()
            else:
                from utils.csv_parser import parse_csv_payload
                df = parse_csv_payload(body["data"], body["date_column"], body["value_column"])

            forecast_result   = run_forecast(df, periods=4)
            baseline_forecast = forecast_result["forecast"]
            historical        = historical or forecast_result.get("historical")

        cleaned_baseline = [
            {"date": pt.get("date"), "yhat": max(0.0, float(pt.get("yhat", 0)))}
            for pt in baseline_forecast
        ]

        scenario_result = apply_scenario(
            baseline_forecast=cleaned_baseline,
            question=body["question"],
            historical=historical,
        )

        # Greetings — skip AI
        if scenario_result["is_conversational"]:
            return jsonify({
                "success": True,
                "data": {
                    "scenario_data":     scenario_result["scenario_data"],
                    "delta":             0,
                    "summary":           scenario_result["summary"],
                    "is_conversational": True,
                },
                "error": None,
            })

        # Real scenario — get AI explanation
        explanation = answer_scenario(
            baseline_forecast=cleaned_baseline,
            question=body["question"],
            history=body["history"],
        )

        summary = explanation.get(
            "summary",
            f"Scenario shows a {scenario_result['delta']:,} unit change vs baseline.",
        )

        return jsonify({
            "success": True,
            "data": {
                "scenario_data":     scenario_result["scenario_data"],
                "delta":             scenario_result["delta"],
                "summary":           summary,
                "is_conversational": False,
                "meta":              scenario_result.get("meta"),
            },
            "error": None,
        })

    except ValueError as exc:
        return jsonify({"success": False, "data": None, "error": str(exc)}), 422
    except Exception:
        logger.exception("Unexpected error in /api/scenario")
        return jsonify({"success": False, "data": None, "error": "An unexpected error occurred."}), 500