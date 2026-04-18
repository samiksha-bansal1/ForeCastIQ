"""
routes/anomalies.py
POST /api/anomalies

HOTFIX:
  - Only the top 10 most severe anomalies get Gemini explanations.
    Previously it called Gemini once per anomaly — with 74 anomalies
    that was 74 sequential API calls taking ~60 seconds and all failing.
  - Less-severe anomalies get smart rule-based fallbacks instantly.
  - Passes expected band context to explain_anomaly() for richer output.
"""

import logging
import json
import numpy as np

from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, ValidationError

from services.anomaly_service import detect_anomalies
from services.gemini_service import explain_anomaly
from utils.csv_parser import parse_csv_payload, parse_demo_data

logger = logging.getLogger(__name__)
anomalies_bp = Blueprint("anomalies", __name__)

# Only enrich this many anomalies with Gemini to avoid rate limits
MAX_AI_ENRICHED = 10


class AnomalyRequestSchema(Schema):
    data         = fields.List(fields.Dict(), load_default=None)
    date_column  = fields.Str(load_default="date")
    value_column = fields.Str(load_default="value")
    use_demo     = fields.Bool(load_default=False)


def _convert_numpy(obj):
    """Convert numpy types to native Python for JSON serialisation."""
    if isinstance(obj, np.bool_):    return bool(obj)
    if isinstance(obj, np.integer):  return int(obj)
    if isinstance(obj, np.floating): return float(obj)
    if isinstance(obj, np.ndarray):  return obj.tolist()
    return obj


def _severity_rank(anomaly: dict) -> int:
    """HIGH = 0 (sort first), MEDIUM = 1, anything else = 2."""
    return {"HIGH": 0, "MEDIUM": 1}.get(
        str(anomaly.get("anomalySeverity", "")), 2
    )


def _smart_fallback(anomaly: dict) -> dict[str, str]:
    """
    Rule-based explanation when Gemini is not called.
    Uses deviation sign + severity to pick the most likely cause.
    """
    deviation = float(anomaly.get("deviation", 0))
    severity  = str(anomaly.get("anomalySeverity", "MEDIUM"))

    if deviation > 0:
        cause  = "Value spiked above the normal range — possible demand surge, promotion, or data entry error."
        action = "Review sales orders and marketing activity for this period."
    else:
        cause  = "Value dropped below the normal range — possible supply issue, low demand, or missing data."
        action = "Check inventory, fulfilment logs, and whether any data was missed for this week."

    urgency = "immediate" if severity == "HIGH" else "monitor"
    return {"cause": cause, "action": action, "urgency": urgency}


