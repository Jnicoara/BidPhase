import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import BidPhaseShell from "./pages/BidPhaseShell";
import { useTheme } from "./contexts/ThemeContext";
import AuthGuard from "./components/AuthGuard";

// Toaster that follows the active theme
function ToasterWithTheme() {
  const { theme } = useTheme();
  return <Toaster theme={theme} />;
}
function Router() {
  return (
    <AuthGuard>
      <Switch>
        <Route path={"/"} component={BidPhaseShell} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
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
