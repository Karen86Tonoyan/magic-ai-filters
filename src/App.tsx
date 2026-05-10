import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ModelsPage = lazy(() => import("@/pages/ModelsPage"));
const LiveAnalysisPage = lazy(() => import("@/pages/LiveAnalysisPage"));
const BenchmarkPage = lazy(() => import("@/pages/BenchmarkPage"));
const DualChatPage = lazy(() => import("@/pages/DualChatPage"));
const IncidentPage = lazy(() => import("@/pages/IncidentPage"));
const LLMInfoPage = lazy(() => import("@/pages/LLMInfoPage"));
const SnapshotsPage = lazy(() => import("@/pages/SnapshotsPage"));
const PipelineSettingsPage = lazy(() => import("@/pages/PipelineSettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center p-8">
    <div className="rounded-xl border border-primary/20 bg-card px-6 py-4 text-sm text-muted-foreground">
      Loading ALFA module...
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/models" element={<ModelsPage />} />
              <Route path="/analysis" element={<LiveAnalysisPage />} />
              <Route path="/chat" element={<DualChatPage />} />
              <Route path="/benchmark" element={<BenchmarkPage />} />
              <Route path="/incidents" element={<IncidentPage />} />
              <Route path="/llm" element={<LLMInfoPage />} />
              <Route path="/snapshots" element={<SnapshotsPage />} />
              <Route path="/settings" element={<PipelineSettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