@anomalies_bp.post("/anomalies")
def anomalies():
    """
    Detect anomalies and enrich the top MAX_AI_ENRICHED with Gemini.
    All remaining anomalies receive fast rule-based explanations.
    """
    try:
        body = AnomalyRequestSchema().load(request.get_json(force=True) or {})
    except ValidationError as exc:
        return jsonify({"success": False, "data": None,
                        "error": str(exc.messages)}), 400

    try:
        # ── Parse input ────────────────────────────────────────────────────
        if body["use_demo"] or not body["data"]:
            df = parse_demo_data()
            logger.info("Using demo data for anomaly detection")
        else:
            df = parse_csv_payload(
                body["data"],
                body["date_column"],
                body["value_column"],
            )

        # ── Detect anomalies ───────────────────────────────────────────────
        result   = detect_anomalies(df)
        raw_list = result.get("anomalies", [])

        logger.info(
            "Detected %d anomalies — enriching top %d with Gemini",
            len(raw_list), min(MAX_AI_ENRICHED, len(raw_list))
        )

        # Sort: HIGH first, then MEDIUM, then by absolute deviation descending
        sorted_anomalies = sorted(
            raw_list,
            key=lambda a: (_severity_rank(a), -abs(float(a.get("deviation", 0))))
        )

        enriched_anomalies = []

        for i, anomaly in enumerate(sorted_anomalies):
            if i < MAX_AI_ENRICHED:
                # Call Gemini for the most important ones
                try:
                    explanation = explain_anomaly(
                        date          = str(anomaly.get("date")),
                        value         = float(anomaly.get("value", 0)),
                        deviation     = float(anomaly.get("deviation", 0)),
                        severity      = str(anomaly.get("anomalySeverity", "MEDIUM")),
                        expected_low  = anomaly.get("lowerBand"),
                        expected_high = anomaly.get("upperBand"),
                        rolling_mean  = anomaly.get("rollingMean"),
                    )
                except Exception as exc:
                    logger.warning("Gemini enrichment failed for %s: %s",
                                   anomaly.get("date"), exc)
                    explanation = _smart_fallback(anomaly)
            else:
                # Fast rule-based fallback for the rest
                explanation = _smart_fallback(anomaly)

            enriched_anomalies.append({
                "date":        str(anomaly.get("date")),
                "value":       float(anomaly.get("value", 0)),
                "severity":    str(anomaly.get("anomalySeverity", "MEDIUM")),
                "deviation":   float(anomaly.get("deviation", 0)),
                "upperBand":   anomaly.get("upperBand"),
                "lowerBand":   anomaly.get("lowerBand"),
                "rollingMean": anomaly.get("rollingMean"),
                "cause":       explanation.get("cause", ""),
                "action":      explanation.get("action", ""),
                "urgency":     explanation.get("urgency", "monitor"),
                "aiEnriched":  i < MAX_AI_ENRICHED,  # lets the UI show an AI badge
            })

        # ── Build and sanitise response ────────────────────────────────────
        response = {
            "success": True,
            "data": {
                "chart_data": result.get("chart_data", []),
                "anomalies":  enriched_anomalies,
                "stats":      result.get("stats", {}),
            },
            "error": None,
        }

        cleaned = json.loads(json.dumps(response, default=_convert_numpy))
        return jsonify(cleaned), 200

    except ValueError as exc:
        logger.warning("Anomaly validation error: %s", exc)
        return jsonify({"success": False, "data": None,
                        "error": str(exc)}), 422

    except Exception:
        logger.exception("Unexpected error in /api/anomalies")
        return jsonify({"success": False, "data": None,
                        "error": "An unexpected error occurred."}), 500


class ExplainRequestSchema(Schema):
    date         = fields.Str(required=True)
    value        = fields.Float(required=True)
    deviation    = fields.Float(required=True)
    severity     = fields.Str(required=True)
    upper_band   = fields.Float(load_default=None)
    lower_band   = fields.Float(load_default=None)
    rolling_mean = fields.Float(load_default=None)


@anomalies_bp.post("/anomalies/explain")
def explain_anomaly_endpoint():
    """
    On-demand AI explanation for a single anomaly.
    Reuses explain_anomaly() from gemini_service.
    """
    try:
        body = ExplainRequestSchema().load(request.get_json(force=True) or {})
    except ValidationError as exc:
        return jsonify({"success": False, "data": None,
                        "error": str(exc.messages)}), 400

    try:
        explanation = explain_anomaly(
            date          = body["date"],
            value         = body["value"],
            deviation     = body["deviation"],
            severity      = body["severity"],
            expected_low  = body.get("lower_band"),
            expected_high = body.get("upper_band"),
            rolling_mean  = body.get("rolling_mean"),
        )

        response = {
            "success": True,
            "data": {
                "cause":   explanation.get("cause", ""),
                "action":  explanation.get("action", ""),
                "urgency": explanation.get("urgency", "monitor"),
            },
            "error": None,
        }
        return jsonify(response), 200

    except Exception as exc:
        logger.exception("Error in /api/anomalies/explain")
        return jsonify({"success": False, "data": None,
                        "error": str(exc)}), 500