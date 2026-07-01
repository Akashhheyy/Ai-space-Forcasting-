import { motion } from "framer-motion";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageSkeleton } from "@/components/ui/LoadingSkeleton";
import { useApiQuery } from "@/hooks/useApiQuery";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { api } from "@/services/api";

function severityClass(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized.includes("high")) return "bg-red-500/15 text-red-300 border-red-500/30";
  if (normalized.includes("medium")) return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
}

export default function AnomaliesPage() {
  const anomaliesQuery = useApiQuery(() => api.getAnomalies(50), [], {
    refetchInterval: 60_000,
  });

  if (anomaliesQuery.isLoading) return <PageSkeleton />;

  if (anomaliesQuery.error) {
    return <ErrorState error={anomaliesQuery.error} onRetry={anomaliesQuery.refetch} />;
  }

  const anomalies = anomaliesQuery.data ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <p className="text-sm text-[var(--color-muted)]">
        Detected via rolling z-score analysis on radiation metrics.{" "}
        {anomalies.length > 0
          ? `${anomalies.length} report(s) loaded.`
          : "No anomalies detected in recent observations."}
      </p>

      {anomalies.length === 0 ? (
        <EmptyState
          title="No anomalies detected"
          description="The system has not flagged any radiation spikes above the configured z-score threshold. This is a good sign for satellite operations."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {anomalies.map((anomaly) => (
            <article
              key={anomaly.id}
              className="glass-card rounded-xl p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
                    {anomaly.metric}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(anomaly.timestamp)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs font-medium",
                    severityClass(anomaly.severity),
                  )}
                >
                  {anomaly.severity}
                </span>
              </div>

              <p className="mt-3 text-sm text-[var(--color-muted)]">{anomaly.description}</p>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-[var(--color-muted)]">Observed</dt>
                  <dd className="font-medium">{formatNumber(anomaly.observed_value)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Expected</dt>
                  <dd className="font-medium">{formatNumber(anomaly.expected_value)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Z-Score</dt>
                  <dd className="font-medium">{formatNumber(anomaly.z_score, 2)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Status</dt>
                  <dd className="font-medium">
                    {anomaly.is_resolved ? "Resolved" : "Active"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </motion.div>
  );
}
