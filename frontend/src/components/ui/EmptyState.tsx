import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  title = "No data available",
  description = "There is nothing to display yet. Data will appear once the backend pipeline collects observations.",
  action,
}: EmptyStateProps) {
  return (
    <div
      className="glass-card flex flex-col items-center justify-center rounded-xl px-6 py-12 text-center"
      role="status"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
        <Inbox className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
