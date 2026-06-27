/**
 * BidPhase — Settings Tab
 * UI preferences: theme (Light / Dark) and font size scale.
 */
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Sun, Moon } from "lucide-react";

const FONT_PRESETS = [
  { label: "S",  value: 0.85, title: "Small"   },
  { label: "M",  value: 1.0,  title: "Medium"  },
  { label: "L",  value: 1.15, title: "Large"   },
  { label: "XL", value: 1.3,  title: "X-Large" },
];

export default function SettingsTab() {
  const { uiFontScale, setUiFontScale } = useApp();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-lg mx-auto">
      <div>
        <h2
          className="text-lg font-bold text-foreground mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">Adjust the app to your preference.</p>
      </div>

      {/* ── Appearance ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Appearance</h3>
          <p className="text-xs text-muted-foreground">
            Choose between Light and Dark mode. Your preference is saved automatically.
          </p>
        </div>

        {/* Light / Dark toggle cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Light mode card */}
          <button
            onClick={() => isDark && toggleTheme?.()}
            className={cn(
              "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
              !isDark
                ? "border-[#F5C518] bg-[var(--bp-yellow-dim)]"
                : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/30"
            )}
          >
            {/* Mini light-mode preview */}
            <div className="w-full rounded-md overflow-hidden border border-border/50 shadow-sm">
              <div className="h-5 bg-[#e8eaf0] flex items-center gap-1 px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d0d3de]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#d0d3de]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#d0d3de]" />
              </div>
              <div className="h-12 bg-[#f5f6fa] flex gap-1.5 p-1.5">
                <div className="w-6 bg-[#e8eaf0] rounded-sm" />
                <div className="flex-1 space-y-1">
                  <div className="h-2 bg-[#d8dae3] rounded-sm w-3/4" />
                  <div className="h-2 bg-[#e8eaf0] rounded-sm w-1/2" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Sun size={13} className={!isDark ? "text-[#D4A900]" : "text-muted-foreground"} />
              <span
                className={cn("text-xs font-semibold", !isDark ? "text-foreground" : "text-muted-foreground")}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Light
              </span>
            </div>

            {!isDark && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F5C518]" />
            )}
          </button>

          {/* Dark mode card */}
          <button
            onClick={() => !isDark && toggleTheme?.()}
            className={cn(
              "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
              isDark
                ? "border-[#F5C518] bg-[var(--bp-yellow-dim)]"
                : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/30"
            )}
          >
            {/* Mini dark-mode preview */}
            <div className="w-full rounded-md overflow-hidden border border-white/10 shadow-sm">
              <div className="h-5 bg-[#1a1d27] flex items-center gap-1 px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2a2d3a]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#2a2d3a]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#2a2d3a]" />
              </div>
              <div className="h-12 bg-[#0f1117] flex gap-1.5 p-1.5">
                <div className="w-6 bg-[#1a1d27] rounded-sm" />
                <div className="flex-1 space-y-1">
                  <div className="h-2 bg-[#2a2d3a] rounded-sm w-3/4" />
                  <div className="h-2 bg-[#1a1d27] rounded-sm w-1/2" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Moon size={13} className={isDark ? "text-[#F5C518]" : "text-muted-foreground"} />
              <span
                className={cn("text-xs font-semibold", isDark ? "text-foreground" : "text-muted-foreground")}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Dark
              </span>
            </div>

            {isDark && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F5C518]" />
            )}
          </button>
        </div>
      </section>

      {/* ── Font Size ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Font Size</h3>
          <p className="text-xs text-muted-foreground">
            Scales all UI text. Useful on large monitors or when working at a distance.
          </p>
        </div>

        {/* Preset buttons */}
        <div className="flex gap-2">
          {FONT_PRESETS.map(({ label, value, title }) => (
            <button
              key={label}
              title={title}
              onClick={() => setUiFontScale(value)}
              className={cn(
                "flex-1 py-2 rounded-md border text-sm font-semibold transition-all",
                Math.abs(uiFontScale - value) < 0.01
                  ? "bg-[#F5C518] border-[#F5C518] text-black"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Fine-grained slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Smaller</span>
            <span className="font-mono text-foreground">{Math.round(uiFontScale * 100)}%</span>
            <span>Larger</span>
          </div>
          <input
            type="range"
            min={0.8}
            max={1.4}
            step={0.05}
            value={uiFontScale}
            onChange={(e) => setUiFontScale(parseFloat(e.target.value))}
            className="w-full accent-[#F5C518] cursor-pointer"
          />
        </div>

        {/* Live preview */}
        <div className="rounded-md border border-border bg-muted/20 p-4 space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Preview</p>
          <p style={{ fontSize: `calc(${uiFontScale} * 13px)` }} className="text-foreground font-medium">
            Run 1 — 142.5 ft · EMT ¾"
          </p>
          <p style={{ fontSize: `calc(${uiFontScale} * 11px)` }} className="text-muted-foreground">
            Conductors: 3 × #12 AWG Cu · Page 2
          </p>
          <p style={{ fontSize: `calc(${uiFontScale} * 10px)` }} className="text-muted-foreground font-mono">
            Fittings: 4 × Connectors · 2 × 90° Ells
          </p>
        </div>
      </section>

      {/* ── Future settings placeholder ───────────────────────────── */}
      <section className="space-y-3 opacity-40 pointer-events-none select-none">
        <h3 className="text-sm font-semibold text-foreground">Units</h3>
        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-md border border-border text-sm font-semibold bg-[#F5C518] border-[#F5C518] text-black">
            Imperial (ft)
          </button>
          <button className="flex-1 py-2 rounded-md border border-border text-sm font-semibold text-muted-foreground">
            Metric (m)
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">Metric units — coming soon.</p>
      </section>
    </div>
  );
}
