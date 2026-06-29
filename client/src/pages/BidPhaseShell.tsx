/**
 * BidPhaseShell — Main layout shell
 * Desktop: fixed left sidebar (icon-only 64px, expands to 220px on hover)
 * Mobile:  fixed bottom navigation bar
 * Design: Tactical Dark Mode SaaS, Safety Yellow accent (#F5C518)
 *
 * Routing: uses window.history pushState so browser back/forward works for ALL routes.
 *   /           → landing page
 *   /residential→ Residential projects
 *   /commercial → Commercial projects
 *   /civil      → Infrastructure projects
 *   /material   → Labor & Material page (navigable, back/forward works)
 *   /estimate   → Estimate Engine
 *   /settings   → Settings
 *   /trash      → Trash
 */
import { useApp } from "@/contexts/AppContext";
import { useState, useEffect, useCallback } from "react";
import UnifiedProjects, { CivilIcon, CommercialIcon, ResidentialIcon, IndustrialIcon } from "@/components/tabs/UnifiedProjects";
import SettingsTab from "@/components/tabs/SettingsTab";
import ExportButton from "@/components/ExportButton";
import MaterialListPage from "@/pages/MaterialListPage";
import CategoryLanding from "@/pages/CategoryLanding";
import TrashPage from "@/pages/TrashPage";
import EstimateEnginePage from "@/pages/EstimateEnginePage";
import { Settings, Trash2, ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Route = "landing" | "civil" | "commercial" | "residential" | "industrial" | "material" | "settings" | "trash" | "estimate";

// ── Path ↔ Route mapping ────────────────────────────────────────────────────
function pathToRoute(path: string): Route {
  // Support both hash-based (#/civil) and path-based (/civil) URLs
  // Also handle sub-routes like #/residential/project-id — use only the first segment
  const full = path.replace(/^#\/?/, "").replace(/^\//, "").split("?")[0].split("#")[0];
  const p = full.split("/")[0]; // only first segment for top-level route
  if (p === "residential") return "residential";
  if (p === "commercial") return "commercial";
  if (p === "civil") return "civil";
  if (p === "industrial") return "industrial";
  if (p === "material") return "material";
  if (p === "estimate") return "estimate";
  if (p === "settings") return "settings";
  if (p === "trash") return "trash";
  return "landing";
}

function getCurrentRoute(): Route {
  // Support both hash routing (legacy) and path routing
  const hash = window.location.hash;
  if (hash && hash.length > 1) return pathToRoute(hash);
  return pathToRoute(window.location.pathname);
}

function routeToPath(route: Route): string {
  if (route === "landing") return "/";
  return `/${route}`;
}

// ── Nav config ──────────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  residential: ResidentialIcon,
  commercial:  CommercialIcon,
  civil:       CivilIcon,
  industrial:  IndustrialIcon,
} as const;

const CATEGORY_LABELS = {
  residential: "Residential",
  commercial:  "Commercial",
  civil:       "Infrastructure",
  industrial:  "Industrial",
} as const;

// Ordered: Residential, Commercial, Industrial, Infrastructure (civil last)
const CATEGORY_ORDER = ["residential", "commercial", "industrial", "civil"] as const;

export default function BidPhaseShell() {
  const {
    activeTab, setActiveTab,
    uiFontScale,
    setShowMaterialList,
    activeCategory, setActiveCategory,
  } = useApp();

  // ── URL-based routing using pushState ──────────────────────────────────────
  const [route, setRoute] = useState<Route>(() => getCurrentRoute());
  const [previousRoute, setPreviousRoute] = useState<Route>("landing");

  const navigate = useCallback((r: Route) => {
    // Use hash routing for compatibility with static hosting
    window.location.hash = r === "landing" ? "/" : `/${r}`;
  }, []);

  // Go back using browser history (works with browser back button too)
  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(previousRoute);
    }
  }, [navigate, previousRoute]);

  useEffect(() => {
    const onHashChange = () => {
      const r = getCurrentRoute();
      setRoute((prev) => {
        // Track previous route before updating
        setPreviousRoute(prev);
        return r;
      });
      // Sync AppContext state
      if (r === "civil" || r === "commercial" || r === "residential" || r === "industrial") {
        setActiveCategory(r);
        setActiveTab("projects");
      } else if (r === "settings") {
        setActiveTab("settings");
      } else if (r === "material") {
        setShowMaterialList(true);
      } else {
        // When navigating away from material via back/forward, clear the flag
        setShowMaterialList(false);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    // Also listen for popstate (browser back/forward on path-based)
    window.addEventListener("popstate", onHashChange);
    // Sync initial state
    onHashChange();
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, [setActiveCategory, setActiveTab, setShowMaterialList]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const isOnLanding    = route === "landing";
  const isInCategory   = route === "civil" || route === "commercial" || route === "residential" || route === "industrial";
  const isInSettings   = route === "settings";
  const isInTrash      = route === "trash";
  const isInEstimate   = route === "estimate";
  const isInMaterial   = route === "material";

  const currentCategory = isInCategory
    ? (route as "civil" | "commercial" | "residential" | "industrial")
    : activeCategory;

  // ── Open L&M with proper URL push ─────────────────────────────────────────
  const openMaterialList = useCallback(() => {
    navigate("material");
  }, [navigate]);

  const closeMaterialList = useCallback(() => {
    // Use browser back to pop the #/material entry off the history stack
    // This avoids creating a new entry and fixes the back-button loop
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(currentCategory);
    }
  }, [navigate, currentCategory]);

  // ── Content renderer ───────────────────────────────────────────────────────
  const renderContent = () => {
    if (isInMaterial)  return <MaterialListPage onBack={closeMaterialList} />;
    if (isOnLanding)   return (
      <CategoryLanding onSelect={(cat) => {
        setActiveCategory(cat);
        navigate(cat);
      }} />
    );
    if (isInTrash)     return <TrashPage onBack={goBack} />;
    if (isInSettings)  return <SettingsTab onBack={goBack} />;
    if (isInEstimate)  return <EstimateEnginePage onBack={goBack} />;
    // In a category
    return <UnifiedProjects category={currentCategory} />;
  };

  const routeKey = route;

  // ── Sidebar nav item helper ────────────────────────────────────────────────
  const NavBtn = ({
    onClick, isActive, icon: Icon, label, title,
  }: {
    onClick: () => void;
    isActive: boolean;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      title={title ?? label}
      className={cn(
        "flex items-center gap-3 px-2.5 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
        "hover:bg-accent hover:text-accent-foreground",
        isActive ? "bp-tab-active text-foreground" : "text-muted-foreground"
      )}
    >
      <Icon size={20} className={cn("shrink-0", isActive ? "text-[#F5C518]" : "")} />
      <span
        className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 truncate text-xs"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {label}
      </span>
    </button>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background" style={{ zoom: uiFontScale }}>
      {/* ── Desktop Sidebar ─────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col shrink-0 w-16 hover:w-56 transition-[width] duration-200 ease-out
                   bg-sidebar border-r border-sidebar-border overflow-hidden group z-20"
      >
        {/* Logo — click returns to landing */}
        <div
          onClick={() => navigate("landing")}
          className="flex items-center justify-center gap-2 px-3 py-4 h-16 border-b border-sidebar-border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          title="Back to home"
        >
          <span
            className="font-bold text-[#F5C518] text-sm shrink-0 group-hover:hidden"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            BP
          </span>
          <span
            className="font-bold text-base text-foreground whitespace-nowrap hidden group-hover:block transition-opacity duration-150"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            BidPhase
          </span>
        </div>

        {/* Nav items — top section */}
        <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
          {/* Categories: Residential → Commercial → Industrial → Infrastructure */}
          {CATEGORY_ORDER.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            return (
              <NavBtn
                key={cat}
                onClick={() => navigate(cat)}
                isActive={route === cat}
                icon={Icon}
                label={CATEGORY_LABELS[cat]}
              />
            );
          })}

          {/* Estimate Engine — below Residential/Commercial/Civil */}
          <div className="my-1 border-t border-sidebar-border/50" />
          <NavBtn
            onClick={() => navigate("estimate")}
            isActive={isInEstimate}
            icon={Zap}
            label="Estimate Engine"
          />
        </nav>

        {/* Bottom section: Trash on top, Settings on bottom */}
        <div className="flex flex-col gap-1 p-2 border-t border-sidebar-border shrink-0">
          <NavBtn
            onClick={() => navigate("trash")}
            isActive={isInTrash}
            icon={Trash2}
            label="Trash"
          />
          <NavBtn
            onClick={() => navigate("settings")}
            isActive={isInSettings}
            icon={Settings}
            label="Settings"
          />
        </div>

        {/* Version tag */}
        <div className="px-3 py-2 border-t border-sidebar-border shrink-0">
          <span
            className="text-[10px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 font-mono"
          >
            v3.0 · Field Edition
          </span>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border shrink-0 bg-sidebar">
          <span
            className="font-bold text-base text-foreground cursor-pointer"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            onClick={() => navigate("landing")}
          >
            BidPhase
          </span>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <ChevronRight size={12} />
            <span className="capitalize">
              {isOnLanding ? "Home"
                : isInTrash ? "Trash"
                : isInSettings ? "Settings"
                : isInEstimate ? "Estimate Engine"
                : isInMaterial ? "Labor & Material"
                : CATEGORY_LABELS[currentCategory]}
            </span>
          </div>
        </header>

        {/* Tab content */}
        <div
          className="flex-1 overflow-hidden tab-enter"
          key={routeKey}

        >
          {renderContent()}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex bg-sidebar border-t border-border">
        {CATEGORY_ORDER.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const isActive = route === cat;
          return (
            <button
              key={cat}
              onClick={() => navigate(cat)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150 relative",
                isActive ? "text-[#F5C518]" : "text-muted-foreground"
              )}
            >
              <Icon size={18} className={isActive ? "text-[#F5C518]" : ""} />
              {isActive && <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#F5C518] rounded-b" />}
            </button>
          );
        })}
        <button
          onClick={() => navigate("estimate")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150 relative",
            isInEstimate ? "text-[#F5C518]" : "text-muted-foreground"
          )}
        >
          <Zap size={18} className={isInEstimate ? "text-[#F5C518]" : ""} />
          {isInEstimate && <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#F5C518] rounded-b" />}
        </button>
        <button
          onClick={() => navigate("settings")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150 relative",
            isInSettings ? "text-[#F5C518]" : "text-muted-foreground"
          )}
        >
          <Settings size={18} className={isInSettings ? "text-[#F5C518]" : ""} />
          {isInSettings && <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#F5C518] rounded-b" />}
        </button>
        <button
          onClick={() => navigate("trash")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150 relative",
            isInTrash ? "text-[#F5C518]" : "text-muted-foreground"
          )}
        >
          <Trash2 size={18} className={isInTrash ? "text-[#F5C518]" : ""} />
          {isInTrash && <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#F5C518] rounded-b" />}
        </button>
      </nav>

      {/* ── Floating Export Button ───────────────────────────────── */}
      {!isInMaterial && !isOnLanding && !isInTrash && !isInEstimate && (
        <ExportButton onOpenMaterialList={openMaterialList} />
      )}
    </div>
  );
}
