# ForecastIQ — AI Predictive Forecasting Platform

Upload any time-series CSV and instantly get Prophet-powered forecasts, rolling z-score anomaly detection, and Gemini-driven scenario analysis — all explained in plain English. No data science required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| UI Components | shadcn/ui, Radix UI, Recharts |
| Backend | Python 3.11+, Flask 3, Flask-CORS |
| Forecasting | Facebook Prophet (local, no API needed) |
| Anomaly Detection | Rolling z-score via pandas/numpy |
| AI Insights | Google Gemini 1.5 Flash |
| Data Validation | Marshmallow (backend), TypeScript (frontend) |

---

## Project Structure

```
forecastiq/
├── frontend/                  # Next.js 15 application
│   ├── app/
│   │   ├── layout.tsx         # Root layout with fonts + analytics
│   │   ├── page.tsx           # Landing page
│   │   └── app/
│   │       ├── layout.tsx     # App shell: DataProvider + Sidebar + MobileNav
│   │       ├── page.tsx       # Forecast tab (Prophet results)
│   │       ├── anomalies/     # Anomaly detection tab
│   │       ├── scenario/      # Scenario chat tab
│   │       └── upload/        # CSV upload page
│   ├── components/
│   │   ├── forecastiq/        # App-specific components
│   │   │   ├── charts/        # ForecastChart, AnomalyChart, ScenarioChart
│   │   │   ├── anomaly-card   # Per-anomaly explanation card
│   │   │   ├── csv-upload     # Drag-and-drop CSV parser
│   │   │   ├── data-summary   # Forecast data table
│   │   │   ├── insight-card   # Gemini AI insight display
│   │   │   ├── stat-card      # KPI metric cards
│   │   │   └── scenario-chat  # Multi-turn chat interface
│   │   ├── landing/           # Landing page sections
│   │   └── ui/                # shadcn/ui primitives
│   ├── context/
│   │   └── DataContext.tsx    # Global state: CSV data + all API results
│   ├── lib/
│   │   ├── api.ts             # All fetch calls to Flask backend
│   │   ├── demo-data.ts       # Fallback demo data for UI previews
│   │   └── utils.ts           # Tailwind class merger
│   ├── .env.local             # Local environment variables
│   └── package.json
│
├── backend/                   # Flask Python application
│   ├── app.py                 # Application factory + blueprint registration
│   ├── config.py              # Centralised env var loading
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Backend environment variables
│   ├── routes/
│   │   ├── forecast.py        # POST /api/forecast
│   │   ├── anomalies.py       # POST /api/anomalies
│   │   └── scenario.py        # POST /api/scenario
│   ├── services/
│   │   ├── prophet_service.py # Facebook Prophet wrapper
│   │   ├── anomaly_service.py # Rolling z-score detection
│   │   ├── baseline_service.py# Moving average baseline
│   │   └── gemini_service.py  # Google Gemini AI integration
│   ├── utils/
│   │   └── csv_parser.py      # CSV validation + pandas DataFrame builder
│   └── tests/                 # Pytest test suite
│
└── README.md
```

---

## Setup Instructions

### Prerequisites

- **Node.js** 18+ and **npm** (or pnpm)
- **Python** 3.11+
- **Google Gemini API key** — free at https://aistudio.google.com/app/apikey

> The app works without a Gemini key — AI insights fall back to rule-based text. Prophet forecasting and anomaly detection are fully local.

---

### 1. Backend Setup

```bash
cd forecastiq/backend

# Create and activate virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and set your GEMINI_API_KEY

# Start the Flask backend
python app.py
# → Running on http://localhost:5000
```

**Verify backend is running:**
```bash
curl http://localhost:5000/health
# {"status": "ok", "version": "1.0.0"}
```

---

### 2. Frontend Setup

```bash
cd forecastiq/frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.local.example .env.local
# Edit .env.local — default value works if backend runs on port 5000

# Start the Next.js development server
npm run dev
# → Running on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

### 3. Using the App

1. **Landing page** — click "Get Started" or navigate to `/app`
2. **Demo mode** — the app auto-loads `demo_sales.csv` (52 weeks of synthetic data). Click **Run Analysis** on any tab.
3. **Your own data** — go to `/app/upload`, drag a CSV file, select date and value columns, click **Use this data**. The forecast runs automatically.
4. **Scenario chat** — on the Scenario tab, ask questions like:
   - *"What if I run a 20% marketing push for 2 weeks?"*
   - *"What happens if demand drops 15%?"*

---

## API Endpoints

All endpoints live under `http://localhost:5000`.

### `GET /health`
Health check.
```json
{ "status": "ok", "version": "1.0.0" }
```

---

### `POST /api/forecast`
Run a 4-week Prophet forecast.

