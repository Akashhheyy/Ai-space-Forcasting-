import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { ApiError } from "@/types/api";

interface ErrorStateProps {
  error: ApiError | Error;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  const isNetwork = error instanceof ApiError && error.status === 0;
  const isNotFound = error instanceof ApiError && error.status === 404;

  const Icon = isNetwork ? WifiOff : AlertTriangle;
  const heading =
    title ??
    (isNetwork
      ? "Connection failed"
      : isNotFound
        ? "Data not available yet"
        : "Something went wrong");

  const message =
    error.message ||
    "An unexpected error occurred while loading data from the API.";

  return (
    <div
      className="glass-card flex flex-col items-center justify-center rounded-xl px-6 py-12 text-center"
      role="alert"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-300">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{heading}</h3>
      <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">{message}</p>
      {error instanceof ApiError && error.status > 0 && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">HTTP {error.status}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
