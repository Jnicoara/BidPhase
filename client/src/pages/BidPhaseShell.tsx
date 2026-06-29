/**
 * BidPhaseShell — Main layout shell
 * Desktop: fixed left sidebar (icon-only 64px, expands to 220px on hover)
 * Mobile:  fixed bottom navigation bar
 * Design: Tactical Dark Mode SaaS, Safety Yellow accent (#F5C518)
 *
 * Routing: uses window.history + hashchange so browser back/forward works.
 *   #/           → landing page
 *   #/civil      → Civil & Underground projects
 *   #/commercial → Commercial projects
 *   #/residential→ Residential projects
 *   #/settings   → Settings
 *   #/trash      → Trash
 */
import { useApp } from "@/contexts/AppContext";
import { useState, useEffect, useCallback } from "react";
import UnifiedProjects, { CivilIcon, CommercialIcon, ResidentialIcon } from "@/components/tabs/UnifiedProjects";
import SettingsTab from "@/components/tabs/SettingsTab";
import ExportButton from "@/components/ExportButton";
import MaterialListPage from "@/pages/MaterialListPage";
import CategoryLanding from "@/pages/CategoryLanding";
import TrashPage from "@/pages/TrashPage";
import { Settings, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Route = "landing" | "civil" | "commercial" | "residential" | "settings" | "trash";

function hashToRoute(hash: string): Route {
  const h = hash.replace(/^#\/?/, "");
  if (h === "civil") return "civil";
  if (h === "commercial") return "commercial";
  if (h === "residential") return "residential";
  if (h === "settings") return "settings";
  if (h === "trash") return "trash";
  return "landing";
}

function routeToHash(route: Route): string {
  if (route === "landing") return "#/";
  return `#/${route}`;
}

const CATEGORY_ICONS = {
  civil:       CivilIcon,
  commercial:  CommercialIcon,
  residential: ResidentialIcon,
} as const;

const CATEGORY_LABELS = {
  civil:       "Civil & Underground",
  commercial:  "Commercial",
  residential: "Residential",
} as const;

export default function BidPhaseShell() {
  const {
    activeTab, setActiveTab,
    uiFontScale,
    showMaterialList, setShowMaterialList,
    activeCategory, setActiveCategory,
  } = useApp();

  // ── URL-based routing ──────────────────────────────────────────────────────
  const [route, setRoute] = useState<Route>(() => hashToRoute(window.location.hash));

  const navigate = useCallback((r: Route) => {
    window.location.hash = routeToHash(r);
    // hashchange event will update state
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const r = hashToRoute(window.location.hash);
      setRoute(r);
      if (r === "civil" || r === "commercial" || r === "residential") {
        setActiveCategory(r);
        setActiveTab("projects");
      } else if (r === "settings") {
        setActiveTab("settings");
      }
    };
    window.addEventListener("hashchange", onHashChange);
    // Sync initial state
    onHashChange();
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [setActiveCategory, setActiveTab]);

  const isOnLanding = route === "landing";
  const isInCategory = route === "civil" || route === "commercial" || route === "residential";
  const isInSettings = route === "settings";
  const isInTrash = route === "trash";

  const currentCategory = isInCategory ? route as "civil" | "commercial" | "residential" : activeCategory;

  const renderContent = () => {
    if (showMaterialList) return <MaterialListPage onBack={() => setShowMaterialList(false)} />;
    if (isOnLanding) return (
      <CategoryLanding onSelect={(cat) => {
        setActiveCategory(cat);
        navigate(cat);
      }} />
    );
    if (isInTrash) return <TrashPage onBack={() => navigate("landing")} />;
    if (isInSettings) return <SettingsTab />;
    // In a category
    return <UnifiedProjects category={currentCategory} />;
  };

  const routeKey = showMaterialList ? "material-list" : route;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
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
            className="font-bold text-base text-foreground whitespace-nowrap
                       hidden group-hover:block transition-opacity duration-150"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            BidPhase
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {/* Category icons — always shown once user has been in a category, or always visible */}
          {(["civil", "commercial", "residential"] as const).map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            const label = CATEGORY_LABELS[cat];
            const isActive = route === cat;
            return (
              <button
                key={cat}
                onClick={() => navigate(cat)}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bp-tab-active text-foreground"
                    : "text-muted-foreground"
                )}
                title={label}
              >
                <Icon
                  size={20}
                  className={cn("shrink-0", isActive ? "text-[#F5C518]" : "")}
                />
                <span
                  className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 truncate text-xs"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {label}
                </span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="my-1 border-t border-sidebar-border/50" />

          {/* Settings */}
          <button
            onClick={() => navigate("settings")}
            className={cn(
              "flex items-center gap-3 px-2.5 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
              "hover:bg-accent hover:text-accent-foreground",
              isInSettings
                ? "bp-tab-active text-foreground"
                : "text-muted-foreground"
            )}
          >
            <Settings
              size={20}
              className={cn("shrink-0", isInSettings ? "text-[#F5C518]" : "")}
            />
            <span
              className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-xs"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Settings
            </span>
          </button>

          {/* Trash */}
          <button
            onClick={() => navigate("trash")}
            className={cn(
              "flex items-center gap-3 px-2.5 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
              "hover:bg-accent hover:text-accent-foreground",
              isInTrash
                ? "bp-tab-active text-foreground"
                : "text-muted-foreground"
            )}
          >
            <Trash2
              size={20}
              className={cn("shrink-0", isInTrash ? "text-[#F5C518]" : "")}
            />
            <span
              className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-xs"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Trash
            </span>
          </button>
        </nav>

        {/* Version tag */}
        <div className="px-3 py-3 border-t border-sidebar-border shrink-0">
          <span
            className="text-[10px] text-muted-foreground whitespace-nowrap
                       opacity-0 group-hover:opacity-100 transition-opacity duration-150 font-mono"
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
              {isOnLanding ? "Home" : isInTrash ? "Trash" : isInSettings ? "Settings" : CATEGORY_LABELS[currentCategory]}
            </span>
          </div>
        </header>

        {/* Tab content */}
        <div
          className="flex-1 overflow-hidden tab-enter"
          key={routeKey}
          style={{ fontSize: `${uiFontScale}rem` }}
        >
          {renderContent()}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex bg-sidebar border-t border-border">
        {(["civil", "commercial", "residential"] as const).map((cat) => {
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
      {!showMaterialList && !isOnLanding && !isInTrash && (
        <ExportButton onOpenMaterialList={() => setShowMaterialList(true)} />
      )}
    </div>
  );
}
