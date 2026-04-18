"""
services/gemini_service.py
All AI interactions — Gemini primary, Groq fallback.

Three use cases:
    1. explain_forecast  — 2-sentence plain-English forecast summary
    2. explain_anomaly   — cause + action for a single anomaly
    3. answer_scenario   — full multi-turn chatbot with context memory

Fallback chain per call:
    Gemini (_safe_generate) → Groq (_safe_generate_groq) → static fallback
"""

import json
import logging
from typing import Any

import google.generativeai as genai
from groq import Groq

from config import config

logger = logging.getLogger(__name__)

# ── Initialise Gemini ─────────────────────────────────────────────────────────

if config.GEMINI_API_KEY:
    genai.configure(api_key=config.GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY not set — Gemini calls will be skipped.")

# ── Initialise Groq ───────────────────────────────────────────────────────────

if config.GROQ_API_KEY:
    _groq_client = Groq(api_key=config.GROQ_API_KEY)
else:
    _groq_client = None
    logger.warning("GROQ_API_KEY not set — Groq fallback will be skipped.")


# ── Low-level helpers ─────────────────────────────────────────────────────────

def _get_gemini_model() -> genai.GenerativeModel:
    return genai.GenerativeModel(config.GEMINI_MODEL)


def _safe_generate(prompt: str) -> str | None:
    """Try Gemini first, then Groq. Returns text or None if both fail."""
    # 1. Try Gemini
    if config.GEMINI_API_KEY:
        try:
            model = _get_gemini_model()
            response = model.generate_content(prompt)
            text = getattr(response, "text", None)
            if text and text.strip():
                logger.info("Gemini responded OK (%d chars)", len(text))
                return text.strip()
            raise ValueError("Empty response from Gemini")
        except Exception as exc:
            logger.warning("Gemini call failed, trying Groq fallback: %s", exc)

    # 2. Try Groq fallback
    return _safe_generate_groq(prompt)


def _safe_generate_groq(prompt: str, system: str | None = None) -> str | None:
    """Call Groq directly. Returns text or None on failure."""
    if not _groq_client:
        logger.error("Groq client not initialised — no fallback available.")
        return None
    try:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        else:
            messages.append({
                "role": "system",
                "content": "You are a helpful business analyst. Be concise and specific.",
            })
        messages.append({"role": "user", "content": prompt})

        response = _groq_client.chat.completions.create(
            model=config.GROQ_MODEL,
            messages=messages,
            temperature=0.4,
            max_tokens=400,
        )
        text = response.choices[0].message.content.strip()
        if text:
            logger.info("Groq fallback responded OK (%d chars)", len(text))
            return text
        raise ValueError("Empty response from Groq")
    except Exception as exc:
        logger.error("Groq fallback also failed: %s", exc)
        return None


# ── 1. Forecast explanation ───────────────────────────────────────────────────

def explain_forecast(
    trend_pct: float,
    peak_week: str,
    confidence_range: int,
    vs_baseline_pct: float,
    periods: int = 4,
    forecast_values: list | None = None,
    mape: float | None = None,
    beats_baseline: bool | None = None,
    confidence_label: str = "Medium",
) -> str:
    direction    = "growth" if trend_pct >= 0 else "decline"
    vs_direction = "above"  if vs_baseline_pct >= 0 else "below"

    forecast_table = ""
    if forecast_values:
        rows = [
            f"  Week {i+1}: {pt.get('yhat', 0):.0f} "
            f"(range {pt.get('yhat_lower', 0):.0f}–{pt.get('yhat_upper', 0):.0f})"
            for i, pt in enumerate(forecast_values)
        ]
        forecast_table = "\n" + "\n".join(rows)

    accuracy_line = ""
    if mape is not None:
        beats_str = "yes" if beats_baseline else "no"
        accuracy_line = (
            f"\nModel accuracy (hold-out MAPE): {mape}%  |  "
            f"Beats naive baseline: {beats_str}"
        )

    prompt = f"""You are a concise business analyst explaining a forecast to a non-technical manager.
Write EXACTLY 2 short sentences. Be specific — reference the actual numbers below.
Do NOT use jargon. Do NOT mention Prophet, MAPE, or statistical terms.

Forecast summary:
  Horizon: {periods} weeks
  Trend: {abs(trend_pct)}% {direction}
  Peak: {peak_week}
  Confidence band: ±{confidence_range} units on average
  Vs moving-average baseline: {abs(vs_baseline_pct)}% {vs_direction}
  Forecast confidence: {confidence_label}{accuracy_line}

Week-by-week forecast:{forecast_table if forecast_table else " not provided"}

Write 2 sentences: what to expect, and one practical implication."""

    text = _safe_generate(prompt)
    if text:
        return text

    # Static fallback
    accuracy_note = f" The model's hold-out error was {mape}%." if mape else ""
    return (
        f"The forecast shows a {abs(trend_pct)}% {direction} over the next "
        f"{periods} weeks, peaking in {peak_week}. "
        f"This is {abs(vs_baseline_pct)}% {vs_direction} the historical baseline "
        f"with an average uncertainty range of ±{confidence_range} units.{accuracy_note}"
    )


# ── 2. Anomaly explanation ────────────────────────────────────────────────────

def explain_anomaly(
    date: str,
    value: float,
    deviation: float,
    severity: str,
    expected_low: float | None = None,
    expected_high: float | None = None,
    rolling_mean: float | None = None,
) -> dict[str, str]:
    direction = "above" if deviation >= 0 else "below"

    range_line = (
        f"\n  Normal expected range: {expected_low:.1f} – {expected_high:.1f}"
        if expected_low is not None and expected_high is not None else ""
    )
    mean_line = (
        f"\n  Rolling mean at this date: {rolling_mean:.1f}"
        if rolling_mean is not None else ""
    )

    prompt = f"""You are a data analyst investigating a time-series anomaly.
Return ONLY valid JSON — no markdown fences, no extra text.

Anomaly details:
  Date: {date}
  Observed value: {value:.1f}
  Severity: {severity}
  Deviation: {abs(deviation):.2f} standard deviations {direction} normal{range_line}{mean_line}

Respond with exactly:
{{
  "cause": "One sentence: most likely business reason.",
  "action": "One sentence: the single most important next step.",
  "urgency": "immediate | this week | monitor"
}}"""

    text = _safe_generate(prompt)

    if text:
        cleaned = text.replace("```json", "").replace("```", "").strip()
        try:
            parsed = json.loads(cleaned)
            return {
                "cause":   str(parsed.get("cause",   _fallback_cause(deviation))),
                "action":  str(parsed.get("action",  _fallback_action(deviation))),
                "urgency": str(parsed.get("urgency", "monitor")),
            }
        except json.JSONDecodeError:
            logger.warning("Anomaly JSON parse failed — using static fallback")

    return {
        "cause":   _fallback_cause(deviation),
        "action":  _fallback_action(deviation),
        "urgency": "immediate" if severity == "HIGH" else "monitor",
    }


# ── 3. Scenario chatbot (multi-turn with context memory) ──────────────────────

def answer_scenario(
    baseline_forecast: list[dict[str, Any]],
    question: str,
    history: list[dict[str, str]] | None = None,
) -> dict[str, str]:
    """
    Multi-turn scenario chatbot. Tries Gemini first, Groq second.

    Args:
        baseline_forecast: List of { date, yhat } dicts from Prophet.
        question:          The user's latest message.
        history:           Full conversation history —
                           list of { role: "user"|"assistant", content: str }

    Returns:
        { summary: str } — Chart data (scenario_data, delta) comes from
        apply_scenario() in the route, not from this function.
    """
    history = history or []

    # Build baseline text block
    baseline_lines = []
    total_baseline = 0.0
    baseline_values: dict[str, float] = {}
    for i, pt in enumerate(baseline_forecast):
        yhat = float(pt.get("yhat", 0))
        total_baseline += yhat
        baseline_values[f"week{i+1}"] = round(yhat, 0)
        baseline_lines.append(
            f"  Week {i+1} ({pt.get('date', '')}): {yhat:.0f} units"
        )
    baseline_text = "\n".join(baseline_lines)

    # History block (shared by both AI paths)
    history_text = ""
    if history:
        recent = history[-6:]
        turns = [
            f"{m.get('role', 'user').capitalize()}: {m.get('content', '')}"
            for m in recent
        ]
        history_text = "\nConversation so far:\n" + "\n".join(turns) + "\n"

    # ── Try Gemini (plain-text summary only, matches original Gemini behaviour) ─
    gemini_text = None
    if config.GEMINI_API_KEY:
        gemini_prompt = f"""You are a business forecasting analyst explaining a what-if scenario.
Write EXACTLY 2 clear sentences. Reference the actual baseline numbers. Be practical.

Baseline forecast for the next {len(baseline_forecast)} weeks:
{baseline_text}
Total baseline: {total_baseline:.0f} units
{history_text}
User's scenario: "{question}"

2 sentences: what changes, and what it means for the business."""

        try:
            model = _get_gemini_model()
            response = model.generate_content(gemini_prompt)
            text = getattr(response, "text", None)
            if text and text.strip():
                gemini_text = text.strip()
                logger.info("Gemini scenario OK (%d chars)", len(gemini_text))
        except Exception as exc:
            logger.warning("Gemini scenario failed, trying Groq: %s", exc)

    if gemini_text:
        # Gemini only returns a summary — chart data comes from apply_scenario()
        return {"summary": gemini_text}

    # ── Groq fallback — returns structured JSON with adjusted weekly values ────
    if _groq_client:
        system_prompt = f"""You are a friendly expert scenario forecasting analyst helping a business manager model what-if scenarios.

The baseline 4-week sales forecast is:
{baseline_text}

Baseline values for reference:
  week1={baseline_values.get('week1', 0)}, week2={baseline_values.get('week2', 0)}, week3={baseline_values.get('week3', 0)}, week4={baseline_values.get('week4', 0)}

STRICT RULES:
1. If the user sends a greeting or a non-scenario message, respond in a friendly way. Return the exact baseline values for week1-4 and set delta to 0.
2. If the user describes a business scenario (marketing push, demand drop, price change, etc.), calculate realistic adjusted weekly values.
3. Remember all previous turns. If the user says "now add more" or "what if we also do X", apply ON TOP of the previous scenario values.
4. ALWAYS respond with ONLY this JSON — no markdown, no backticks, no text before or after:

{{
  "week1": <integer>,
  "week2": <integer>,
  "week3": <integer>,
  "week4": <integer>,
  "summary": "2-3 sentences explaining projected impact.",
  "delta": <total unit difference vs baseline as integer>
}}"""

        messages = [{"role": "system", "content": system_prompt}]
        for turn in history[-10:]:
            messages.append({
                "role": "assistant" if turn["role"] == "assistant" else "user",
                "content": turn["content"],
            })
        messages.append({"role": "user", "content": question})

        try:
            response = _groq_client.chat.completions.create(
                model=config.GROQ_MODEL,
                messages=messages,
                temperature=0.5,
                max_tokens=400,
            )
            text = response.choices[0].message.content.strip()
            text = text.replace("```json", "").replace("```", "").strip()
            start, end = text.find("{"), text.rfind("}") + 1
            if start != -1 and end > start:
                text = text[start:end]

            parsed = json.loads(text)

            summary = parsed.get("summary", _fallback_scenario_summary(0))

            logger.info(
                "Groq scenario OK: summary=%d chars, history_turns=%d",
                len(summary), len(history)
            )
            return {"summary": summary}

        except Exception as exc:
            logger.error("Groq scenario also failed: %s", exc)

    # ── Static fallback ───────────────────────────────────────────────────────
    return _fallback_scenario(baseline_forecast)


# ── Fallback helpers ──────────────────────────────────────────────────────────

def _fallback_cause(deviation: float) -> str:
    return (
        "Possible spike due to a promotion, demand surge, or data entry issue."
        if deviation > 0 else
        "Possible drop due to low demand, supply disruption, or missing data."
    )


def _fallback_action(deviation: float) -> str:
    return (
        "Review marketing campaigns, inventory levels, and recent order data."
        if deviation > 0 else
        "Check supply chain status, demand signals, and any recent operational changes."
    )


def _fallback_scenario(baseline_forecast: list[dict[str, Any]]) -> dict[str, str]:
    """Return a static summary when both AI providers are unavailable."""
    # Chart data comes from apply_scenario() in the route, not from here.
    return {"summary": _fallback_scenario_summary(0)}


def _fallback_scenario_summary(delta: int) -> str:
    direction = "increase" if delta >= 0 else "decrease"
    return (
        f"The scenario projects a {abs(delta):,}-unit {direction} "
        f"compared to the baseline over 4 weeks. "
        "Monitor weekly performance to validate this projection."
    )