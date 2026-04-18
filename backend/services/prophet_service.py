"""
services/prophet_service.py
Runs Facebook Prophet to produce a forecast with uncertainty intervals.
Fully adaptive — all hyperparameters are auto-detected from the data.
"""

import logging
import warnings

import numpy as np
import pandas as pd
from prophet import Prophet

from config import config

logger = logging.getLogger(__name__)

warnings.filterwarnings("ignore", category=FutureWarning)
logging.getLogger("prophet").setLevel(logging.WARNING)
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)


# ─────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────

def run_forecast(df: pd.DataFrame, periods: int | None = None) -> dict:
    if periods is None:
        periods = config.DEFAULT_FORECAST_PERIODS

    logger.info(
        "Running Prophet forecast: %d historical rows, %d periods ahead",
        len(df), periods
    )

    df    = _prepare(df)
    model = _build_model(df)

    try:
        model.fit(df)
    except Exception as exc:
        logger.error("Prophet model fitting failed: %s", exc)
        raise RuntimeError(f"Forecast model failed to fit: {exc}") from exc

    try:
        future = model.make_future_dataframe(periods=periods, freq="W")
        raw    = model.predict(future)
    except Exception as exc:
        logger.error("Prophet prediction failed: %s", exc)
        raise RuntimeError(f"Forecast model failed to predict: {exc}") from exc

    cutoff        = df["ds"].max()
    hist_raw      = raw[raw["ds"] <= cutoff].copy()
    fore_raw      = raw[raw["ds"] >  cutoff].copy()
    actual_lookup = dict(zip(df["ds"], df["y"]))

    historical = [
        {
            "date":  row["ds"].strftime("%Y-%m-%d"),
            "value": round(float(actual_lookup[row["ds"]]), 2)
                     if row["ds"] in actual_lookup else None,
        }
        for _, row in hist_raw.iterrows()
    ]

    forecast = [
        {
            "date":       row["ds"].strftime("%Y-%m-%d"),
            "yhat":       round(max(float(row["yhat"]),       0), 2),
            "yhat_lower": round(max(float(row["yhat_lower"]), 0), 2),
            "yhat_upper": round(max(float(row["yhat_upper"]), 0), 2),
        }
        for _, row in fore_raw.iterrows()
    ]

    summary = _compute_summary(df, forecast)

    logger.info(
        "Forecast complete — periods: %d | trend: %.1f%% | vs baseline: %.1f%%",
        len(forecast),
        summary.get("trend_pct", 0),
        summary.get("vs_baseline_pct", 0),
    )

    return {"historical": historical, "forecast": forecast, "summary": summary}


# ─────────────────────────────────────────────
#  Data preparation
# ─────────────────────────────────────────────

