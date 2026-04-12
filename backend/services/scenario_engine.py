"""
services/scenario_engine.py
Rule-based scenario engine — fast, deterministic, never fails.

Supported scenario types:
  - increase / decrease by %
  - continue recent trend
  - flatten trend
  - remove recent outliers
  - greeting / conversational (no chart update)
"""

import re
import random
import logging
from typing import List, Dict, Any, Optional

import numpy as np

logger = logging.getLogger(__name__)


# ── Greeting / conversational detection ──────────────────────────────────────

_GREETING_PATTERNS = [
    r"^\s*(hi|hey|hello|howdy|hiya|yo)\b",
    r"^\s*good\s*(morning|afternoon|evening|day)\b",
    r"^\s*thanks?\b",
    r"^\s*thank\s*you\b",
    r"^\s*ok(ay)?\b",
    r"^\s*sure\b",
    r"^\s*cool\b",
    r"^\s*great\b",
    r"^\s*sounds?\s*good\b",
    r"^\s*got\s*it\b",
    r"^\s*nice\b",
]

_SCENARIO_KEYWORDS = [
    "increase", "decrease", "drop", "rise", "boost", "push",
    "fall", "grow", "cut", "reduce", "add", "more", "less",
    "marketing", "demand", "price", "discount", "promo",
    "what if", "what happens", "scenario", "if i", "if we",
    "week", "%", "percent",
    "trend", "flatten", "outlier", "outliers", "continue",
]

_GREETING_REPLIES = [
    'Hey there! Ask me something like "What if I run a 20% marketing push for 2 weeks?" and I\'ll model it against your baseline forecast.',
    'Hello! I can model any what-if scenario for your sales forecast. Try: "What happens if demand drops 15% in week 2?"',
    'Hi! Ready to run some scenarios. Try: "What if we boost sales 10% for the next 3 weeks?" or "Continue recent trend."',
]

_THANKS_REPLIES = [
    "Happy to help! Feel free to ask another scenario anytime.",
    "Anytime! Want to try another what-if scenario?",
    "Glad that helped! Ask me another scenario whenever you're ready.",
]

_GENERIC_REPLIES = [
    'I\'m here to model what-if scenarios for your forecast. Try: "What if demand increases 20% for 2 weeks?"',
    'Not sure what you mean — but I can model scenarios! Try: "What if I run a 15% promo for 3 weeks?"',
]


def _is_conversational(question: str) -> bool:
    q = question.strip().lower()
    if any(kw in q for kw in _SCENARIO_KEYWORDS):
        return False
    for pattern in _GREETING_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            return True
    if len(q.split()) <= 4:
        return True
    return False


def _pick_reply(question: str) -> str:
    q = question.strip().lower()
    if re.search(r"\b(thanks?|thank\s*you)\b", q):
        return random.choice(_THANKS_REPLIES)
    if re.search(r"^\s*(hi|hey|hello|howdy|hiya|yo)\b", q, re.IGNORECASE):
        return random.choice(_GREETING_REPLIES)
    return random.choice(_GENERIC_REPLIES)


# ── Special scenario detectors ────────────────────────────────────────────────

def _is_continue_trend(question: str) -> bool:
    q = question.lower()
    return bool(re.search(r"continue\s+(recent\s+)?trend", q)) or \
           bool(re.search(r"(keep|extend|extrapolate)\s+(the\s+)?(recent\s+)?trend", q))


def _is_flatten_trend(question: str) -> bool:
    q = question.lower()
    return bool(re.search(r"flatten\s+(the\s+)?trend", q)) or \
           bool(re.search(r"(flat|plateau|stabilise|stabilize|no\s+trend)", q))


def _is_remove_outliers(question: str) -> bool:
    q = question.lower()
    return bool(re.search(r"remove\s+(recent\s+)?(extreme\s+)?outliers?", q)) or \
           bool(re.search(r"(clean|strip|exclude)\s+(the\s+)?(extreme\s+)?outliers?", q)) or \
           bool(re.search(r"outlier.*(remov|clean|strip)", q))


# ── Numeric helpers ───────────────────────────────────────────────────────────

def extract_percentage(question: str) -> float:
    match = re.search(r"(\d+(?:\.\d+)?)\s*%", question)
    return float(match.group(1)) / 100 if match else 0.0


def detect_intent(question: str) -> str:
    q = question.lower()
    if any(w in q for w in ["increase", "push", "boost", "grow", "rise", "add", "more", "promo", "marketing"]):
        return "increase"
    if any(w in q for w in ["drop", "decrease", "fall", "cut", "reduce", "less", "down"]):
        return "decrease"
    return "neutral"


def extract_duration(question: str) -> int:
    match = re.search(r"(\d+)\s*(week|weeks)", question.lower())
    if match:
        return min(int(match.group(1)), 4)
    return 4


# ── Special scenario calculators ──────────────────────────────────────────────

