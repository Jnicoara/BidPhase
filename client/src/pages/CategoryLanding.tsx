/**
 * BidPhase — Category Landing Page
 *
 * Design: Tactical Dark Mode SaaS, Safety Yellow (#F5C518) accent.
 * - Single "Electrical" card combines all 4 legacy categories
 * - Backend data models unchanged
 */
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { ElectricalIcon } from "@/components/tabs/UnifiedProjects";

// ─── Component ──────────────────────────────────────────────────────────────────────────────────────
export default function CategoryLanding({ onSelect }: { onSelect?: (cat: "civil" | "commercial" | "residential" | "industrial") => void } = {}) {
  const {
    setActiveCategory,
    setActiveTab,
    civilCatProjects,
    commercialCatProjects,
    residentialCatProjects,
    industrialCatProjects,
  } = useApp();

  const totalProjects =
    civilCatProjects.length +
    commercialCatProjects.length +
    residentialCatProjects.length +
    industrialCatProjects.length;

  const handleElectricalSelect = () => {
    // Default to "civil" (Infrastructure) as the entry point
    const cat = "civil" as const;
    if (onSelect) {
      onSelect(cat);
    } else {
      setActiveCategory(cat);
      setActiveTab("projects");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Header ────────────────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center pt-16 pb-10 px-6 shrink-0">
        <h1
          className="text-4xl font-black tracking-tight text-foreground mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Bid<span className="text-[#F5C518]">Phase</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Open your estimating workspace.
        </p>
      </div>

      {/* ── Single Electrical card ────────────────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-8">
        <button
          onClick={handleElectricalSelect}
          className={cn(
            "group relative rounded-2xl border border-border bg-card",
            "flex flex-col items-start justify-between",
            "px-10 py-12 w-full max-w-sm min-h-[240px]",
            "hover:border-[#F5C518]/60 hover:bg-[#F5C518]/5",
            "transition-all duration-200 text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]/50"
          )}
          style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.25)" }}
        >
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/20 flex items-center justify-center mb-4">
            <ElectricalIcon size={24} className="text-[#F5C518]" />
          </div>

          {/* Label */}
          <div className="flex-1 flex flex-col justify-center w-full">
            <h2
              className="text-3xl font-bold text-foreground group-hover:text-[#F5C518] transition-colors duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Electrical
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Residential · Commercial · Industrial · Infrastructure
            </p>
          </div>

          {/* Project count badge */}
          <div className="mt-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-muted/40 text-muted-foreground border border-border/50 group-hover:border-[#F5C518]/30 group-hover:text-[#F5C518]/80 transition-all">
              {totalProjects} project{totalProjects !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Hover arrow */}
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* ── Footer hint ────────────────────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center pb-8 shrink-0">
        <p className="text-[11px] text-muted-foreground/40 font-mono tracking-wide">
          Click the BidPhase logo at any time to return here
        </p>
      </div>
    </div>
  );
}
