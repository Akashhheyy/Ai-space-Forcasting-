export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface HealthResponse {
  status: string;
  version: string;
  database: string;
  scheduler: string;
  last_data_fetch: string | null;
}

export interface CurrentConditionsResponse {
  timestamp: string;
  electron_flux: number;
  proton_flux: number;
  solar_wind_speed: number | null;
  kp_index: number | null;
  dst_index: number | null;
  radiation_level: number;
  risk_score: number | null;
  risk_level: RiskLevel | null;
}

export interface SpaceWeatherResponse {
  id: number;
  timestamp: string;
  electron_flux: number;
  proton_flux: number;
  solar_wind_speed: number | null;
  kp_index: number | null;
  dst_index: number | null;
  radiation_level: number;
  created_at: string;
}

export interface SpaceWeatherListResponse {
  total: number;
  items: SpaceWeatherResponse[];
}

export interface ForecastResponse {
  id: number;
  generated_at: string;
  forecast_for: string;
  horizon_minutes: number;
  predicted_radiation: number;
  model_name: string;
  confidence_score: number | null;
}

export interface ForecastListResponse {
  generated_at: string;
  forecasts: ForecastResponse[];
}

export interface RiskAssessmentResponse {
  id: number;
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel;
  electron_contribution: number;
  proton_contribution: number;
  geomagnetic_contribution: number;
  forecast_contribution: number;
  recommendation: string;
  created_at: string;
}

export interface AnomalyResponse {
  id: number;
  timestamp: string;
  metric: string;
  observed_value: number;
  expected_value: number;
  z_score: number;
  severity: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
}

export interface ModelMetricResponse {
  id: number;
  model_name: string;
  horizon_minutes: number;
  mae: number;
  rmse: number;
  r2_score: number;
  training_samples: number;
  is_best: boolean;
  artifact_path: string;
  trained_at: string;
}

export interface ModelPerformanceResponse {
  best_models: ModelMetricResponse[];
  all_metrics: ModelMetricResponse[];
}

export interface ApiErrorBody {
  detail?: string;
  error_type?: string;
}

export class ApiError extends Error {
  status: number;
  errorType?: string;

  constructor(message: string, status: number, errorType?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorType = errorType;
  }
}
