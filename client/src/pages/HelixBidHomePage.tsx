/**
 * HelixBidHomePage
 * Dedicated landing page reached by clicking the BP logo.
 * Clean branded entry point with CTA to navigate to Projects.
 */
import { Zap, FolderOpen, BarChart3, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_VERSION_LABEL } from "@shared/version";

interface HelixBidHomePageProps {
  onGoToProjects: () => void;
}

const FEATURES = [
  {
    icon: FolderOpen,
    title: "Project Management",
    desc: "Organize bids by project. Track status from Bidding to Won.",
  },
  {
    icon: Zap,
    title: "PDF Takeoff",
    desc: "Upload plan sheets, set scale, and measure conduit runs directly on the PDF.",
  },
  {
    icon: BarChart3,
    title: "Bid Summary",
    desc: "Apply labor factors, markup, and generate a complete bid total in seconds.",
  },
  {
    icon: Package,
    title: "BOM & RFQ",
    desc: "Aggregate your material list and export a clean RFQ with one click.",
  },
];

export default function HelixBidHomePage({ onGoToProjects }: HelixBidHomePageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Hero ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Logo mark */}
        <div className="w-20 h-20 rounded-2xl bg-[#F5C518]/10 border border-[#F5C518]/20 flex items-center justify-center mb-8 shadow-lg shadow-[#F5C518]/5">
          <span
            className="font-bold text-[#F5C518] text-3xl select-none"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            HB
          </span>
        </div>

        {/* Wordmark */}
        <h1
          className="text-5xl font-bold tracking-tight mb-3"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <span className="text-foreground">Helix</span><span className="text-[#F5C518]">Bid</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mb-10">
          Electrical estimating built for the field. Fast takeoffs, accurate bids, less paperwork.
        </p>

        {/* CTA */}
        <button
          onClick={onGoToProjects}
          className={cn(
            "flex items-center gap-2.5 px-8 py-4 rounded-xl",
            "bg-[#F5C518] hover:bg-[#e6b800] text-black font-bold text-lg",
            "transition-all duration-150 active:scale-[0.97] shadow-lg shadow-[#F5C518]/20",
            "hover:shadow-xl hover:shadow-[#F5C518]/30"
          )}
        >
          <FolderOpen size={22} />
          Go to Projects
        </button>
      </div>

      {/* ── Feature grid ── */}
      <div className="border-t border-border/40 px-6 py-12">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border/40"
            >
              <div className="w-10 h-10 rounded-lg bg-[#F5C518]/10 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-[#F5C518]" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border/40 py-4 text-center">
        <p className="text-xs text-muted-foreground/40 font-mono tracking-wide">
          {APP_VERSION_LABEL}
        </p>
      </div>
    </div>
  );
}
