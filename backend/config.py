"""
config.py
Loads all environment variables from .env in one place.
Every other module imports from here — no dotenv calls elsewhere.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── AI Keys ──────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY:   str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL:     str = "llama-3.1-8b-instant"

    # ── Gemini model ──────────────────────────────────────────────────────────
    # gemini-2.0-flash  →  latest stable free-tier model (replaces 1.5-pro-latest)
    # If this ever breaks, check: https://ai.google.dev/gemini-api/docs/models
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # ── Flask ─────────────────────────────────────────────────────────────────
    SECRET_KEY:   str  = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")
    DEBUG:        bool = os.getenv("FLASK_ENV", "development") == "development"

    # ── CORS ──────────────────────────────────────────────────────────────────
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # ── Forecasting defaults ──────────────────────────────────────────────────
    DEFAULT_FORECAST_PERIODS: int = 4      # weeks ahead
    MOVING_AVERAGE_WINDOW:    int = 4      # weeks for baseline MA

    # ── Anomaly detection thresholds ──────────────────────────────────────────
    ANOMALY_ROLLING_WINDOW:    int   = 8    # weeks — larger window = less noise
    ANOMALY_HIGH_THRESHOLD:    float = 3.0  # sigma for HIGH severity
    ANOMALY_MEDIUM_THRESHOLD:  float = 2.5  # sigma for MEDIUM (raised from 2.0)


config = Config()