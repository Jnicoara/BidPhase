/**
 * DuplicateUnitPanel - generate numbered copies of a repeating unit.
 *
 * Shared by the Bids detail screen and the Quick-bid flow: a quick residential
 * bid wants repeating rooms just as much as a hotel does, and two copies of
 * this would drift apart. The copy semantics live in db.duplicateBidUnit -
 * copies inherit the source unit is snapshot so every generated room prices
 * the same.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { selectOnFocus } from "@/lib/selectOnFocus";

export function DuplicateUnitPanel({
  bidId, units, onDone,
}: {
  bidId: number;
  units: string[];
  onDone: () => void;
}) {
  // `units` arrives from a query, so it is empty on first render. Seeding state
  // from it would leave the picker permanently blank; fall back at read time.
  const [source, setSource] = useState("");
  const effectiveSource = source || units[0] || "";
  const [baseName, setBaseName] = useState("Room");
  const [startNumber, setStartNumber] = useState("102");
  const [count, setCount] = useState("10");

  const duplicate = trpc.bids.duplicateUnit.useMutation({
    onError: error => toast.error(error.message),
    onSuccess: result => {
      const made = result.created.length;
      toast.success(
        made === 0
          ? "Nothing generated — every label already existed."
          : `Generated ${made} cop${made === 1 ? "y" : "ies"}` +
            (result.skipped.length ? `, skipped ${result.skipped.length} existing` : "")
      );
      onDone();
    },
  });

  if (units.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Give some line items a unit label (e.g. “Room 101”) to build a repeating unit, then you can
        generate numbered copies of it here.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Generate copies of a unit
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={effectiveSource} onValueChange={setSource}>
          <SelectTrigger className="h-8 w-44 text-sm" aria-label="Source unit"><SelectValue /></SelectTrigger>
          <SelectContent>
            {units.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">→</span>
        <Input
          value={baseName}
          onChange={e => setBaseName(e.target.value)}
          className="h-8 w-28 text-sm"
          placeholder="Room"
          aria-label="Copy name"
        />
        <Input
          value={startNumber}
          onChange={e => setStartNumber(e.target.value)}
          className="h-8 w-20 text-sm text-right"
          inputMode="numeric"
          onFocus={selectOnFocus}
          aria-label="Start number"
        />
        <span className="text-xs text-muted-foreground">×</span>
        <Input
          value={count}
          onChange={e => setCount(e.target.value)}
          className="h-8 w-16 text-sm text-right"
          inputMode="numeric"
          onFocus={selectOnFocus}
          aria-label="How many copies"
        />
        <Button
          size="sm" className="h-8 gap-1.5 text-xs"
          onClick={() => {
            const n = Number(count);
            const start = Number(startNumber);
            if (!effectiveSource) { toast.error("Pick a unit to copy."); return; }
            if (!baseName.trim()) { toast.error("Give the copies a name."); return; }
            if (!Number.isInteger(n) || n < 1 || n > 200) {
              toast.error("Choose between 1 and 200 copies."); return;
            }
            if (!Number.isInteger(start) || start < 0) { toast.error("Start number must be a whole number."); return; }
            duplicate.mutate({
              bidId, sourceUnitLabel: effectiveSource, baseName: baseName.trim(),
              startNumber: start, count: n,
            });
          }}
        >
          <Copy className="w-3.5 h-3.5" /> Generate
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Copies are numbered from the start number and carry {effectiveSource || "the source"}’s frozen costs,
        so every copy prices the same. Each one is independently editable afterwards.
      </p>
    </div>
  );
}
