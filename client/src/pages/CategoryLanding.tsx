/**
 * BidPhase — Category Landing Page
 *
 * Shown when the user clicks the BidPhase logo or first opens the app.
 * Three cards: Civil & Underground, Commercial Assembly, Residential Rough-In.
 * Each card navigates into the corresponding project store.
 *
 * Design: Tactical Dark Mode SaaS, Safety Yellow (#F5C518) accent.
 * Icons: same clean yellow stroke icons used in the left sidebar.
 */
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { CivilIcon, CommercialIcon, ResidentialIcon } from "@/components/tabs/UnifiedProjects";

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "civil" as const,
    label: "Civil & Underground",
    subtitle: "Conduit runs, duct banks, trenching, underground pulls",
    icon: CivilIcon,
    projectCount: (n: number) => `${n} project${n !== 1 ? "s" : ""}`,
  },
  {
    id: "commercial" as const,
    label: "Commercial Assembly",
    subtitle: "Panel feeds, branch circuits, device counts, assemblies",
    icon: CommercialIcon,
    projectCount: (n: number) => `${n} project${n !== 1 ? "s" : ""}`,
  },
  {
    id: "residential" as const,
    label: "Residential Rough-In",
    subtitle: "Room-by-room circuits, device rough-in, service entrance",
    icon: ResidentialIcon,
    projectCount: (n: number) => `${n} project${n !== 1 ? "s" : ""}`,
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────
export default function CategoryLanding({ onSelect }: { onSelect?: (cat: "civil" | "commercial" | "residential") => void } = {}) {
  const {
    setActiveCategory,
    setActiveTab,
    civilCatProjects,
    commercialCatProjects,
    residentialCatProjects,
  } = useApp();

  const counts: Record<string, number> = {
    civil: civilCatProjects.length,
    commercial: commercialCatProjects.length,
    residential: residentialCatProjects.length,
  };

  const handleSelect = (id: "civil" | "commercial" | "residential") => {
    if (onSelect) {
      onSelect(id);
    } else {
      setActiveCategory(id);
      setActiveTab("projects");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 bg-background">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img
            src="/manus-storage/bidphase-logo_e745a05f.png"
            alt="BidPhase"
            className="w-12 h-12 rounded-xl object-contain"
          />
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            BidPhase
          </h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Select a project category to open your estimating workspace.
          Each category keeps its own separate project list.
        </p>
      </div>

      {/* Category cards — all yellow accent, consistent with sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-3xl">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat.id)}
              className={cn(
                "group relative flex flex-col items-start gap-4 p-6 rounded-2xl border bg-gradient-to-br text-left",
                "transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]",
                "from-[#F5C518]/8 to-[#F5C518]/3 border-[#F5C518]/25 hover:border-[#F5C518]/60"
              )}
              style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.25)" }}
            >
              {/* Icon — same yellow as sidebar, larger for card context */}
              <div className="p-3 rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/20">
                <Icon size={28} className="text-[#F5C518]" />
              </div>

              {/* Text */}
              <div className="flex-1">
                <h2
                  className="text-base font-bold text-foreground mb-1 leading-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {cat.label}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {cat.subtitle}
                </p>
              </div>

              {/* Project count badge */}
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border text-[#F5C518] border-[#F5C518]/30 bg-[#F5C518]/10">
                  {cat.projectCount(counts[cat.id] ?? 0)}
                </span>
                <span className="text-xs font-medium text-[#F5C518] opacity-0 group-hover:opacity-100 transition-opacity">
                  Open →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <p className="mt-10 text-[11px] text-muted-foreground/50 font-mono">
        Click the BidPhase logo at any time to return here
      </p>
    </div>
  );
}
