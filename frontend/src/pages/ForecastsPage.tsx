import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ResponsiveChart } from "@/components/charts/ResponsiveChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageSkeleton } from "@/components/ui/LoadingSkeleton";
import { useApiQuery } from "@/hooks/useApiQuery";
import { formatDateTime, formatHorizon, formatModelName, formatNumber } from "@/lib/utils";
import { api } from "@/services/api";

export default function ForecastsPage() {
  const latestQuery = useApiQuery(() => api.getLatestForecasts(), [], {
    refetchInterval: 60_000,
  });
  const historyQuery = useApiQuery(() => api.getForecastHistory(30), []);

  if (latestQuery.isLoading || historyQuery.isLoading) return <PageSkeleton />;

  const error = latestQuery.error ?? historyQuery.error;
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void latestQuery.refetch();
          void historyQuery.refetch();
        }}
      />
    );
  }

  const latest = latestQuery.data?.forecasts ?? [];
  const history = historyQuery.data ?? [];

  const chartData = latest.map((f) => ({
    name: formatHorizon(f.horizon_minutes),
    predicted: f.predicted_radiation,
    confidence: (f.confidence_score ?? 0) * 100,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <section className="glass-card rounded-xl p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Latest Multi-Horizon Forecasts
          </h2>
          {latestQuery.data?.generated_at && (
            <p className="text-xs text-[var(--color-muted)]">
              Generated {formatDateTime(latestQuery.data.generated_at)}
            </p>
          )}
        </div>

        {latest.length === 0 ? (
          <EmptyState title="No forecasts available" />
        ) : (
          <>
            <ResponsiveChart minHeight={260}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
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
                <Tooltip
                  contentStyle={{
                    background: "#121d35",
                    border: "1px solid #1e2d4a",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="predicted" fill="#22d3ee" radius={[6, 6, 0, 0]} name="Predicted Radiation" />
              </BarChart>
            </ResponsiveChart>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((forecast) => (
                <article
                  key={forecast.id}
                  className="rounded-lg border border-[var(--color-border)] bg-white/[0.02] p-4"
                >
                  <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
                    {formatHorizon(forecast.horizon_minutes)} horizon
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatNumber(forecast.predicted_radiation)}
                  </p>
                  <dl className="mt-3 space-y-1 text-xs text-[var(--color-muted)]">
                    <div className="flex justify-between">
                      <dt>Model</dt>
                      <dd className="text-[var(--color-foreground)]">
                        {formatModelName(forecast.model_name)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Confidence</dt>
                      <dd className="text-[var(--color-foreground)]">
                        {formatNumber((forecast.confidence_score ?? 0) * 100, 0)}%
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Forecast For</dt>
                      <dd className="text-[var(--color-foreground)]">
                        {formatDateTime(forecast.forecast_for)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="glass-card rounded-xl p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Forecast History
        </h2>
        {history.length === 0 ? (
          <EmptyState title="No forecast history" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-3 font-medium">Generated</th>
                  <th className="px-3 py-3 font-medium">Horizon</th>
                  <th className="px-3 py-3 font-medium">Predicted</th>
                  <th className="px-3 py-3 font-medium">Model</th>
                  <th className="px-3 py-3 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 15).map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--color-border)]/50 hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-3">{formatDateTime(row.generated_at)}</td>
                    <td className="px-3 py-3">{formatHorizon(row.horizon_minutes)}</td>
                    <td className="px-3 py-3 font-medium">
                      {formatNumber(row.predicted_radiation)}
                    </td>
                    <td className="px-3 py-3">{formatModelName(row.model_name)}</td>
                    <td className="px-3 py-3">
                      {formatNumber((row.confidence_score ?? 0) * 100, 0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </motion.div>
  );
}
