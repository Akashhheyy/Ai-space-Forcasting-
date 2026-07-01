import { Menu, RefreshCw } from "lucide-react";
import { RiskBadge } from "@/components/ui/RiskBadge";
import type { HealthResponse, RiskLevel } from "@/types/api";
import { formatDateTime } from "@/lib/utils";

interface NavbarProps {
  onMenuClick: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  health?: HealthResponse | null;
  riskLevel?: RiskLevel | null;
  title: string;
  subtitle?: string;
}

export function Navbar({
  onMenuClick,
  onRefresh,
  isRefreshing,
  health,
  riskLevel,
  title,
  subtitle,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-white/5 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
            {subtitle && (
              <p className="truncate text-xs text-[var(--color-muted)] sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {riskLevel && <RiskBadge level={riskLevel} />}
          {health && (
            <div
              className="hidden items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] sm:flex"
              aria-label={`System status ${health.status}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  health.status === "healthy" ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              API {health.status} · v{health.version}
              {health.last_data_fetch && (
                <span className="hidden md:inline">
                  · Updated {formatDateTime(health.last_data_fetch)}
                </span>
              )}
            </div>
          )}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition-colors hover:bg-white/5 disabled:opacity-50"
              aria-label="Refresh data"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
