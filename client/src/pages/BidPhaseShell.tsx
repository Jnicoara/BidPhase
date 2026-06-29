/**
 * BidPhaseShell — Main layout shell
 * Desktop: fixed left sidebar (icon-only 64px, expands to 220px on hover)
 * Mobile:  fixed bottom navigation bar
 * Design: Tactical Dark Mode SaaS, Safety Yellow accent (#F5C518)
 *
 * Unified tab: single "Projects" tab replaces the three separate Civil/Commercial/Residential tabs.
 */
import { useApp } from "@/contexts/AppContext";
import UnifiedProjects, { CivilIcon } from "@/components/tabs/UnifiedProjects";
import SettingsTab from "@/components/tabs/SettingsTab";
import ExportButton from "@/components/ExportButton";
import MaterialListPage from "@/pages/MaterialListPage";
import {
  FolderOpen,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "projects",  label: "Projects",  icon: FolderOpen,  short: "Jobs"  },
  { id: "settings",  label: "Settings",  icon: Settings,    short: "Set."  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function BidPhaseShell() {
  const { activeTab, setActiveTab, uiFontScale, showMaterialList, setShowMaterialList } = useApp();

  const renderTab = () => {
    switch (activeTab as TabId) {
      case "projects":  return <UnifiedProjects />;
      case "settings":  return <SettingsTab />;
      default:          return <UnifiedProjects />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* ── Desktop Sidebar ─────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col shrink-0 w-16 hover:w-56 transition-[width] duration-200 ease-out
                   bg-sidebar border-r border-sidebar-border overflow-hidden group z-20"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 h-16 border-b border-sidebar-border shrink-0">
          <img
            src="/manus-storage/bidphase-logo_e745a05f.png"
            alt="BidPhase"
            className="w-9 h-9 shrink-0 rounded-md object-contain bg-sidebar p-0.5"
          />
          <span
            className="font-display font-bold text-base text-foreground whitespace-nowrap
                       opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            BidPhase
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id || (activeTab !== "settings" && id === "projects");
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-3 rounded-md text-sm font-medium transition-all duration-150",
                  "hover:bg-accent hover:text-accent-foreground",
                  active
                    ? "bp-tab-active text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon
                  size={20}
                  className={cn("shrink-0", active ? "text-[#F5C518]" : "")}
                />
                <span
                  className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {label}
                </span>
              </button>
            );
          })}
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
          <img
            src="/manus-storage/bidphase-logo_e745a05f.png"
            alt="BidPhase"
            className="w-8 h-8 rounded-md object-contain bg-sidebar p-0.5"
          />
          <span
            className="font-bold text-base text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            BidPhase
          </span>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <ChevronRight size={12} />
            <span className="capitalize">{activeTab === "projects" ? "Projects" : activeTab}</span>
          </div>
        </header>

        {/* Tab content — font scale applied here so all em-based text scales */}
        <div
          className="flex-1 overflow-hidden tab-enter"
          key={showMaterialList ? "material-list" : activeTab}
          style={{ fontSize: `${uiFontScale}rem` }}
        >
          {showMaterialList
            ? <MaterialListPage onBack={() => setShowMaterialList(false)} />
            : renderTab()
          }
        </div>
      </main>

      {/* ── Mobile Bottom Nav ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex bg-sidebar border-t border-border">
        {TABS.map(({ id, short, icon: Icon }) => {
          const active = activeTab === id || (activeTab !== "settings" && id === "projects");
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150",
                active ? "text-[#F5C518]" : "text-muted-foreground"
              )}
            >
              <Icon size={20} className={active ? "text-[#F5C518]" : ""} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{short}</span>
              {active && (
                <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#F5C518] rounded-b" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Floating Export Button ───────────────────────────────── */}
      {!showMaterialList && <ExportButton onOpenMaterialList={() => setShowMaterialList(true)} />}
    </div>
  );
}
