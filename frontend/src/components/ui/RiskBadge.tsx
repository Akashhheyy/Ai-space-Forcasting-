import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/api";

const riskStyles: Record<RiskLevel, string> = {
  LOW: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  HIGH: "bg-red-500/15 text-red-300 border-red-500/30",
};

interface RiskBadgeProps {
  level: RiskLevel | null | undefined;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  if (!level) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
          "bg-slate-500/15 text-slate-300 border-slate-500/30",
          className,
        )}
      >
        Unknown
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        riskStyles[level],
        className,
      )}
      aria-label={`Risk level ${level}`}
    >
      {level}
    </span>
  );
}
