import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import CommandPalette from "@/components/CommandPalette";
import { CookieConsent } from "@/components/CookieConsent";
import { ConsentAnalytics } from "@/components/ConsentAnalytics";
import { RouteMetadata } from "@/components/RouteMetadata";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Route, Switch } from "wouter";

const NotFound = lazy(() => import("@/pages/NotFound"));
const Home = lazy(() => import("@/pages/Home"));
const Markets = lazy(() => import("@/pages/Markets"));
const AssetDetail = lazy(() => import("@/pages/AssetDetail"));
const News = lazy(() => import("@/pages/News"));
const Screener = lazy(() => import("@/pages/Screener"));
const Compare = lazy(() => import("@/pages/Compare"));
const Calculators = lazy(() => import("@/pages/Calculators"));
const Portfolio = lazy(() => import("@/pages/Portfolio"));
const Alerts = lazy(() => import("@/pages/Alerts"));
const Trust = lazy(() => import("@/pages/Trust"));
const Legal = lazy(() => import("@/pages/Legal"));
const AuthFinish = lazy(() => import("@/pages/AuthFinish"));

function RouteFallback() {
  return (
    <div
      className="min-h-screen bg-background text-foreground animate-pulse"
      role="status"
      aria-live="polite"
      aria-label="Carregando visualização"
    >
      <div className="border-b border-border/40 bg-card/40 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-24 rounded-lg bg-muted" />
            <div className="h-4 w-32 rounded bg-muted/60" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-xl bg-muted/70" />
            <div className="h-8 w-8 rounded-full bg-muted/60" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 space-y-2.5">
          <div className="h-3.5 w-20 rounded bg-primary/20" />
          <div className="h-8 w-64 rounded-xl bg-muted" />
          <div className="h-4 w-96 max-w-full rounded bg-muted/60" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-32 rounded-2xl border border-border/50 bg-card/60 p-5" />
          <div className="h-32 rounded-2xl border border-border/50 bg-card/60 p-5" />
          <div className="h-32 rounded-2xl border border-border/50 bg-card/60 p-5" />
        </div>
        <div className="mt-6 h-64 rounded-2xl border border-border/50 bg-card/60 p-6" />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/markets" component={Markets} />
        <Route path="/asset/:ticker" component={AssetDetail} />
        <Route path="/news" component={News} />
        <Route path="/screener" component={Screener} />
        <Route path="/compare" component={Compare} />
        <Route path="/calculators" component={Calculators} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/trust" component={Trust} />
        <Route path="/privacy" component={Legal} />
        <Route path="/terms" component={Legal} />
        <Route path="/cookies" component={Legal} />
        <Route path="/auth/finish" component={AuthFinish} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const openPalette = () => setPaletteOpen(true);
    window.addEventListener("virtus:command-open", openPalette);
    return () => window.removeEventListener("virtus:command-open", openPalette);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
          <RouteMetadata />
          <ConsentAnalytics />
          <Router />
          <CookieConsent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
