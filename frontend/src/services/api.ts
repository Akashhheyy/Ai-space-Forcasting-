import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import {
  ApiError,
  type AnomalyResponse,
  type ApiErrorBody,
  type CurrentConditionsResponse,
  type ForecastListResponse,
  type ForecastResponse,
  type HealthResponse,
  type ModelPerformanceResponse,
  type RiskAssessmentResponse,
  type SpaceWeatherListResponse,
} from "@/types/api";

const DEFAULT_TIMEOUT = 15_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

export const apiClient = axios.create({
  baseURL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    Accept: "application/json",
  },
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: AxiosError) {
  if (!error.response) return true;
  const status = error.response.status;
  return status >= 500 || status === 408 || status === 429;
}

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  const status = error.response?.status ?? 0;
  const detail = error.response?.data?.detail;
  const message =
    detail ??
    (error.code === "ECONNABORTED"
      ? "Request timed out. Please check your connection and try again."
      : error.message || "Network request failed");

  return new ApiError(message, status, error.response?.data?.error_type);
}

async function requestWithRetry<T>(
  config: AxiosRequestConfig,
  retries = MAX_RETRIES,
): Promise<T> {
  let lastError: AxiosError<ApiErrorBody> | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await apiClient.request<T>(config);
      return response.data;
    } catch (error) {
      if (!axios.isAxiosError<ApiErrorBody>(error)) throw error;
      lastError = error;

      if (attempt < retries && isRetryable(error)) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      throw toApiError(error);
    }
  }

  throw toApiError(lastError!);
}

export const api = {
  health: () =>
    requestWithRetry<HealthResponse>({ method: "GET", url: "/health" }),

  getCurrentConditions: () =>
    requestWithRetry<CurrentConditionsResponse>({
      method: "GET",
      url: "/api/v1/data/current",
    }),

  getHistoricalData: (limit = 100, offset = 0) =>
    requestWithRetry<SpaceWeatherListResponse>({
      method: "GET",
      url: "/api/v1/data/historical",
      params: { limit, offset },
    }),

  getLatestForecasts: () =>
    requestWithRetry<ForecastListResponse>({
      method: "GET",
      url: "/api/v1/forecasts/latest",
    }),

  getForecastHistory: (limit = 50) =>
    requestWithRetry<ForecastResponse[]>({
      method: "GET",
      url: "/api/v1/forecasts/history",
      params: { limit },
    }),

  getCurrentRisk: () =>
    requestWithRetry<RiskAssessmentResponse>({
      method: "GET",
      url: "/api/v1/risk/current",
    }),

  getRiskHistory: (limit = 50) =>
    requestWithRetry<RiskAssessmentResponse[]>({
      method: "GET",
      url: "/api/v1/risk/history",
      params: { limit },
    }),

  getAnomalies: (limit = 50, unresolvedOnly = false) =>
    requestWithRetry<AnomalyResponse[]>({
      method: "GET",
      url: "/api/v1/anomalies/",
      params: { limit, unresolved_only: unresolvedOnly },
    }),

  getModelPerformance: () =>
    requestWithRetry<ModelPerformanceResponse>({
      method: "GET",
      url: "/api/v1/models/performance",
    }),
};

export default api;
