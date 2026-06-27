/**
 * BidPhase — Tab 2: Civil & Underground (Conduit Calculator)
 * Inputs: Total Distance (ft), Number of Conductors
 * Outputs: Pipe sticks, Couplings, Total wire length (with 10% makeup)
 * Design: Tactical Dark Mode SaaS, Safety Yellow accent
 */
import { useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Zap, Package, Link2, Cable } from "lucide-react";

function calcOutputs(distance: number, conductors: number) {
  if (distance <= 0) return { sticks: 0, couplings: 0, wireLength: 0 };
  const sticks = Math.ceil(distance / 10);
  const couplings = Math.max(sticks - 1, 0);
  const wireLength = parseFloat((distance * conductors * 1.1).toFixed(1));
  return { sticks, couplings, wireLength };
}

interface OutputCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  flash?: boolean;
}

function OutputCard({ icon, label, value, unit, flash }: OutputCardProps) {
  return (
    <div className="bp-card p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "text-4xl font-bold tracking-tight",
          flash && "num-flash"
        )}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground font-mono">{unit}</div>
    </div>
  );
}

export default function CivilCalculator() {
  const { civilState, setCivilState } = useApp();
  const { distance, conductors } = civilState;
  const { sticks, couplings, wireLength } = calcOutputs(distance, conductors);

  // Flash trigger on value change
  const flashRef = useRef(false);
  useEffect(() => {
    flashRef.current = true;
    const t = setTimeout(() => { flashRef.current = false; }, 400);
    return () => clearTimeout(t);
  }, [sticks, couplings, wireLength]);

  const setDistance = (v: number) =>
    setCivilState({ ...civilState, distance: v });
  const setConductors = (v: number) =>
    setCivilState({ ...civilState, conductors: v });

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F5C518]/15 flex items-center justify-center">
            <Zap size={18} className="text-[#F5C518]" />
          </div>
          <div>
            <h1
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Civil & Underground
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conduit run calculator — pipe, couplings, and wire
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* ── Inputs ────────────────────────────────────────────── */}
          <div className="bp-card p-5 space-y-6">
            <h2
              className="text-sm font-semibold text-muted-foreground uppercase tracking-wider"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Inputs
            </h2>

            {/* Distance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Total Distance</Label>
                <span className="text-xs text-muted-foreground font-mono">feet</span>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={distance || ""}
                  onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="font-mono text-lg h-12 bg-input border-border text-foreground"
                />
                <span className="text-muted-foreground text-sm font-mono shrink-0">ft</span>
              </div>
              {distance === 0 && (
                <p className="text-xs text-[#F5C518] font-mono">
                  ↑ Enter distance manually, or push from Plan Viewer
                </p>
              )}
            </div>

            {/* Conductors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Number of Conductors</Label>
                <span
                  className="text-2xl font-bold text-[#F5C518]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {conductors}
                </span>
              </div>
              <Slider
                min={1}
                max={12}
                step={1}
                value={[conductors]}
                onValueChange={([v]) => setConductors(v)}
                className="[&_[role=slider]]:bg-[#F5C518] [&_[role=slider]]:border-[#F5C518]
                           [&_.bg-primary]:bg-[#F5C518]"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>1</span>
                <span>3</span>
                <span>6</span>
                <span>9</span>
                <span>12</span>
              </div>
            </div>
          </div>

          {/* ── Outputs ───────────────────────────────────────────── */}
          <div>
            <h2
              className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Calculated Outputs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <OutputCard
                icon={<Package size={13} />}
                label="10-ft Pipe Sticks"
                value={sticks}
                unit={`⌈${distance} ÷ 10⌉ = ${sticks} sticks`}
                flash={flashRef.current}
              />
              <OutputCard
                icon={<Link2 size={13} />}
                label="Couplings Required"
                value={couplings}
                unit={`${sticks} sticks − 1 = ${couplings}`}
                flash={flashRef.current}
              />
              <OutputCard
                icon={<Cable size={13} />}
                label="Total Wire Length"
                value={wireLength}
                unit={`${distance} ft × ${conductors} cond. × 1.10 slack`}
                flash={flashRef.current}
              />
            </div>
          </div>

          {/* ── Formula reference ─────────────────────────────────── */}
          <div className="bp-card p-4 space-y-2">
            <p
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Formula Reference
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-muted-foreground">
              <div className="space-y-0.5">
                <p className="text-foreground font-semibold">Pipe Sticks</p>
                <p>⌈ Distance ÷ 10 ⌉</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-foreground font-semibold">Couplings</p>
                <p>Sticks − 1</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-foreground font-semibold">Wire Length</p>
                <p>Distance × Conductors × 1.10</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
