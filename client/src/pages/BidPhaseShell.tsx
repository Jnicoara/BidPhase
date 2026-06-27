/**
 * BidPhaseShell — Main layout shell
 * Desktop: fixed left sidebar (icon-only 64px, expands to 220px on hover)
 * Mobile:  fixed bottom navigation bar with 3 tabs
 * Design: Tactical Dark Mode SaaS, Safety Yellow accent (#F5C518)
 *
 * Each tab now embeds a PlanPanel on the left side — no standalone Plan Viewer tab.
 */
import { useApp } from "@/contexts/AppContext";
import CivilCalculator from "@/components/tabs/CivilCalculator";
import CommercialAssembly from "@/components/tabs/CommercialAssembly";
import ResidentialRoughIn from "@/components/tabs/ResidentialRoughIn";
import SettingsTab from "@/components/tabs/SettingsTab";
import ExportButton from "@/components/ExportButton";
import {
  Building2,
  Home,
  ChevronRight,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CivilIcon — conduits rising from underground into a panel cabinet.
 * Designed to match Lucide's Home / Building2 stroke style:
 *   strokeWidth 2, strokeLinecap round, strokeLinejoin round, no fill.
 *
 * Anatomy (24×24 grid):
 *   - Panel cabinet: rect 4,2 → 16,11  (w=16, h=9) with a horizontal bus bar inside
 *   - Ground line:   y=16 spanning x=2..22
 *   - Three conduits: vertical lines from y=11 down to y=16, then continuing
 *     underground as dashed stubs to y=21, with small entry knockouts at y=11
 */
function CivilIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Panel / CT cabinet body */}
      <rect x="3" y="2" width="18" height="10" rx="1.5" />
      {/* Bus bar inside panel */}
      <line x1="6" y1="7" x2="18" y2="7" />
      {/* Three conduit knockouts at panel bottom */}
      <circle cx="7.5" cy="12" r="0" />{/* anchor point only */}
      {/* Left conduit — exits panel bottom, goes underground */}
      <line x1="7.5" y1="12" x2="7.5" y2="16" />
      <line x1="7.5" y1="16" x2="7.5" y2="21" strokeDasharray="1.5 1.5" />
      {/* Center conduit */}
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="12" y1="16" x2="12" y2="21" strokeDasharray="1.5 1.5" />
      {/* Right conduit */}
      <line x1="16.5" y1="12" x2="16.5" y2="16" />
      <line x1="16.5" y1="16" x2="16.5" y2="21" strokeDasharray="1.5 1.5" />
      {/* Ground / grade line */}
      <line x1="2" y1="16" x2="22" y2="16" />
    </svg>
  );
}

const TABS = [
  { id: "residential", label: "Residential",      icon: Home,         short: "Res."  },
  { id: "commercial",  label: "Commercial",        icon: Building2,    short: "Comm." },
  { id: "civil",       label: "Civil / UG",        icon: CivilIcon,    short: "Civil" },
  { id: "settings",    label: "Settings",          icon: Settings,     short: "Set."  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function BidPhaseShell() {
  const { activeTab, setActiveTab, uiFontScale } = useApp();

  const renderTab = () => {
    switch (activeTab as TabId) {
      case "residential": return <ResidentialRoughIn />;
      case "commercial":  return <CommercialAssembly />;
      case "civil":       return <CivilCalculator />;
      case "settings":    return <SettingsTab />;
      default:            return <ResidentialRoughIn />;
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
            className="w-9 h-9 shrink-0 rounded-md object-contain bg-black p-0.5"
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
            const active = activeTab === id;
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
            v2.0 · Field Edition
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
            className="w-8 h-8 rounded-md object-contain bg-black p-0.5"
          />
          <span
            className="font-bold text-base text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            BidPhase
          </span>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <ChevronRight size={12} />
            <span className="capitalize">{activeTab}</span>
          </div>
        </header>

        {/* Tab content — font scale applied here so all em-based text scales */}
        <div
          className="flex-1 overflow-hidden tab-enter"
          key={activeTab}
          style={{ fontSize: `${uiFontScale}rem` }}
        >
          {renderTab()}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex bg-sidebar border-t border-border">
        {TABS.map(({ id, short, icon: Icon }) => {
          const active = activeTab === id;
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
      <ExportButton />
    </div>
  );
}
