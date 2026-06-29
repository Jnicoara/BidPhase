/**
 * BidPhase — Category Landing Page
 *
 * Design: Tactical Dark Mode SaaS, Safety Yellow (#F5C518) accent.
 * - Text-only logo (no B icon)
 * - No icons on category cards — clean text-only cards
 * - No descriptions under card names
 * - Shortened names: "Civil & Underground", "Commercial", "Residential"
 * - Expanded layout to fill the screen
 */
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "residential" as const, label: "Residential" },
  { id: "commercial" as const, label: "Commercial" },
  { id: "civil" as const, label: "Civil & Underground" },
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
    <div className="flex flex-col h-full bg-background">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center pt-16 pb-10 px-6 shrink-0">
        <h1
          className="text-4xl font-black tracking-tight text-foreground mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Bid<span className="text-[#F5C518]">Phase</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Select a project category to open your estimating workspace.
        </p>
      </div>

      {/* ── Category cards ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {CATEGORIES.map((cat) => {
            const count = counts[cat.id] ?? 0;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat.id)}
                className={cn(
                  "group relative rounded-2xl border border-border bg-card",
                  "flex flex-col items-start justify-between",
                  "px-8 py-10 min-h-[200px]",
                  "hover:border-[#F5C518]/60 hover:bg-[#F5C518]/5",
                  "transition-all duration-200 text-left",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]/50"
                )}
                style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.25)" }}
              >
                {/* Category name */}
                <div className="flex-1 flex flex-col justify-center w-full">
                  <h2
                    className="text-2xl font-bold text-foreground group-hover:text-[#F5C518] transition-colors duration-200"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {cat.label}
                  </h2>
                </div>

                {/* Project count badge */}
                <div className="mt-6">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-muted/40 text-muted-foreground border border-border/50 group-hover:border-[#F5C518]/30 group-hover:text-[#F5C518]/80 transition-all">
                    {count} project{count !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Hover arrow */}
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Footer hint ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center pb-8 shrink-0">
        <p className="text-[11px] text-muted-foreground/40 font-mono tracking-wide">
          Click the BidPhase logo at any time to return here
        </p>
      </div>
    </div>
  );
}