**Request body:**
```json
{
  "data": [{"date": "2024-01-01", "value": "3500"}, ...],
  "date_column": "date",
  "value_column": "value",
  "periods": 4,
  "use_demo": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "historical": [{ "date": "2024-01-01", "value": 3500, "baseline": 3450 }],
    "forecast":   [{ "date": "2024-02-05", "yhat": 4100, "yhat_lower": 3800, "yhat_upper": 4400, "baseline": 3800 }],
    "summary":    { "trend_pct": 8.5, "peak_week": "Week 3", "confidence_range": 600, "vs_baseline_pct": 5.2 },
    "insight":    "Your sales are forecast to grow 8.5% over the next 4 weeks..."
  },
  "error": null
}
```

---

### `POST /api/anomalies`
Detect anomalies using rolling z-score (±2σ threshold).

**Request body:**
```json
{
  "data": [...],
  "date_column": "date",
  "value_column": "value",
  "use_demo": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chart_data": [{ "date": "...", "value": 3500, "rollingMean": 3400, "upperBand": 3900, "lowerBand": 2900, "isAnomaly": false, "anomalySeverity": null, "deviation": 0.4 }],
    "anomalies":  [{ "date": "2024-04-15", "value": 6200, "severity": "HIGH", "deviation": 3.8, "cause": "...", "action": "..." }],
    "stats":      { "total": 3, "high": 1, "medium": 2 }
  },
  "error": null
}
```

---

### `POST /api/scenario`
Model a business scenario with Gemini AI.

**Request body:**
```json
{
  "question": "What if I run a 20% discount for 2 weeks?",
  "baseline_forecast": [{ "date": "...", "yhat": 4100 }, ...],
  "history": [{ "role": "user", "content": "..." }, ...],
  "use_demo": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scenario_data": [{ "week": "Week 1", "baseline": 4100, "scenario": 4920 }],
    "summary": "The 20% discount is projected to increase units by 2,800 over 4 weeks...",
    "delta": 2800
  },
  "error": null
}
```

---

## CSV Format Requirements

| Requirement | Details |
|---|---|
| Format | `.csv` with headers in first row |
| Minimum rows | 8 valid data points (after cleaning) |
| Date column | Any parseable date format (YYYY-MM-DD recommended) |
| Value column | Numeric values (integers or decimals) |
| Frequency | Weekly data recommended; daily also works |

**Example CSV:**
```csv
date,sales
2023-01-02,3421
2023-01-09,3689
2023-01-16,3512
...
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | Google Gemini API key for AI insights |
| `FLASK_ENV` | No | `development` or `production` (default: `development`) |
| `FLASK_SECRET_KEY` | Yes (prod) | Random secret string for Flask sessions |
| `FRONTEND_URL` | No | Next.js URL for CORS (default: `http://localhost:3000`) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | Flask backend URL (default: `http://localhost:5000`) |

---

## Troubleshooting

### Backend won't start
- **`ModuleNotFoundError: prophet`** — install with `pip install prophet`. On Apple Silicon Macs, you may need `brew install cmake` first.
- **`ModuleNotFoundError: google.generativeai`** — run `pip install google-generativeai==0.7.2`
- **Port 5000 in use** — change `port=5000` in `app.py` and update `NEXT_PUBLIC_API_URL` in frontend.

### Frontend errors
- **`Cannot find module '@/context/DataContext'`** — ensure the `context/` folder exists at `frontend/context/DataContext.tsx`.
- **`Cannot find module '@/lib/api'`** — ensure `frontend/lib/api.ts` exists.
- **`Network Error` / CORS error in browser console** — check `FRONTEND_URL` in `backend/.env` matches your Next.js URL exactly (including port).

### API returns `{ success: false }`
- **`"Only N valid rows found"`** — your CSV has fewer than 8 clean rows after parsing. Check for blank rows, non-numeric values, or bad dates.
- **`"Date column 'X' not found"`** — the column name in your CSV doesn't match. Use the Upload page column selector to pick the correct columns.
- **Gemini errors** — the app falls back to rule-based text. Set a valid `GEMINI_API_KEY` in `backend/.env` for full AI responses.

### Port conflicts
- Backend defaults to **port 5000**. Frontend defaults to **port 3000**.
- To change: set `port=XXXX` in `backend/app.py` and update `NEXT_PUBLIC_API_URL` in `frontend/.env.local`.

---

## Production Deployment Notes

1. **Backend** — use `gunicorn` instead of Flask's dev server:
   ```bash
   pip install gunicorn
   gunicorn -w 2 -b 0.0.0.0:5000 app:app
   ```
2. **Frontend** — build and serve statically:
   ```bash
   npm run build
   npm start
   ```
3. **CORS** — update `FRONTEND_URL` in `backend/.env` to your production domain.
4. **Secrets** — generate a strong `FLASK_SECRET_KEY` and never commit `.env` to source control.
