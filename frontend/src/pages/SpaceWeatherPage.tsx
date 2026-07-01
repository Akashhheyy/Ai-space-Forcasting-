import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ResponsiveChart } from "@/components/charts/ResponsiveChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatCard } from "@/components/ui/StatCard";
import { useApiQuery } from "@/hooks/useApiQuery";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { api } from "@/services/api";

const LIMIT_OPTIONS = [50, 100, 200];

export default function SpaceWeatherPage() {
  const [limit, setLimit] = useState(100);

  const currentQuery = useApiQuery(() => api.getCurrentConditions(), [], {
    refetchInterval: 60_000,
  });
  const historicalQuery = useApiQuery(() => api.getHistoricalData(limit), [limit]);

  const items = historicalQuery.data?.items ?? [];
  const chartData = useMemo(
    () =>
      [...items]
        .reverse()
        .map((item) => ({
          time: formatDateTime(item.timestamp),
          radiation: item.radiation_level,
          electron: item.electron_flux,
          proton: item.proton_flux,
          kp: item.kp_index ?? 0,
        })),
    [items],
  );

  if (currentQuery.isLoading || historicalQuery.isLoading) return <PageSkeleton />;

  const error = currentQuery.error ?? historicalQuery.error;
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void currentQuery.refetch();
          void historicalQuery.refetch();
        }}
      />
    );
  }

  const current = currentQuery.data;
  const total = historicalQuery.data?.total ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {current && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Radiation" value={formatNumber(current.radiation_level)} />
          <StatCard label="Electron Flux" value={formatNumber(current.electron_flux, 1)} />
          <StatCard label="Proton Flux" value={formatNumber(current.proton_flux, 3)} />
          <StatCard label="Solar Wind" value={formatNumber(current.solar_wind_speed, 0)} />
          <StatCard label="Kp Index" value={formatNumber(current.kp_index, 2)} />
          <StatCard label="Dst Index" value={formatNumber(current.dst_index, 0)} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          Showing {items.length} of {total.toLocaleString()} observations
        </p>
        <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          Limit
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-foreground)]"
          >
            {LIMIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="glass-card rounded-xl p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Historical Metrics
        </h2>
        {chartData.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveChart minHeight={320}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
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
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="radiation"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
                name="Radiation"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="electron"
                stroke="#a78bfa"
                strokeWidth={1.5}
                dot={false}
                name="Electron Flux"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="proton"
                stroke="#fbbf24"
                strokeWidth={1.5}
                dot={false}
                name="Proton Flux"
              />
            </LineChart>
          </ResponsiveChart>
        )}
      </section>

      {items.length > 0 && (
        <section className="glass-card overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-white/[0.02] text-xs uppercase tracking-wider text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Radiation</th>
                  <th className="px-4 py-3 font-medium">Electron</th>
                  <th className="px-4 py-3 font-medium">Proton</th>
                  <th className="px-4 py-3 font-medium">Kp</th>
                  <th className="px-4 py-3 font-medium">Dst</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 20).map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--color-border)]/50 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">{formatDateTime(row.timestamp)}</td>
                    <td className="px-4 py-3 font-medium">{formatNumber(row.radiation_level)}</td>
                    <td className="px-4 py-3">{formatNumber(row.electron_flux, 1)}</td>
                    <td className="px-4 py-3">{formatNumber(row.proton_flux, 3)}</td>
                    <td className="px-4 py-3">{formatNumber(row.kp_index, 2)}</td>
                    <td className="px-4 py-3">{formatNumber(row.dst_index, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </motion.div>
  );
}
