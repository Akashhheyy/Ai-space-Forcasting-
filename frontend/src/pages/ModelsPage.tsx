import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

export default function ModelsPage() {
  const performanceQuery = useApiQuery(() => api.getModelPerformance(), []);

  if (performanceQuery.isLoading) return <PageSkeleton />;

  if (performanceQuery.error) {
    return (
      <ErrorState error={performanceQuery.error} onRetry={performanceQuery.refetch} />
    );
  }

  const data = performanceQuery.data;
  const bestModels = data?.best_models ?? [];
  const allMetrics = data?.all_metrics ?? [];

  if (bestModels.length === 0 && allMetrics.length === 0) {
    return (
      <EmptyState
        title="No model metrics"
        description="Models have not been trained yet. Start the backend scheduler or trigger training via POST /api/v1/models/train."
      />
    );
  }

  const chartData = bestModels.map((m) => ({
    name: `${formatModelName(m.model_name)} (${formatHorizon(m.horizon_minutes)})`,
    mae: m.mae,
    rmse: m.rmse,
    r2: m.r2_score,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <section className="glass-card rounded-xl p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Best Model per Horizon — RMSE Comparison
        </h2>
        {chartData.length === 0 ? (
          <EmptyState title="No best models" />
        ) : (
          <ResponsiveChart minHeight={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: "#121d35",
                  border: "1px solid #1e2d4a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="mae" fill="#22d3ee" name="MAE" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rmse" fill="#a78bfa" name="RMSE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveChart>
        )}
      </section>

      <section className="glass-card rounded-xl p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Best Models
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bestModels.map((model) => (
            <article
              key={model.id}
              className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4"
            >
              <p className="text-xs uppercase tracking-wider text-cyan-300/80">Best Model</p>
              <p className="mt-1 text-lg font-bold">{formatModelName(model.model_name)}</p>
              <p className="text-sm text-[var(--color-muted)]">
                Horizon: {formatHorizon(model.horizon_minutes)}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-[var(--color-muted)]">MAE</dt>
                  <dd>{formatNumber(model.mae, 3)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">RMSE</dt>
                  <dd>{formatNumber(model.rmse, 3)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">R²</dt>
                  <dd>{formatNumber(model.r2_score, 3)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Samples</dt>
                  <dd>{model.training_samples.toLocaleString()}</dd>
                </div>
              </dl>
              <p className="mt-2 text-[10px] text-[var(--color-muted)]">
                Trained {formatDateTime(model.trained_at)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-card overflow-hidden rounded-xl">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            All Model Metrics ({allMetrics.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-white/[0.02] text-xs uppercase tracking-wider text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Horizon</th>
                <th className="px-4 py-3 font-medium">MAE</th>
                <th className="px-4 py-3 font-medium">RMSE</th>
                <th className="px-4 py-3 font-medium">R²</th>
                <th className="px-4 py-3 font-medium">Samples</th>
                <th className="px-4 py-3 font-medium">Best</th>
              </tr>
            </thead>
            <tbody>
              {allMetrics.slice(0, 25).map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--color-border)]/50 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">{formatModelName(row.model_name)}</td>
                  <td className="px-4 py-3">{formatHorizon(row.horizon_minutes)}</td>
                  <td className="px-4 py-3">{formatNumber(row.mae, 3)}</td>
                  <td className="px-4 py-3">{formatNumber(row.rmse, 3)}</td>
                  <td className="px-4 py-3">{formatNumber(row.r2_score, 3)}</td>
                  <td className="px-4 py-3">{row.training_samples.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {row.is_best ? (
                      <span className="text-emerald-300">Yes</span>
                    ) : (
                      <span className="text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
}