def _apply_continue_trend(
    baseline_forecast: List[Dict[str, Any]],
    historical: Optional[List[Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    """Extrapolate the recent linear trend from the last 4 historical points."""
    if historical and len(historical) >= 4:
        recent = [float(pt.get("actual", pt.get("y", 0))) for pt in historical[-4:]]
        # Fit linear slope over last 4 weeks
        x    = np.arange(len(recent))
        slope = float(np.polyfit(x, recent, 1)[0])
    else:
        slope = 0.0

    scenario_data = []
    for i, pt in enumerate(baseline_forecast):
        base = max(0.0, float(pt["yhat"]))
        scenario_val = max(0.0, base + slope * (i + 1))
        scenario_data.append({
            "week":     f"Week {i+1}",
            "baseline": round(base, 2),
            "scenario": round(scenario_val, 2),
        })
    return scenario_data


def _apply_flatten_trend(
    baseline_forecast: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Replace all forecast values with the mean of the baseline forecast."""
    yhats = [max(0.0, float(pt["yhat"])) for pt in baseline_forecast]
    flat  = float(np.mean(yhats))

    scenario_data = []
    for i, pt in enumerate(baseline_forecast):
        base = max(0.0, float(pt["yhat"]))
        scenario_data.append({
            "week":     f"Week {i+1}",
            "baseline": round(base, 2),
            "scenario": round(flat, 2),
        })
    return scenario_data


def _apply_remove_outliers(
    baseline_forecast: List[Dict[str, Any]],
    historical: Optional[List[Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    """Cap outliers in the forecast using rolling median + MAD."""
    yhats = np.array([max(0.0, float(pt["yhat"])) for pt in baseline_forecast])
    median = float(np.median(yhats))
    mad    = float(np.median(np.abs(yhats - median)))
    threshold = 2.5

    scenario_data = []
    for i, pt in enumerate(baseline_forecast):
        base = max(0.0, float(pt["yhat"]))
        if mad > 0 and abs(base - median) > threshold * mad:
            cap = median + threshold * mad * np.sign(base - median)
            scenario_val = max(0.0, cap)
        else:
            scenario_val = base
        scenario_data.append({
            "week":     f"Week {i+1}",
            "baseline": round(base, 2),
            "scenario": round(scenario_val, 2),
        })
    return scenario_data


# ── Main entry point ──────────────────────────────────────────────────────────

def apply_scenario(
    baseline_forecast: List[Dict[str, Any]],
    question: str,
    historical: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Main scenario engine.

    Returns:
        scenario_data      — list of {week, baseline, scenario}
        delta              — total unit change vs baseline
        summary            — friendly reply for greetings; None for scenarios
        is_conversational  — True for greetings/small-talk
        meta               — intent metadata (None for conversational)
    """

    # ── Conversational branch ─────────────────────────────────────────────────
    if _is_conversational(question):
        scenario_data = [
            {
                "week":     f"Week {i+1}",
                "baseline": round(max(0.0, float(pt["yhat"])), 2),
                "scenario": round(max(0.0, float(pt["yhat"])), 2),
            }
            for i, pt in enumerate(baseline_forecast)
        ]
        return {
            "scenario_data":     scenario_data,
            "delta":             0,
            "summary":           _pick_reply(question),
            "is_conversational": True,
            "meta":              None,
        }

    # ── Special scenarios ─────────────────────────────────────────────────────
    if _is_continue_trend(question):
        scenario_data = _apply_continue_trend(baseline_forecast, historical)
        delta = int(sum(d["scenario"] - d["baseline"] for d in scenario_data))
        return {
            "scenario_data":     scenario_data,
            "delta":             delta,
            "summary":           None,
            "is_conversational": False,
            "meta":              {"intent": "continue_trend", "percentage": 0, "duration": 4},
        }

    if _is_flatten_trend(question):
        scenario_data = _apply_flatten_trend(baseline_forecast)
        delta = int(sum(d["scenario"] - d["baseline"] for d in scenario_data))
        return {
            "scenario_data":     scenario_data,
            "delta":             delta,
            "summary":           None,
            "is_conversational": False,
            "meta":              {"intent": "flatten_trend", "percentage": 0, "duration": 4},
        }

    if _is_remove_outliers(question):
        scenario_data = _apply_remove_outliers(baseline_forecast, historical)
        delta = int(sum(d["scenario"] - d["baseline"] for d in scenario_data))
        return {
            "scenario_data":     scenario_data,
            "delta":             delta,
            "summary":           None,
            "is_conversational": False,
            "meta":              {"intent": "remove_outliers", "percentage": 0, "duration": 4},
        }

    # ── Standard increase / decrease branch ──────────────────────────────────
    pct      = extract_percentage(question)
    intent   = detect_intent(question)
    duration = extract_duration(question)

    if intent == "increase":
        multiplier = 1.0 + pct
    elif intent == "decrease":
        multiplier = max(0.0, 1.0 - pct)
    else:
        multiplier = 1.0

    scenario_data = []
    for i, pt in enumerate(baseline_forecast):
        base = max(0.0, float(pt["yhat"]))
        scenario_val = base * multiplier if i < duration else base
        scenario_data.append({
            "week":     f"Week {i+1}",
            "baseline": round(base, 2),
            "scenario": round(scenario_val, 2),
        })

    delta = int(sum(d["scenario"] - d["baseline"] for d in scenario_data))

    return {
        "scenario_data":     scenario_data,
        "delta":             delta,
        "summary":           None,
        "is_conversational": False,
        "meta": {
            "intent":     intent,
            "percentage": pct,
            "duration":   duration,
        },
    }