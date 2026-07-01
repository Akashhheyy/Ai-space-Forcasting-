import { useCallback, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { useApiQuery } from "@/hooks/useApiQuery";
import { api } from "@/services/api";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Mission Dashboard",
    subtitle: "Real-time space radiation monitoring for GEO satellites",
  },
  "/space-weather": {
    title: "Space Weather",
    subtitle: "NOAA GOES electron/proton flux and geomagnetic indices",
  },
  "/forecasts": {
    title: "Radiation Forecasts",
    subtitle: "Multi-horizon ML predictions at 30m, 6h, and 12h",
  },
  "/risk": {
    title: "Risk Assessment",
    subtitle: "Satellite operational risk scoring and recommendations",
  },
  "/anomalies": {
    title: "Anomaly Detection",
    subtitle: "Rolling z-score analysis on radiation spikes",
  },
  "/models": {
    title: "Model Performance",
    subtitle: "MAE, RMSE, and R² metrics across ML models",
  },
};

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const meta = pageMeta[location.pathname] ?? {
    title: "Stellar Sentinel",
    subtitle: "Space Radiation Forecast System",
  };

  const healthQuery = useApiQuery(() => api.health(), [], { refetchInterval: 60_000 });
  const currentQuery = useApiQuery(() => api.getCurrentConditions(), [], {
    refetchInterval: 60_000,
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([healthQuery.refetch(), currentQuery.refetch()]);
  }, [healthQuery, currentQuery]);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={healthQuery.isLoading || currentQuery.isLoading}
          health={healthQuery.data}
          riskLevel={currentQuery.data?.risk_level}
          title={meta.title}
          subtitle={meta.subtitle}
        />

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
