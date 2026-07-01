import { motion } from "framer-motion";
import {
  Cell,
  Pie,
  PieChart,
  Tooltip,
} from "recharts";
import { ResponsiveChart } from "@/components/charts/ResponsiveChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageSkeleton } from "@/components/ui/LoadingSkeleton";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { StatCard } from "@/components/ui/StatCard";
import { useApiQuery } from "@/hooks/useApiQuery";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { api } from "@/services/api";

const CONTRIBUTION_COLORS = ["#22d3ee", "#a78bfa", "#fbbf24", "#34d399"];

export default function RiskPage() {
  const currentQuery = useApiQuery(() => api.getCurrentRisk(), [], {
    refetchInterval: 60_000,
  });
  const historyQuery = useApiQuery(() => api.getRiskHistory(30), []);

  if (currentQuery.isLoading || historyQuery.isLoading) return <PageSkeleton />;

  const error = currentQuery.error ?? historyQuery.error;
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void currentQuery.refetch();
          void historyQuery.refetch();
        }}
      />
    );
  }

  const current = currentQuery.data;
  const history = historyQuery.data ?? [];

  if (!current) {
    return <EmptyState title="No risk assessment available" />;
  }

  const contributionData = [
    { name: "Electron", value: current.electron_contribution },
    { name: "Proton", value: current.proton_contribution },
    { name: "Geomagnetic", value: current.geomagnetic_contribution },
    { name: "Forecast", value: current.forecast_contribution },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Risk Score"
          value={formatNumber(current.risk_score, 1)}
          subtext={`As of ${formatDateTime(current.timestamp)}`}
        />
        <div className="glass-card flex flex-col justify-center rounded-xl p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
            Risk Level
          </p>
          <div className="mt-2">
            <RiskBadge level={current.risk_level} className="mt-2 text-sm px-3 py-1" />
          </div>
        </div>
        <StatCard
          label="Electron Contribution"
          value={`${formatNumber(current.electron_contribution, 1)}%`}
        />
        <StatCard
          label="Forecast Contribution"
          value={`${formatNumber(current.forecast_contribution, 1)}%`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-card rounded-xl p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Risk Factor Breakdown
          </h2>
          <ResponsiveChart minHeight={260}>
            <PieChart>
              <Pie
                data={contributionData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
              >
                {contributionData.map((_, index) => (
                  <Cell key={index} fill={CONTRIBUTION_COLORS[index % CONTRIBUTION_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#121d35",
                  border: "1px solid #1e2d4a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [`${Number(value).toFixed(1)}%`, "Contribution"]}
              />
            </PieChart>
          </ResponsiveChart>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {contributionData.map((item, i) => (
              <li key={item.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: CONTRIBUTION_COLORS[i] }}
                />
                {item.name}: {formatNumber(item.value, 1)}%
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-card rounded-xl p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Operational Recommendation
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-foreground)]">
            {current.recommendation}
          </p>
          <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-white/[0.02] p-4 text-xs text-[var(--color-muted)]">
            <p className="font-medium text-[var(--color-foreground)]">Risk thresholds</p>
            <ul className="mt-2 space-y-1">
              <li>LOW (0–35): Normal operations</li>
              <li>MEDIUM (35–65): Defer non-critical ops, enable monitoring</li>
              <li>HIGH (65–100): Safe-mode protocols, notify mission control</li>
            </ul>
          </div>
        </section>
      </div>

      <section className="glass-card rounded-xl p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Assessment History
        </h2>
        {history.length === 0 ? (
          <EmptyState title="No risk history" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-3 font-medium">Timestamp</th>
                  <th className="px-3 py-3 font-medium">Score</th>
                  <th className="px-3 py-3 font-medium">Level</th>
                  <th className="px-3 py-3 font-medium">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 12).map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--color-border)]/50 hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatDateTime(row.timestamp)}
                    </td>
                    <td className="px-3 py-3 font-medium">{formatNumber(row.risk_score, 1)}</td>
                    <td className="px-3 py-3">
                      <RiskBadge level={row.risk_level} />
                    </td>
                    <td className="max-w-xs truncate px-3 py-3 text-[var(--color-muted)]">
                      {row.recommendation}
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
