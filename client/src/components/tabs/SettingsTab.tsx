/**
 * BidPhase — Settings Tab
 * UI preferences: font size scale, and future settings.
 */
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "S",  value: 0.85, title: "Small"    },
  { label: "M",  value: 1.0,  title: "Medium"   },
  { label: "L",  value: 1.15, title: "Large"    },
  { label: "XL", value: 1.3,  title: "X-Large"  },
];

export default function SettingsTab() {
  const { uiFontScale, setUiFontScale } = useApp();

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-lg mx-auto">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">Adjust the app to your preference.</p>
      </div>

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
          {PRESETS.map(({ label, value, title }) => (
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
