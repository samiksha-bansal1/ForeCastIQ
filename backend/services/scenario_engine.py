"""
services/scenario_engine.py
Rule-based scenario engine — fast, deterministic, never fails.

Separates conversational messages (greetings, thanks, etc.)
from actual what-if scenario queries so the chatbot responds naturally
instead of showing a "+0 units projected" card for "hi".
"""

import re
import random
from typing import List, Dict, Any


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
]

_GREETING_REPLIES = [
    'Hey there! Ask me something like "What if I run a 20% marketing push for 2 weeks?" and I\'ll model it against your baseline forecast.',
    'Hello! I can model any what-if scenario for your sales forecast. Try: "What happens if demand drops 15% in week 2?"',
    'Hi! Ready to run some scenarios. You could ask: "What if we boost sales 10% for the next 3 weeks?"',
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
    """Return True if the message is a greeting or small talk, not a scenario."""
    q = question.strip().lower()

    # If it contains any scenario keyword it's always a scenario query
    if any(kw in q for kw in _SCENARIO_KEYWORDS):
        return False

    # Match explicit greeting patterns
    for pattern in _GREETING_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            return True

    # Short messages with no scenario keywords are conversational
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


# ── Scenario parsing helpers ──────────────────────────────────────────────────

def extract_percentage(question: str) -> float:
    match = re.search(r"(\d+(?:\.\d+)?)\s*%", question)
    if not match:
        return 0.0
    return float(match.group(1)) / 100


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
        return min(int(match.group(1)), 4)   # cap at forecast horizon
    return 4   # default: apply to all weeks


# ── Main entry point ──────────────────────────────────────────────────────────

def apply_scenario(
    baseline_forecast: List[Dict[str, Any]],
    question: str,
) -> Dict[str, Any]:
    """
    Main scenario engine.

    Returns a dict with:
        scenario_data     — list of { week, baseline, scenario }
        delta             — total unit change vs baseline (0 for greetings)
        summary           — friendly reply for conversational turns; None for scenarios
        is_conversational — True when the message is a greeting / small talk
        meta              — intent, percentage, duration (None for conversational)
    """

    # ── Conversational / greeting branch ─────────────────────────────────────
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
            "scenario_data":    scenario_data,
            "delta":            0,
            "summary":          _pick_reply(question),
            "is_conversational": True,
            "meta":             None,
        }

    # ── Scenario branch ───────────────────────────────────────────────────────
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
        "scenario_data":    scenario_data,
        "delta":            delta,
        "summary":          None,   # filled by gemini_service in the route
        "is_conversational": False,
        "meta": {
            "intent":     intent,
            "percentage": pct,
            "duration":   duration,
        },
    }