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
    <div
      className={cn("w-full", className)}
      style={{
        width: "100%",
        height: `${minHeight}px`,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}