def _prepare(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and validate input before fitting.
      - Coerces types
      - Drops NaN / negative rows
      - Removes duplicate dates (keeps last)
      - Sorts ascending (Prophet requires this)
      - Caps extreme outliers at ±3σ so one bad week
        doesn't warp the whole trend line
    """
    df = df.copy()
    df["ds"] = pd.to_datetime(df["ds"])
    df["y"]  = pd.to_numeric(df["y"], errors="coerce")

    df = df.dropna(subset=["ds", "y"])
    df = df[df["y"] >= 0]
    df = df.drop_duplicates(subset="ds", keep="last")
    df = df.sort_values("ds").reset_index(drop=True)

    # Outlier cap
    mean, std = df["y"].mean(), df["y"].std()
    if std > 0:
        df["y"] = df["y"].clip(lower=mean - 3 * std, upper=mean + 3 * std)

    return df


# ─────────────────────────────────────────────
#  Adaptive model builder
# ─────────────────────────────────────────────

def _build_model(df: pd.DataFrame) -> Prophet:
    """
    Auto-detects every hyperparameter from the data.
    No manual tuning needed when the dataset changes.
    """
    n      = len(df)
    values = df["y"].values

    # ── 1. Changepoint count ───────────────────────────────────────────────
    # 1 changepoint per 8 weeks, capped by dataset size.
    n_changepoints = int(np.clip(n // 8, 3, 25))

    # ── 2. Changepoint range ───────────────────────────────────────────────
    # How far into the series to look for trend shifts.
    # Pull back on short series to avoid fitting end-of-series noise.
    if n < 52:
        changepoint_range = 0.75
    elif n < 104:
        changepoint_range = 0.85
    else:
        changepoint_range = 0.90

    # ── 3. Changepoint prior (trend flexibility) ───────────────────────────
    # Measure trend strength via normalised linear regression slope.
    # Strong upward/downward trend → tighter prior (trust the trend).
    # Flat / noisy → looser prior (let Prophet adapt more freely).
    x              = np.arange(n, dtype=float)
    slope          = float(np.polyfit(x, values, 1)[0])
    trend_strength = abs(slope) / (float(np.mean(values)) + 1e-9)

    if trend_strength > 0.02:       # strong trend
        changepoint_prior = 0.03
    elif trend_strength > 0.005:    # moderate trend
        changepoint_prior = 0.05
    else:                           # flat / noisy
        changepoint_prior = 0.10

    # ── 4. Seasonality mode ────────────────────────────────────────────────
    # Multiplicative → seasonal swings grow with the level (e.g. retail).
    # Additive       → fixed-size swings regardless of level (e.g. utilities).
    # Detect by comparing coefficient of variation in first vs second half.
    mid         = max(n // 2, 1)
    cv_first    = values[:mid].std()  / (values[:mid].mean()  + 1e-9)
    cv_second   = values[mid:].std()  / (values[mid:].mean()  + 1e-9)
    seasonality_mode = (
        "multiplicative" if cv_second > cv_first * 1.15 else "additive"
    )

    # ── 5. Seasonality prior ───────────────────────────────────────────────
    # Scale to how seasonal the data actually is, measured via autocorrelation.
    def _autocorr(arr: np.ndarray, lag: int) -> float:
        if len(arr) <= lag:
            return 0.0
        return float(pd.Series(arr).autocorr(lag=lag))

    annual_ac  = abs(_autocorr(values, 52))
    monthly_ac = abs(_autocorr(values, 4))
    seasonality_strength = max(annual_ac, monthly_ac)
    seasonality_prior    = float(np.clip(seasonality_strength * 20, 5.0, 20.0))

    # ── 6. Yearly seasonality ──────────────────────────────────────────────
    # Only add if we have 1.5+ years AND a detectable annual pattern.
    yearly_seasonality = bool(n >= 78 and annual_ac > 0.2)

    # ── 7. Uncertainty samples ─────────────────────────────────────────────
    # More data → smoother bands are worth the extra compute.
    uncertainty_samples = 500 if n < 104 else 800

    logger.info(
        "Auto Prophet config — n=%d | cp=%d | cp_range=%.2f | cp_prior=%.3f"
        " | mode=%s | yearly=%s | seas_prior=%.1f | samples=%d",
        n, n_changepoints, changepoint_range, changepoint_prior,
        seasonality_mode, yearly_seasonality, seasonality_prior,
        uncertainty_samples,
    )

    model = Prophet(
        interval_width          = 0.8,
        uncertainty_samples     = uncertainty_samples,
        changepoint_prior_scale = changepoint_prior,
        changepoint_range       = changepoint_range,
        seasonality_prior_scale = seasonality_prior,
        seasonality_mode        = seasonality_mode,
        weekly_seasonality      = False,
        yearly_seasonality      = yearly_seasonality,
        daily_seasonality       = False,
        n_changepoints          = n_changepoints,
    )

    # ── 8. Extra seasonalities ─────────────────────────────────────────────
    if n >= 26:    # 6+ months → monthly pattern detectable
        model.add_seasonality(name="monthly", period=30.5, fourier_order=5)

    if n >= 104:   # 2+ years → quarterly pattern detectable
        model.add_seasonality(name="quarterly", period=91.25, fourier_order=7)

    return model


# ─────────────────────────────────────────────
#  Summary computation
# ─────────────────────────────────────────────

def _compute_summary(df: pd.DataFrame, forecast: list[dict]) -> dict:
    if not forecast:
        return {}

    yhats  = [f["yhat"]       for f in forecast]
    lowers = [f["yhat_lower"] for f in forecast]
    uppers = [f["yhat_upper"] for f in forecast]

    last_actual   = float(df["y"].iloc[-1])
    mean_forecast = float(np.mean(yhats))

    # Trend %: last actual → mean of forecast window
    trend_pct = (
        round(((mean_forecast - last_actual) / last_actual) * 100, 1)
        if last_actual != 0 else 0.0
    )

    # Peak week
    peak_idx  = int(np.argmax(yhats))
    peak_week = f"Week {peak_idx + 1}"

    # Confidence range: average p10–p90 band width
    avg_range = round(float(np.mean([u - l for u, l in zip(uppers, lowers)])), 0)

    # vs baseline: rolling mean of last N actuals
    window          = min(config.MOVING_AVERAGE_WINDOW, len(df))
    baseline_val    = float(df["y"].tail(window).mean())
    vs_baseline_pct = (
        round(((mean_forecast - baseline_val) / baseline_val) * 100, 1)
        if baseline_val != 0 else 0.0
    )

    # Forecast confidence signal:
    # Low CV  (<5%)  → tight, reliable forecast
    # High CV (>15%) → wide uncertainty, treat with caution
    cv = (
        round(float(np.std(yhats) / mean_forecast * 100), 1)
        if mean_forecast != 0 else 0.0
    )

    return {
        "trend_pct":        trend_pct,
        "peak_week":        peak_week,
        "confidence_range": int(avg_range),
        "vs_baseline_pct":  vs_baseline_pct,
        "forecast_cv":      cv,
    }