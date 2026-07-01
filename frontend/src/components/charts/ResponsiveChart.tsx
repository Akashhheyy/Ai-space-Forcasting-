import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface ResponsiveChartProps {
  children: React.ReactElement;
  className?: string;
  minHeight?: number;
}

export function ResponsiveChart({
  children,
  className,
  minHeight = 280,
}: ResponsiveChartProps) {
  return (
    <div className={cn("chart-container w-full", className)} style={{ minHeight }}>
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
