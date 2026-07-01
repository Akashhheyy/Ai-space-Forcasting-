import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, subtext, icon, className }: StatCardProps) {
  return (
    <article
      className={cn(
        "glass-card rounded-xl p-4 sm:p-5 transition-transform hover:scale-[1.01]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
            {label}
          </p>
          <p className="mt-1 truncate text-2xl font-bold text-[var(--color-foreground)] sm:text-3xl">
            {value}
          </p>
          {subtext && (
            <p className="mt-1 text-xs text-[var(--color-muted)]">{subtext}</p>
          )}
        </div>
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </article>
  );
}
