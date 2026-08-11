/**
 * HelixBidShell — Main layout shell v5.50
 * Desktop: fixed left sidebar (icon-only 64px, expands to 220px on hover)
 * Mobile:  fixed bottom navigation bar
 * Design: Tactical Dark Mode SaaS, Safety Yellow accent (#F5C518)
 *
 * Routing (hash-based):
 *   /           → HelixBid Homepage (BP logo destination)
 *   /projects   → Projects card grid
 *   /project/:id → Project detail (editable header + tabs)
 *   /residential → Residential estimating workspace (legacy)
 *   /commercial  → Commercial estimating workspace (legacy)
 *   /civil       → Infrastructure estimating workspace (legacy)
 *   /industrial  → Industrial estimating workspace (legacy)
 *   /material    → Labor & Material page
 *   /estimate    → Estimate Engine
 *   /settings    → Settings
 *   /trash       → Trash
 *   /matdb       → Material Database (supply-house price list)
 *   /assemblies  → Assembly Builder
 *   /library/materials   → Materials (Foundation library catalog)
 *   /library/labor-rates → Labor Rates (roles and what they cost per hour)
 *   /library/modifiers   → Modifiers (job-condition labor adjustments)
 *   /admin       → Admin Settings (admin role only)
 */
import { useApp } from "@/contexts/AppContext";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import UnifiedProjects, { CivilIcon, CommercialIcon, ResidentialIcon, IndustrialIcon } from "@/components/tabs/UnifiedProjects";
import SettingsTab from "@/components/tabs/SettingsTab";
import MaterialListPage from "@/pages/MaterialListPage";
import MaterialDatabasePage from "@/pages/MaterialDatabasePage";
import TrashPage from "@/pages/TrashPage";
import EstimateEnginePage from "@/pages/EstimateEnginePage";
import HelixBidHomePage from "@/pages/HelixBidHomePage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import AssemblyBuilderPage from "@/pages/AssemblyBuilderPage";
import AdminSettingsPage from "@/pages/AdminSettingsPage";
import MaterialsLibraryPage from "@/pages/MaterialsLibraryPage";
import LaborRatesPage from "@/pages/LaborRatesPage";
import ModifiersPage from "@/pages/ModifiersPage";
import { Settings, Trash2, ChevronRight, Database, Home, FolderOpen, Package, Shield, Boxes, HardHat, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type Route =
  | "home"
  | "projects"
  | "project-detail"
  | "landing"
  | "civil"
  | "commercial"
  | "residential"
  | "industrial"
  | "material"
  | "settings"
  | "trash"
  | "estimate"
  | "matdb"
  | "assemblies"
  | "library-materials"
  | "library-labor-rates"
  | "library-modifiers"
  | "admin";

// ── Path ↔ Route mapping ────────────────────────────────────────────────────
function pathToRoute(path: string): { route: Route; projectId?: number } {
  const full = path.replace(/^#\/?/, "").replace(/^\//, "").split("?")[0].split("#")[0];
  const parts = full.split("/");
  const p = parts[0];

  if (p === "" || p === "home") return { route: "home" };
  if (p === "projects") return { route: "projects" };
  if (p === "project" && parts[1]) {
    const id = parseInt(parts[1]);
    if (!isNaN(id)) return { route: "project-detail", projectId: id };
  }
  if (p === "residential") return { route: "residential" };
  if (p === "commercial") return { route: "commercial" };
  if (p === "civil") return { route: "civil" };
  if (p === "industrial") return { route: "industrial" };
  if (p === "material") return { route: "material" };
  if (p === "matdb") return { route: "matdb" };
  if (p === "estimate") return { route: "estimate" };
  if (p === "settings") return { route: "settings" };
  if (p === "trash") return { route: "trash" };
  if (p === "assemblies") return { route: "assemblies" };
  // Library § …. Bare /library lands on Materials; Assemblies is still to come.
  if (p === "library") {
    if (parts[1] === "labor-rates") return { route: "library-labor-rates" };
    if (parts[1] === "modifiers") return { route: "library-modifiers" };
    if (!parts[1] || parts[1] === "materials") return { route: "library-materials" };
  }
  if (p === "admin") return { route: "admin" };
  // Default: show homepage
  return { route: "home" };
}

function getCurrentRouteState(): { route: Route; projectId?: number } {
  const hash = window.location.hash;
  if (hash && hash.length > 1) return pathToRoute(hash);
  return pathToRoute(window.location.pathname);
}

export default function HelixBidShell() {
  const {
    activeTab, setActiveTab,
    uiFontScale,
    setShowMaterialList,
    activeCategory, setActiveCategory,
  } = useApp();

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // ── URL-based routing using hash ──────────────────────────────────────────
  const [routeState, setRouteState] = useState<{ route: Route; projectId?: number }>(
    () => getCurrentRouteState()
  );
  const [previousRoute, setPreviousRoute] = useState<Route>("home");

  const { route, projectId: activeProjectId } = routeState;

  const navigate = useCallback((r: Route, id?: number) => {
    if (r === "home") {
      window.location.hash = "/home";
    } else if (r === "projects") {
      window.location.hash = "/projects";
    } else if (r === "project-detail" && id) {
      window.location.hash = `/project/${id}`;
    } else if (r === "library-materials") {
      window.location.hash = "/library/materials";
    } else if (r === "library-labor-rates") {
      window.location.hash = "/library/labor-rates";
    } else if (r === "library-modifiers") {
      window.location.hash = "/library/modifiers";
    } else {
      window.location.hash = `/${r}`;
    }
  }, []);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(previousRoute);
    }
  }, [navigate, previousRoute]);

  useEffect(() => {
    const onHashChange = () => {
      const state = getCurrentRouteState();
      setRouteState(prev => {
        setPreviousRoute(prev.route);
        return state;
      });
      const r = state.route;
      if (r === "civil" || r === "commercial" || r === "residential" || r === "industrial") {
        setActiveCategory(r);
        setActiveTab("projects");
      } else if (r === "settings") {
        setActiveTab("settings");
      } else if (r === "material") {
        setShowMaterialList(true);
      } else {
        setShowMaterialList(false);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    onHashChange();
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, [setActiveCategory, setActiveTab, setShowMaterialList]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const isOnHome          = route === "home";
  const isOnProjects      = route === "projects";
  const isOnProjectDetail = route === "project-detail";
  const isInCategory      = route === "civil" || route === "commercial" || route === "residential" || route === "industrial";
  const isInSettings      = route === "settings";
  const isInTrash         = route === "trash";
  const isInEstimate      = route === "estimate";
  const isInMaterial      = route === "material";
  const isInMatDb         = route === "matdb";
  const isInAssemblies    = route === "assemblies";
  const isInLibraryMats   = route === "library-materials";
  const isInLaborRates    = route === "library-labor-rates";
  const isInModifiers     = route === "library-modifiers";
  const isInAdmin         = route === "admin";

  const currentCategory = isInCategory
    ? (route as "civil" | "commercial" | "residential" | "industrial")
    : activeCategory;

  const openMaterialList = useCallback(() => navigate("material"), [navigate]);
  const closeMaterialList = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else navigate(currentCategory);
  }, [navigate, currentCategory]);

  // ── Content renderer ───────────────────────────────────────────────────────
  const renderContent = () => {
    if (isInMaterial)       return <MaterialListPage onBack={closeMaterialList} />;
    if (isInMatDb)          return <MaterialDatabasePage onBack={goBack} />;
    if (isOnHome)           return <HelixBidHomePage onGoToProjects={() => navigate("projects")} />;
    if (isOnProjects)       return <ProjectsPage />;
    if (isOnProjectDetail && activeProjectId) return (
      <ProjectDetailPage
        projectId={activeProjectId}
        onBack={() => navigate("projects")}
        onOpenMaterialList={openMaterialList}
      />
    );
    if (isInTrash)       return <TrashPage onBack={goBack} />;
    if (isInSettings)    return <SettingsTab onBack={goBack} />;
    if (isInEstimate)    return <EstimateEnginePage onBack={goBack} />;
    if (isInAssemblies)  return <AssemblyBuilderPage />;
    if (isInLibraryMats) return <MaterialsLibraryPage />;
    if (isInLaborRates)  return <LaborRatesPage />;
    if (isInModifiers)   return <ModifiersPage />;
    if (isInAdmin)       return <AdminSettingsPage />;
    // Legacy category workspace
    return <UnifiedProjects category={currentCategory} />;
  };

  const routeKey = route === "project-detail" ? `project-${activeProjectId}` : route;

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
        {/* Logo — click returns to homepage */}
        <div
          onClick={() => navigate("home")}
          className="flex items-center justify-center gap-2 px-3 py-4 h-16 border-b border-sidebar-border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          title="HelixBid Home"
        >
          <span
            className="font-bold text-[#F5C518] text-sm shrink-0 group-hover:hidden"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            HB
          </span>
          <span
            className="font-bold text-base whitespace-nowrap hidden group-hover:block transition-opacity duration-150"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span className="text-foreground">Helix</span><span className="text-[#F5C518]">Bid</span>
          </span>
        </div>

        {/* Nav items — top section */}
        <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
          <NavBtn
            onClick={() => navigate("home")}
            isActive={isOnHome}
            icon={Home}
            label="Home"
            title="Home"
          />
          <NavBtn
            onClick={() => navigate("projects")}
            isActive={isOnProjects || isOnProjectDetail}
            icon={FolderOpen}
            label="Projects"
            title="Projects"
          />
          <NavBtn
            onClick={() => navigate("matdb")}
            isActive={isInMatDb}
            icon={Package}
            label="Material Database"
            title="Material Database"
          />
          <NavBtn
            onClick={() => navigate("assemblies")}
            isActive={isInAssemblies}
            icon={Database}
            label="Assembly Builder"
            title="Assembly Builder"
          />
          <NavBtn
            onClick={() => navigate("library-materials")}
            isActive={isInLibraryMats}
            icon={Boxes}
            label="Materials"
            title="Materials (Library)"
          />
          <NavBtn
            onClick={() => navigate("library-labor-rates")}
            isActive={isInLaborRates}
            icon={HardHat}
            label="Labor Rates"
            title="Labor Rates (Library)"
          />
          <NavBtn
            onClick={() => navigate("library-modifiers")}
            isActive={isInModifiers}
            icon={SlidersHorizontal}
            label="Modifiers"
            title="Modifiers (Library)"
          />
        </nav>

        {/* Bottom section */}
        <div className="flex flex-col gap-1 p-2 border-t border-sidebar-border shrink-0">
          {/* Admin Settings — only visible to admin role */}
          {isAdmin && (
            <NavBtn
              onClick={() => navigate("admin")}
              isActive={isInAdmin}
              icon={Shield}
              label="Admin Settings"
              title="Admin Settings"
            />
          )}
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
            v5.50 · Field Edition
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
            onClick={() => navigate("home")}
          >
            HelixBid
          </span>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <ChevronRight size={12} />
            <span className="capitalize">
              {isOnHome          ? "Home"
                : isOnProjects       ? "Projects"
                : isOnProjectDetail  ? "Project"
                : isInTrash          ? "Trash"
                : isInSettings       ? "Settings"
                : isInEstimate       ? "Estimate Engine"
                : isInMaterial       ? "Labor & Material"
                : isInAssemblies     ? "Assembly Builder"
                : isInLibraryMats    ? "Materials"
                : isInAdmin          ? "Admin Settings"
                : "Workspace"}
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
        <button
          onClick={() => navigate("home")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150 relative",
            isOnHome ? "text-[#F5C518]" : "text-muted-foreground"
          )}
        >
          <Home size={18} className={isOnHome ? "text-[#F5C518]" : ""} />
          {isOnHome && <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#F5C518] rounded-b" />}
        </button>
        <button
          onClick={() => navigate("projects")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150 relative",
            (isOnProjects || isOnProjectDetail) ? "text-[#F5C518]" : "text-muted-foreground"
          )}
        >
          <FolderOpen size={18} className={(isOnProjects || isOnProjectDetail) ? "text-[#F5C518]" : ""} />
          {(isOnProjects || isOnProjectDetail) && <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#F5C518] rounded-b" />}
        </button>
        <button
          onClick={() => navigate("assemblies")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150 relative",
            isInAssemblies ? "text-[#F5C518]" : "text-muted-foreground"
          )}
        >
          <Database size={18} className={isInAssemblies ? "text-[#F5C518]" : ""} />
          {isInAssemblies && <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#F5C518] rounded-b" />}
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
    </div>
  );
}
