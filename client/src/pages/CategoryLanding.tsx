/**
 * BidPhase — Category Landing Page
 *
 * Shown when the user clicks the BidPhase logo or first opens the app.
 * Three cards: Civil & Underground, Commercial Assembly, Residential Rough-In.
 * Each card navigates into the corresponding project store.
 *
 * Design: Tactical Dark Mode SaaS, Safety Yellow (#F5C518) accent.
 */
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "civil" as const,
    label: "Civil & Underground",
    subtitle: "Conduit runs, duct banks, trenching, underground pulls",
    color: "#F5C518",
    bg: "from-[#F5C518]/10 to-[#F5C518]/5",
    border: "border-[#F5C518]/30 hover:border-[#F5C518]/70",
    icon: (
      // Conduit pipe cross-section icon
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <rect x="4" y="14" width="32" height="12" rx="6" fill="none" stroke="#F5C518" strokeWidth="2.5"/>
        <circle cx="20" cy="20" r="4" fill="#F5C518" opacity="0.7"/>
        <rect x="4" y="14" width="32" height="12" rx="6" fill="url(#cg)" opacity="0.15"/>
        <defs>
          <linearGradient id="cg" x1="4" y1="14" x2="36" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5C518"/>
            <stop offset="1" stopColor="#F5C518" stopOpacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    projectCount: (n: number) => `${n} project${n !== 1 ? "s" : ""}`,
  },
  {
    id: "commercial" as const,
    label: "Commercial Assembly",
    subtitle: "Panel feeds, branch circuits, device counts, assemblies",
    color: "#60A5FA",
    bg: "from-blue-500/10 to-blue-500/5",
    border: "border-blue-500/30 hover:border-blue-500/70",
    icon: (
      // Panel / breaker box icon
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <rect x="6" y="6" width="28" height="28" rx="4" stroke="#60A5FA" strokeWidth="2.5" fill="none"/>
        <rect x="10" y="12" width="8" height="4" rx="1.5" fill="#60A5FA" opacity="0.8"/>
        <rect x="22" y="12" width="8" height="4" rx="1.5" fill="#60A5FA" opacity="0.5"/>
        <rect x="10" y="20" width="8" height="4" rx="1.5" fill="#60A5FA" opacity="0.5"/>
        <rect x="22" y="20" width="8" height="4" rx="1.5" fill="#60A5FA" opacity="0.8"/>
        <rect x="10" y="28" width="20" height="2" rx="1" fill="#60A5FA" opacity="0.3"/>
      </svg>
    ),
    projectCount: (n: number) => `${n} project${n !== 1 ? "s" : ""}`,
  },
  {
    id: "residential" as const,
    label: "Residential Rough-In",
    subtitle: "Room-by-room circuits, device rough-in, service entrance",
    color: "#34D399",
    bg: "from-emerald-500/10 to-emerald-500/5",
    border: "border-emerald-500/30 hover:border-emerald-500/70",
    icon: (
      // House / outlet icon
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <path d="M20 6L34 18V34H6V18L20 6Z" stroke="#34D399" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
        <rect x="14" y="22" width="12" height="10" rx="2" stroke="#34D399" strokeWidth="2" fill="none"/>
        <circle cx="17" cy="27" r="1.5" fill="#34D399" opacity="0.8"/>
        <circle cx="23" cy="27" r="1.5" fill="#34D399" opacity="0.8"/>
      </svg>
    ),
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

      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-3xl">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat.id)}
            className={cn(
              "group relative flex flex-col items-start gap-4 p-6 rounded-2xl border bg-gradient-to-br text-left",
              "transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]",
              cat.bg, cat.border
            )}
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.25)" }}
          >
            {/* Icon */}
            <div className="p-2.5 rounded-xl bg-card/60 border border-white/5">
              {cat.icon}
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
              <span
                className="text-[11px] font-mono px-2 py-0.5 rounded-full border"
                style={{
                  color: cat.color,
                  borderColor: `${cat.color}40`,
                  background: `${cat.color}15`,
                }}
              >
                {cat.projectCount(counts[cat.id] ?? 0)}
              </span>
              <span
                className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: cat.color }}
              >
                Open →
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <p className="mt-10 text-[11px] text-muted-foreground/50 font-mono">
        Click the BidPhase logo at any time to return here
      </p>
    </div>
  );
}
