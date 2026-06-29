/**
 * BidPhase — Category Landing Page
 *
 * Design: Tactical Dark Mode SaaS, Safety Yellow (#F5C518) accent.
 * - Text-only logo (no B icon)
 * - All three cards use the same CivilIcon (conduit rack) in yellow
 * - No descriptions under card names
 * - Shortened names: "Civil & Underground", "Commercial", "Residential"
 * - Expanded layout to fill the screen
 */
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { CivilIcon } from "@/components/tabs/UnifiedProjects";

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "civil" as const,
    label: "Civil & Underground",
    projectCount: (n: number) => `${n} project${n !== 1 ? "s" : ""}`,
  },
  {
    id: "commercial" as const,
    label: "Commercial",
    projectCount: (n: number) => `${n} project${n !== 1 ? "s" : ""}`,
  },
  {
    id: "residential" as const,
    label: "Residential",
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
    <div className="flex flex-col items-center justify-center min-h-full px-8 py-16 bg-background">
      {/* Header — text only, no B icon */}
      <div className="text-center mb-16">
        <h1
          className="text-4xl font-bold text-foreground tracking-tight mb-3"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          BidPhase
        </h1>
        <p className="text-muted-foreground text-sm">
          Select a project category to open your estimating workspace.
        </p>
      </div>

      {/* Category cards — all yellow, same icon, no descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat.id)}
            className={cn(
              "group relative flex flex-col items-center gap-6 px-8 py-10 rounded-2xl border text-center",
              "transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]",
              "bg-[#F5C518]/5 border-[#F5C518]/20 hover:border-[#F5C518]/60 hover:bg-[#F5C518]/10"
            )}
            style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.3)" }}
          >
            {/* Icon — same conduit rack icon for all three, large */}
            <div className="p-5 rounded-2xl bg-[#F5C518]/10 border border-[#F5C518]/25 group-hover:bg-[#F5C518]/20 transition-colors">
              <CivilIcon size={40} className="text-[#F5C518]" />
            </div>

            {/* Name */}
            <h2
              className="text-lg font-bold text-foreground leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {cat.label}
            </h2>

            {/* Project count badge */}
            <span className="text-[11px] font-mono px-3 py-1 rounded-full border text-[#F5C518] border-[#F5C518]/30 bg-[#F5C518]/10">
              {cat.projectCount(counts[cat.id] ?? 0)}
            </span>

            {/* Hover arrow */}
            <span className="text-sm font-medium text-[#F5C518] opacity-0 group-hover:opacity-100 transition-opacity -mt-2">
              Open →
            </span>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <p className="mt-14 text-[11px] text-muted-foreground/40 font-mono">
        Click the BidPhase logo at any time to return here
      </p>
    </div>
  );
}
