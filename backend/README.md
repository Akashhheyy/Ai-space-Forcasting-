# Space Radiation Forecasting System

AI-Based Space Radiation Forecasting System for Geostationary Satellites — an Intelligent Satellite Radiation Early Warning and Decision Support System built for hackathon demonstration.

## Features

- **Real-time data ingestion** from NOAA SWPC APIs (electron flux, proton flux, solar wind speed, Kp index, Dst index)
- **PostgreSQL storage** with SQLAlchemy ORM and Alembic migrations
- **ML pipeline** with lag features, moving averages, rolling statistics, and rate-of-change indicators
- **Multi-horizon forecasting** at 30-minute, 6-hour, and 12-hour horizons
- **Model comparison**: Linear Regression, Random Forest, XGBoost (auto-selects best by RMSE)
- **Risk scoring** with LOW / MEDIUM / HIGH classification for GEO satellites
- **Anomaly detection** via rolling z-score analysis on radiation spikes
- **Background jobs** (APScheduler): data fetch every 5 min, predictions every 5 min, daily retraining
- **REST API** with auto-generated OpenAPI docs at `/docs`

## Project Structure

```
app/
├── api/routes/          # REST endpoints
├── database/            # SQLAlchemy engine & session
├── models/              # DB models & Pydantic schemas
├── services/            # Business logic
├── machine_learning/    # Feature engineering, training, prediction
├── scheduler/           # APScheduler background jobs
└── utilities/           # Config, logging, exceptions
alembic/                 # Database migrations
artifacts/models/        # Saved ML model artifacts
```

## Quick Start

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Configure environment

```bash
cp .env.example .env
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run migrations

```bash
alembic upgrade head
```

### 5. Start the API

```bash
python run.py
```

Open **http://localhost:8000/docs** for interactive API documentation.

### Full Docker deployment

```bash
docker compose up --build
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | System health check |
| `/api/v1/data/historical` | GET | Historical space weather observations |
| `/api/v1/data/current` | GET | Current radiation conditions |
| `/api/v1/forecasts/latest` | GET | Latest multi-horizon forecasts |
| `/api/v1/forecasts/history` | GET | Forecast history |
| `/api/v1/risk/current` | GET | Current satellite risk assessment |
| `/api/v1/risk/assess` | POST | Trigger new risk assessment |
| `/api/v1/risk/history` | GET | Risk assessment history |
| `/api/v1/anomalies/` | GET | Anomaly reports |
| `/api/v1/anomalies/detect` | POST | Trigger anomaly detection |
| `/api/v1/models/performance` | GET | Best model metrics per horizon |
| `/api/v1/models/train` | POST | Manually trigger model training |
| `/api/v1/models/metrics` | GET | All model evaluation metrics |

## ML Pipeline

1. **Data collection** — NOAA GOES electron/proton flux + solar wind + geomagnetic indices
2. **Preprocessing** — deduplication, outlier clipping, forward-fill for sparse indices
3. **Feature engineering** — 5/15/30/60/120-min lags, rolling MA/std, rate-of-change
4. **Target creation** — shifted radiation_level for 30m / 6h / 12h horizons
5. **Training** — 80/20 split, evaluate MAE / RMSE / R², save best model
6. **Inference** — generate forecasts, risk scores, anomaly flags

## Risk Classification

| Level | Score Range | Action |
|-------|-------------|--------|
| LOW | 0–35 | Normal operations |
| MEDIUM | 35–65 | Defer non-critical ops, enable monitoring |
| HIGH | 65–100 | Safe-mode protocols, notify mission control |

## Environment Variables

See `.env.example` for all configuration options including database URL, scheduler intervals, NOAA API endpoints, and risk thresholds.

## Hackathon Demo Flow

1. Start the system → initial NOAA data fetch runs automatically
2. Visit `/docs` → explore live API endpoints
3. `GET /api/v1/data/current` → show real-time radiation readings
4. `GET /api/v1/forecasts/latest` → show AI predictions for 30m, 6h, 12h
5. `GET /api/v1/risk/current` → show satellite risk score and recommendation
6. `POST /api/v1/models/train` → demonstrate model training with metric comparison
7. `GET /api/v1/models/performance` → show MAE, RMSE, R² for all models

## License

MIT — Built for hackathon demonstration purposes.
