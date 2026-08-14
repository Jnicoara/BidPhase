import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import { useTheme } from "./contexts/ThemeContext";
import AuthGuard from "./components/AuthGuard";

/**
 * The estimating app, split out of the first download.
 *
 * A signed-out visitor gets the marketing page, and there is no reason for that
 * page — the first impression for every prospective user — to ship the plan
 * viewer, the library screens and the whole bid workspace behind it. Splitting
 * here rather than deeper is what makes the boundary meaningful: everything the
 * app needs hangs off this one component, and everything the landing page needs
 * is already in the entry chunk.
 *
 * A signed-in user pays for the chunk once, on a screen that was always going
 * to show a loading state while auth resolved.
 */
const HelixBidShell = lazy(() => import("./pages/HelixBidShell"));

// Toaster that follows the active theme
function ToasterWithTheme() {
  const { theme } = useTheme();
  return <Toaster theme={theme} />;
}

/** Shown only while the app chunk arrives — never on the landing page. */
function AppChunkFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 size={28} className="animate-spin text-[#F5C518]" />
    </div>
  );
}

function Router() {
  return (
    <AuthGuard>
      <Suspense fallback={<AppChunkFallback />}>
        <Switch>
          <Route path={"/"} component={HelixBidShell} />
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AuthGuard>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <AppProvider>
          <TooltipProvider>
            <ToasterWithTheme />
            <Router />
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
