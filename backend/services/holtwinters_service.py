# """
# services/holtwinters_service.py
# Holt-Winters forecasting helper used to ensemble with Prophet.
# """

# import pandas as pd
# from statsmodels.tsa.holtwinters import ExponentialSmoothing


# def run_holtwinters(df: pd.DataFrame, periods: int) -> list[dict]:
#     try:
#         if df.empty or periods <= 0:
#             return []

#         data = df.copy()
#         data["ds"] = pd.to_datetime(data["ds"])
#         data["y"] = pd.to_numeric(data["y"], errors="coerce")
#         data = data.dropna(subset=["ds", "y"]).sort_values("ds").reset_index(drop=True)

#         if len(data) < 2:
#             return []

#         avg_gap_days = (
#             data["ds"].sort_values().diff().dropna().dt.total_seconds().mean() / 86400
#         )
#         avg_gap_days = float(avg_gap_days) if pd.notna(avg_gap_days) else 7.0

#         if avg_gap_days < 10:
#             freq = "D"
#             seasonal_periods = 365
#         elif avg_gap_days < 20:
#             freq = "W"
#             seasonal_periods = 52
#         else:
#             freq = "MS"
#             seasonal_periods = 12

#         seasonal = "add" if len(data) >= seasonal_periods * 2 else None

#         model = ExponentialSmoothing(
#             data["y"].astype(float),
#             trend="add",
#             seasonal=seasonal,
#             seasonal_periods=seasonal_periods if seasonal else None,
#             initialization_method="estimated",
#         )
#         fitted = model.fit(optimized=True)
#         forecast_values = fitted.forecast(periods)

#         future_dates = pd.date_range(
#             start=data["ds"].iloc[-1],
#             periods=periods + 1,
#             freq=freq,
#         )[1:]

#         return [
#             {
#                 "ds": date.strftime("%Y-%m-%d"),
#                 "hw_yhat": round(max(float(value), 0), 2),
#             }
#             for date, value in zip(future_dates, forecast_values)
#         ]
#     except Exception:
#         return []
