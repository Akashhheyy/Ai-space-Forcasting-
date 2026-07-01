import { NavLink } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  LayoutDashboard,
  Satellite,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/space-weather", label: "Space Weather", icon: Satellite },
  { to: "/forecasts", label: "Forecasts", icon: Activity },
  { to: "/risk", label: "Risk Assessment", icon: Shield },
  { to: "/anomalies", label: "Anomalies", icon: AlertTriangle },
  { to: "/models", label: "Model Performance", icon: Brain },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15">
              <BarChart3 className="h-5 w-5 text-cyan-300" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide text-[var(--color-foreground)]">
                Stellar Sentinel
              </p>
              <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                Radiation Forecast
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-white/5 lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-cyan-500/15 text-cyan-200"
                    : "text-[var(--color-muted)] hover:bg-white/5 hover:text-[var(--color-foreground)]",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--color-border)] p-4 text-xs text-[var(--color-muted)]">
          GEO Satellite Early Warning System
        </div>
      </aside>
    </>
  );
}
