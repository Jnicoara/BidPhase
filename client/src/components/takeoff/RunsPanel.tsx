/**
 * RunsPanel — what has been traced, and what it comes to.
 *
 * Fills the pane phase 2a reserved. Conduit and wire are shown as SEPARATE
 * lines on every run, never summed together, because they are separate
 * purchases and the whole point of this phase is that they do not get
 * conflated: one pipe, however many circuits go down it, and a full length of
 * wire for every conductor of every circuit.
 *
 * Circuit rows follow CLAUDE.md § Editing fields via InlineNumberField —
 * conductor counts are exactly the sort of number someone types down a column.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Cable, Check, Plus, Sparkles, Trash2, TriangleAlert, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InlineNumberField } from "@/components/InlineNumberField";
import { selectOnFocus } from "@/lib/selectOnFocus";
import type { RunQuantities } from "@shared/takeoffQuantities";

export type PanelRun = {
  id: number;
  name: string;
  pathType: "conduit" | "cable";
  status: "draft" | "committed";
  isSuggestion: boolean;
  circuits: { id: number; name: string; conductorCount: number }[];
  quantities: RunQuantities | null;
  scaleChangedSinceTraced: boolean;
};

const feet = (value: number) => `${value.toLocaleString("en-US", {
  minimumFractionDigits: 0, maximumFractionDigits: 2,
})} ft`;

export function RunsPanel({
  runs, totals, selectedRunId, onSelectRun, onRemoveRun, onCommitRun,
  onAcceptSuggestion, onAddCircuit, onUpdateCircuit, onRemoveCircuit,
}: {
  runs: PanelRun[];
  totals: { conduitFeet: number; cableFeet: number; wireFeet: number; unmeasurableCount: number } | undefined;
  selectedRunId: number | null;
  onSelectRun: (id: number | null) => void;
  onRemoveRun: (id: number) => void;
  onCommitRun: (id: number) => void;
  onAcceptSuggestion: (id: number) => void;
  onAddCircuit: (runId: number, name: string, conductorCount: number) => void;
  onUpdateCircuit: (id: number, conductorCount: number) => void;
  onRemoveCircuit: (id: number) => void;
}) {
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [circuitName, setCircuitName] = useState("");

  return (
    <div className="h-full flex flex-col bg-card border-l border-border min-h-0">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
          <Zap className="w-3 h-3" /> Traced runs
          <span className="ml-auto normal-case tracking-normal">{runs.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {runs.length === 0 ? (
          <div className="p-6 text-center">
            <Zap className="w-7 h-7 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">Nothing traced yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1.5">
              Start a conduit or cable run and click along its route on the drawing. Each run's
              footage appears here as you go.
            </p>
          </div>
        ) : runs.map(run => {
          const isSelected = run.id === selectedRunId;
          return (
            <div
              key={run.id}
              className={cn(
                "border-b border-border px-3 py-2.5 cursor-pointer transition-colors",
                isSelected ? "bg-[#F5C518]/5" : "hover:bg-muted/40"
              )}
              onClick={() => onSelectRun(isSelected ? null : run.id)}
            >
              <div className="flex items-start gap-2">
                {run.pathType === "conduit"
                  ? <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#F5C518]" />
                  : <Cable className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{run.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {run.isSuggestion && (
                      <Badge variant="outline" className="text-[0.65rem] px-1.5 py-0 border-[#F5C518]/40 text-[#F5C518]">
                        <Sparkles className="w-2.5 h-2.5 mr-1" /> Suggested
                      </Badge>
                    )}
                    {run.status === "draft" && !run.isSuggestion && (
                      <Badge variant="outline" className="text-[0.65rem] px-1.5 py-0 text-muted-foreground">
                        Draft
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm" variant="ghost"
                  className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={e => { e.stopPropagation(); onRemoveRun(run.id); }}
                  aria-label={`Delete ${run.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {/* A run that cannot be measured says so instead of showing 0 */}
              {run.quantities === null ? (
                <p className="text-xs text-[#F5C518] mt-1.5 flex items-start gap-1.5">
                  <TriangleAlert className="w-3 h-3 mt-0.5 shrink-0" />
                  Not measured — this sheet needs a scale before this run counts for anything.
                </p>
              ) : (
                <div className="mt-1.5 space-y-0.5">
                  {/* Conduit and wire kept visually separate: they are two
                      different purchases measured along one line. */}
                  {run.quantities.conduitFeet !== null && (
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">Conduit</span>
                      <span className="font-mono">{feet(run.quantities.conduitFeet)}</span>
                    </div>
                  )}
                  {run.quantities.cableFeet !== null && (
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">Cable</span>
                      <span className="font-mono">{feet(run.quantities.cableFeet)}</span>
                    </div>
                  )}
                  {run.pathType === "conduit" && (
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">
                        Wire
                        <span className="text-muted-foreground/60">
                          {" "}({run.circuits.length} {run.circuits.length === 1 ? "circuit" : "circuits"})
                        </span>
                      </span>
                      <span className="font-mono">{feet(run.quantities.totalWireFeet)}</span>
                    </div>
                  )}
                </div>
              )}

              {run.scaleChangedSinceTraced && (
                <p className="text-[0.7rem] text-[#F5C518] mt-1">
                  The sheet's scale changed since this was traced — check the length.
                </p>
              )}

              {/* Circuits, only for conduit and only when this run is open */}
              {isSelected && run.pathType === "conduit" && (
                <div className="mt-2 pt-2 border-t border-border/60 space-y-1.5" onClick={e => e.stopPropagation()}>
                  {run.circuits.map(circuit => (
                    <div key={circuit.id} className="flex items-center gap-1.5">
                      <span className="text-xs flex-1 min-w-0 truncate">{circuit.name}</span>
                      <InlineNumberField
                        value={circuit.conductorCount}
                        onSave={next => onUpdateCircuit(circuit.id, next)}
                        rules={{ min: 1, max: 60 }}
                        className="h-6 w-14 text-xs"
                        ariaLabel={`Conductors for ${circuit.name}`}
                      />
                      <span className="text-[0.7rem] text-muted-foreground w-16">cond.</span>
                      <span className="text-[0.7rem] font-mono text-muted-foreground w-16 text-right">
                        {run.quantities
                          ? feet(run.quantities.wireByCircuit.find(w => w.name === circuit.name)?.feet ?? 0)
                          : "—"}
                      </span>
                      <Button
                        size="sm" variant="ghost"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveCircuit(circuit.id)}
                        aria-label={`Remove ${circuit.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  {addingTo === run.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={circuitName}
                        onChange={e => setCircuitName(e.target.value)}
                        onFocus={selectOnFocus}
                        onKeyDown={e => {
                          if (e.key === "Enter" && circuitName.trim()) {
                            onAddCircuit(run.id, circuitName.trim(), 3);
                            setCircuitName("");
                          }
                          if (e.key === "Escape") { setAddingTo(null); setCircuitName(""); }
                        }}
                        placeholder="Ckt 12"
                        className="h-6 text-xs flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm" className="h-6 px-2 text-xs"
                        onClick={() => {
                          if (!circuitName.trim()) return;
                          onAddCircuit(run.id, circuitName.trim(), 3);
                          setCircuitName("");
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm" variant="ghost" className="h-6 gap-1 text-xs text-muted-foreground"
                      onClick={() => setAddingTo(run.id)}
                    >
                      <Plus className="w-3 h-3" /> Add a circuit to this run
                    </Button>
                  )}

                  <p className="text-[0.7rem] text-muted-foreground/70">
                    Each circuit pulls its own full length of wire down this one conduit.
                  </p>
                </div>
              )}

              {isSelected && (run.status === "draft" || run.isSuggestion) && (
                <div className="mt-2 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  {run.isSuggestion ? (
                    <Button
                      size="sm" className="h-6 gap-1 text-xs"
                      onClick={() => onAcceptSuggestion(run.id)}
                    >
                      <Check className="w-3 h-3" /> Accept this route
                    </Button>
                  ) : (
                    <Button
                      size="sm" className="h-6 gap-1 text-xs"
                      onClick={() => onCommitRun(run.id)}
                    >
                      <Check className="w-3 h-3" /> Finish run
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bid totals. Conduit, cable and wire never merge into one number. */}
      {totals && (
        <div className="border-t border-border px-3 py-2.5 shrink-0 space-y-1">
          <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground mb-1">
            This bid, all sheets
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Conduit</span>
            <span className="font-mono">{feet(totals.conduitFeet)}</span>
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Cable</span>
            <span className="font-mono">{feet(totals.cableFeet)}</span>
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Wire</span>
            <span className="font-mono">{feet(totals.wireFeet)}</span>
          </div>
          {totals.unmeasurableCount > 0 && (
            <p className="text-[0.7rem] text-[#F5C518] pt-1 flex items-start gap-1.5">
              <TriangleAlert className="w-3 h-3 mt-0.5 shrink-0" />
              {totals.unmeasurableCount} run{totals.unmeasurableCount === 1 ? " is" : "s are"} not
              in these totals — their sheets have no usable scale.
            </p>
          )}
          <p className="text-[0.7rem] text-muted-foreground/70 pt-1">
            Finished runs only. Drafts and suggestions are not counted.
          </p>
        </div>
      )}
    </div>
  );
}
