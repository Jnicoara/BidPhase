/**
 * BidPhaseShell — Main layout shell
 * Desktop: fixed left sidebar (icon-only 64px, expands to 220px on hover)
 * Mobile:  fixed bottom navigation bar
 * Design: Tactical Dark Mode SaaS, Safety Yellow accent (#F5C518)
 *
 * Sidebar behaviour:
 *  - On the landing page: only the Settings icon is shown (no folder icon).
 *  - Inside a category: the active category icon replaces the folder icon.
 *    Clicking it opens the project list for that category.
 *    Clicking the logo returns to the landing page.
 */
import { useApp } from "@/contexts/AppContext";
import { useState } from "react";
import UnifiedProjects, { CivilIcon, CommercialIcon, ResidentialIcon } from "@/components/tabs/UnifiedProjects";
import SettingsTab from "@/components/tabs/SettingsTab";
import ExportButton from "@/components/ExportButton";
import MaterialListPage from "@/pages/MaterialListPage";
import CategoryLanding from "@/pages/CategoryLanding";
import { Settings, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Category icon map ────────────────────────────────────────────────────────
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

  // showLanding: true = show the category landing page
  const [showLanding, setShowLanding] = useState(true);

  const isOnLanding = showLanding && !showMaterialList;
  const isInCategory = !isOnLanding && activeTab === "projects";

  const renderTab = () => {
    switch (activeTab) {
      case "projects":  return <UnifiedProjects category={activeCategory} />;
      case "settings":  return <SettingsTab />;
      default:          return <UnifiedProjects category={activeCategory} />;
    }
  };

  // The active category icon component (or null on landing)
  const CategoryIcon = isInCategory ? CATEGORY_ICONS[activeCategory] : null;
  const categoryLabel = isInCategory ? CATEGORY_LABELS[activeCategory] : "";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* ── Desktop Sidebar ─────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col shrink-0 w-16 hover:w-56 transition-[width] duration-200 ease-out
                   bg-sidebar border-r border-sidebar-border overflow-hidden group z-20"
      >
        {/* Logo — text only, click returns to landing */}
        <div
          onClick={() => { setShowLanding(true); setActiveTab("projects"); }}
          className="flex items-center justify-center gap-2 px-3 py-4 h-16 border-b border-sidebar-border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          title="Back to home"
        >
          {/* Collapsed: show "BP" monogram; expanded: show full wordmark */}
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
          {/* Category icon — only shown when inside a category */}
          {CategoryIcon && (
            <button
              onClick={() => setActiveTab("projects")}
              className={cn(
                "flex items-center gap-3 px-2.5 py-3 rounded-md text-sm font-medium transition-all duration-150",
                "hover:bg-accent hover:text-accent-foreground",
                activeTab === "projects"
                  ? "bp-tab-active text-foreground"
                  : "text-muted-foreground"
              )}
              title={categoryLabel}
            >
              <CategoryIcon
                size={20}
                className={cn("shrink-0", activeTab === "projects" ? "text-[#F5C518]" : "")}
              />
              <span
                className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 truncate"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {categoryLabel}
              </span>
            </button>
          )}

          {/* Settings — always visible */}
          <button
            onClick={() => { setActiveTab("settings"); setShowLanding(false); }}
            className={cn(
              "flex items-center gap-3 px-2.5 py-3 rounded-md text-sm font-medium transition-all duration-150",
              "hover:bg-accent hover:text-accent-foreground",
              activeTab === "settings"
                ? "bp-tab-active text-foreground"
                : "text-muted-foreground"
            )}
          >
            <Settings
              size={20}
              className={cn("shrink-0", activeTab === "settings" ? "text-[#F5C518]" : "")}
            />
            <span
              className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Settings
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
            onClick={() => { setShowLanding(true); setActiveTab("projects"); }}
          >
            BidPhase
          </span>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <ChevronRight size={12} />
            <span className="capitalize">
              {isOnLanding ? "Home" : activeTab === "projects" ? categoryLabel : "Settings"}
            </span>
          </div>
        </header>

        {/* Tab content — font scale applied here so all em-based text scales */}
        <div
          className="flex-1 overflow-hidden tab-enter"
          key={showMaterialList ? "material-list" : isOnLanding ? "landing" : activeTab}
          style={{ fontSize: `${uiFontScale}rem` }}
        >
          {showMaterialList
            ? <MaterialListPage onBack={() => setShowMaterialList(false)} />
            : isOnLanding
            ? <CategoryLanding onSelect={(cat) => {
                setActiveCategory(cat);
                setShowLanding(false);
                setActiveTab("projects");
              }} />
            : renderTab()
          }
        </div>
      </main>

      {/* ── Mobile Bottom Nav ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex bg-sidebar border-t border-border">
        {/* Category button — only shown when inside a category */}
        {CategoryIcon && (
          <button
            onClick={() => setActiveTab("projects")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150 relative",
              activeTab === "projects" ? "text-[#F5C518]" : "text-muted-foreground"
            )}
          >
            <CategoryIcon size={20} className={activeTab === "projects" ? "text-[#F5C518]" : ""} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Projects</span>
            {activeTab === "projects" && (
              <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#F5C518] rounded-b" />
            )}
          </button>
        )}

        {/* Settings */}
        <button
          onClick={() => { setActiveTab("settings"); setShowLanding(false); }}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150 relative",
            activeTab === "settings" ? "text-[#F5C518]" : "text-muted-foreground"
          )}
        >
          <Settings size={20} className={activeTab === "settings" ? "text-[#F5C518]" : ""} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Settings</span>
          {activeTab === "settings" && (
            <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#F5C518] rounded-b" />
          )}
        </button>
      </nav>

      {/* ── Floating Export Button ───────────────────────────────── */}
      {!showMaterialList && !isOnLanding && <ExportButton onOpenMaterialList={() => setShowMaterialList(true)} />}
    </div>
  );
}
