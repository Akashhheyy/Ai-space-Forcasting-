import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Atom, Shield, Wind } from "lucide-react";
import { ResponsiveChart } from "@/components/charts/ResponsiveChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageSkeleton } from "@/components/ui/LoadingSkeleton";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { StatCard } from "@/components/ui/StatCard";
import { useApiQuery } from "@/hooks/useApiQuery";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { api } from "@/services/api";

const chartTooltipStyle = {
  contentStyle: {
    background: "#121d35",
    border: "1px solid #1e2d4a",
    borderRadius: "8px",
    fontSize: "12px",
  },
  labelStyle: { color: "#94a3b8" },
};

export default function DashboardPage() {
  const currentQuery = useApiQuery(() => api.getCurrentConditions(), [], {
    refetchInterval: 60_000,
  });
  const historicalQuery = useApiQuery(() => api.getHistoricalData(48), []);
  const forecastsQuery = useApiQuery(() => api.getLatestForecasts(), [], {
    refetchInterval: 60_000,
  });
  const riskQuery = useApiQuery(() => api.getCurrentRisk(), [], {
    refetchInterval: 60_000,
  });

  const isLoading =
    currentQuery.isLoading ||
    historicalQuery.isLoading ||
    forecastsQuery.isLoading ||
    riskQuery.isLoading;

  const error =
    currentQuery.error ?? historicalQuery.error ?? forecastsQuery.error ?? riskQuery.error;

  if (isLoading) return <PageSkeleton />;
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void currentQuery.refetch();
          void historicalQuery.refetch();
          void forecastsQuery.refetch();
          void riskQuery.refetch();
        }}
      />
    );
  }

  const current = currentQuery.data;
  const history = historicalQuery.data?.items ?? [];
  const forecasts = forecastsQuery.data?.forecasts ?? [];
  const risk = riskQuery.data;

  if (!current) {
    return <EmptyState title="No current conditions" />;
  }

  const chartData = [...history]
    .reverse()
    .map((item) => ({
      time: formatDateTime(item.timestamp),
      radiation: item.radiation_level,
      electron: item.electron_flux,
    }));

  const forecastChartData = forecasts.map((f) => ({
    horizon: `${f.horizon_minutes}m`,
    predicted: f.predicted_radiation,
  }));

  console.log("History:", history);
 console.log("ChartData:", chartData);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Radiation Level"
          value={formatNumber(current.radiation_level)}
          subtext={`Updated ${formatDateTime(current.timestamp)}`}
          icon={<Atom className="h-5 w-5" />}
        />
        <StatCard
          label="Risk Score"
          value={formatNumber(current.risk_score ?? risk?.risk_score, 1)}
          subtext={current.risk_level ? undefined : "Awaiting assessment"}
          icon={<Shield className="h-5 w-5" />}
        />
        <StatCard
          label="Electron Flux"
          value={formatNumber(current.electron_flux, 1)}
          subtext="GOES integral electrons"
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Solar Wind"
          value={formatNumber(current.solar_wind_speed, 0)}
          subtext={`Kp ${formatNumber(current.kp_index, 2)} · Dst ${formatNumber(current.dst_index, 0)}`}
          icon={<Wind className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass-card rounded-xl p-4 sm:p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Radiation Trend (48 readings)
          </h2>
          {chartData.length === 0 ? (
            <EmptyState title="No historical data" />
          ) : (
            <ResponsiveChart minHeight={260}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="radiationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip {...chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="radiation"
                  stroke="#22d3ee"
                  fill="url(#radiationGradient)"
                  strokeWidth={2}
                  name="Radiation"
                />
              </AreaChart>
            </ResponsiveChart>
          )}
        </section>

        <section className="glass-card rounded-xl p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Current Risk
            </h2>
            <RiskBadge level={risk?.risk_level ?? current.risk_level} />
          </div>
          {risk ? (
            <div className="space-y-4">
              <p className="text-3xl font-bold">{formatNumber(risk.risk_score, 1)}</p>
              <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                {risk.recommendation}
              </p>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-[var(--color-muted)]">Electron</dt>
                  <dd className="font-medium">{formatNumber(risk.electron_contribution, 1)}%</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Proton</dt>
                  <dd className="font-medium">{formatNumber(risk.proton_contribution, 1)}%</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Geomagnetic</dt>
                  <dd className="font-medium">
                    {formatNumber(risk.geomagnetic_contribution, 1)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Forecast</dt>
                  <dd className="font-medium">
                    {formatNumber(risk.forecast_contribution, 1)}%
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <EmptyState title="No risk assessment" />
          )}
        </section>
      </div>

      <section className="glass-card rounded-xl p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Latest Forecasts
        </h2>
        {forecastChartData.length === 0 ? (
          <EmptyState title="No forecasts available" />
        ) : (
          <ResponsiveChart minHeight={220}>
            <LineChart data={forecastChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="horizon"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip {...chartTooltipStyle} />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={{ fill: "#a78bfa", r: 4 }}
                name="Predicted Radiation"
              />
            </LineChart>
          </ResponsiveChart>
        )}
      </section>
    </motion.div>
  );
}
