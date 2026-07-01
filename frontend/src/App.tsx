import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageSkeleton } from "@/components/ui/LoadingSkeleton";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const SpaceWeatherPage = lazy(() => import("@/pages/SpaceWeatherPage"));
const ForecastsPage = lazy(() => import("@/pages/ForecastsPage"));
const RiskPage = lazy(() => import("@/pages/RiskPage"));
const AnomaliesPage = lazy(() => import("@/pages/AnomaliesPage"));
const ModelsPage = lazy(() => import("@/pages/ModelsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function PageLoader() {
  return (
    <div className="py-4">
      <PageSkeleton />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="space-weather"
          element={
            <Suspense fallback={<PageLoader />}>
              <SpaceWeatherPage />
            </Suspense>
          }
        />
        <Route
          path="forecasts"
          element={
            <Suspense fallback={<PageLoader />}>
              <ForecastsPage />
            </Suspense>
          }
        />
        <Route
          path="risk"
          element={
            <Suspense fallback={<PageLoader />}>
              <RiskPage />
            </Suspense>
          }
        />
        <Route
          path="anomalies"
          element={
            <Suspense fallback={<PageLoader />}>
              <AnomaliesPage />
            </Suspense>
          }
        />
        <Route
          path="models"
          element={
            <Suspense fallback={<PageLoader />}>
              <ModelsPage />
            </Suspense>
          }
        />
        <Route
          path="404"
          element={
            <Suspense fallback={<PageLoader />}>
              <NotFoundPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}
