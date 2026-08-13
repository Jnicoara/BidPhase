/**
 * BidSummaryTab — v5.45
 * Global bid adjustments:
 *   - Percentage labor factor (multiplier on all labor hours)
 *   - Lump sum additional hours
 *   - Markup percentage
 *   - Default labor rate selector
 * Displays rolled-up totals from project assemblies + project items.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Save, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface BidSummaryTabProps {
  projectId: number;
}

export default function BidSummaryTab({ projectId }: BidSummaryTabProps) {
  const { data: summary, isLoading: loadingSummary } =
    trpc.bidSummary.get.useQuery({ projectId });
  const { data: laborRates = [] } = trpc.masterLaborRates.list.useQuery();
  const { data: assemblies = [] } = trpc.projectAssemblies.list.useQuery({
    projectId,
  });
  const { data: projectItems = [] } = trpc.projectItems.list.useQuery({
    projectId,
  });

  const [percentageLaborFactor, setPercentageLaborFactor] = useState("1.00");
  const [lumpSumHours, setLumpSumHours] = useState("0");
  const [markupPct, setMarkupPct] = useState("0");
  const [defaultLaborRateId, setDefaultLaborRateId] = useState<string>("");
  const [dirty, setDirty] = useState(false);

  // Sync from DB
  useEffect(() => {
    if (!summary) return;
    setPercentageLaborFactor(
      parseFloat(String(summary.percentageLaborFactor ?? 1)).toFixed(2)
    );
    setLumpSumHours(parseFloat(String(summary.lumpSumHours ?? 0)).toFixed(2));
    setMarkupPct(parseFloat(String(summary.markupPct ?? 0)).toFixed(2));
    setDefaultLaborRateId(
      summary.defaultLaborRateId ? String(summary.defaultLaborRateId) : ""
    );
    setDirty(false);
  }, [summary]);

  const upsert = trpc.bidSummary.upsert.useMutation({
    onSuccess: () => {
      toast.success("Bid summary saved");
      setDirty(false);
    },
    onError: e => toast.error(e.message),
  });

  const handleSave = () => {
    upsert.mutate({
      projectId,
      percentageLaborFactor: parseFloat(percentageLaborFactor) || 1,
      lumpSumHours: parseFloat(lumpSumHours) || 0,
      markupPct: parseFloat(markupPct) || 0,
      defaultLaborRateId: defaultLaborRateId
        ? parseInt(defaultLaborRateId)
        : null,
    });
  };

  // ── Rolled-up totals from assemblies + project items ──────────────────────
  type AsmItem = {
    overrideMaterialCost?: string | number | null;
    masterMaterialCost?: string | number | null;
    overrideLaborHours?: string | number | null;
    masterLaborHours?: string | number | null;
    qty?: string | number | null;
  };

  const assemblyTotals = (assemblies as Array<{ items?: AsmItem[] }>).reduce(
    (acc, asm) => {
      (asm.items ?? []).forEach(item => {
        const qty = parseFloat(String(item.qty ?? 1));
        acc.mat +=
          parseFloat(
            String(item.overrideMaterialCost ?? item.masterMaterialCost ?? 0)
          ) * qty;
        acc.lab +=
          parseFloat(
            String(item.overrideLaborHours ?? item.masterLaborHours ?? 0)
          ) * qty;
      });
      return acc;
    },
    { mat: 0, lab: 0 }
  );

  type ProjItem = {
    overrideMaterialCost?: string | number | null;
    masterMaterialCost?: string | number | null;
    overrideLaborHours?: string | number | null;
    masterLaborHours?: string | number | null;
    qty?: string | number | null;
  };
  const itemTotals = (projectItems as ProjItem[]).reduce(
    (acc, item) => {
      const qty = parseFloat(String(item.qty ?? 1));
      acc.mat +=
        parseFloat(
          String(item.overrideMaterialCost ?? item.masterMaterialCost ?? 0)
        ) * qty;
      acc.lab +=
        parseFloat(
          String(item.overrideLaborHours ?? item.masterLaborHours ?? 0)
        ) * qty;
      return acc;
    },
    { mat: 0, lab: 0 }
  );

  const rawMat = assemblyTotals.mat + itemTotals.mat;
  const rawLab = assemblyTotals.lab + itemTotals.lab;

  const factor = parseFloat(percentageLaborFactor) || 1;
  const lump = parseFloat(lumpSumHours) || 0;
  const markup = parseFloat(markupPct) || 0;

  const adjustedLab = rawLab * factor + lump;

  const selectedRate = laborRates.find(
    r => String(r.id) === defaultLaborRateId
  );
  const ratePerHour = selectedRate
    ? parseFloat(String(selectedRate.ratePerHour ?? 0))
    : 0;
  const laborCost = adjustedLab * ratePerHour;

  const subtotal = rawMat + laborCost;
  const markupAmount = subtotal * (markup / 100);
  const totalBid = subtotal + markupAmount;

  if (loadingSummary)
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" /> Loading bid summary…
      </div>
    );

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Bid Summary
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Global labor adjustments and markup applied to all project
            assemblies
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!dirty || upsert.isPending}
          className={cn(
            "gap-2 h-9 font-semibold",
            dirty ? "bg-[#F5C518] hover:bg-[#e6b800] text-black" : "opacity-50"
          )}
        >
          {upsert.isPending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          Save
        </Button>
      </div>

      {/* Adjustment controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-card border border-border/40 rounded-xl">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">
            Labor Factor (multiplier)
          </Label>
          <p className="text-xs text-muted-foreground">
            Multiply all labor hours by this factor. 1.00 = no change, 1.10 =
            +10%
          </p>
          <Input
            type="number"
            value={percentageLaborFactor}
            onChange={e => {
              setPercentageLaborFactor(e.target.value);
              setDirty(true);
            }}
            min={0}
            step={0.01}
            className="h-11 text-base bg-background border-border/60 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">
            Lump Sum Additional Hours
          </Label>
          <p className="text-xs text-muted-foreground">
            Add a fixed number of hours on top of all calculated labor
          </p>
          <Input
            type="number"
            value={lumpSumHours}
            onChange={e => {
              setLumpSumHours(e.target.value);
              setDirty(true);
            }}
            min={0}
            step={0.5}
            className="h-11 text-base bg-background border-border/60 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Default Labor Rate</Label>
          <p className="text-xs text-muted-foreground">
            Applied to adjusted hours for total labor cost
          </p>
          {laborRates.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 italic pt-2">
              No labor rates set up. Add them in Settings → Labor Rates.
            </p>
          ) : (
            <Select
              value={defaultLaborRateId}
              onValueChange={v => {
                setDefaultLaborRateId(v);
                setDirty(true);
              }}
            >
              <SelectTrigger className="h-11 bg-background border-border/60">
                <SelectValue placeholder="Select a rate…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {laborRates.map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name} — ${parseFloat(String(r.ratePerHour)).toFixed(2)}
                    /hr
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Markup %</Label>
          <p className="text-xs text-muted-foreground">
            Applied to (material + labor cost) subtotal
          </p>
          <div className="relative">
            <Input
              type="number"
              value={markupPct}
              onChange={e => {
                setMarkupPct(e.target.value);
                setDirty(true);
              }}
              min={0}
              step={0.5}
              className="h-11 text-base bg-background border-border/60 font-mono pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              %
            </span>
          </div>
        </div>
      </div>

      {/* Summary totals */}
      <div className="p-5 bg-card border border-border/40 rounded-xl space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BarChart3 size={15} className="text-[#F5C518]" />
          Rolled-Up Totals
        </h4>

        <div className="space-y-2 text-sm">
          <SummaryRow
            label="Raw Material Cost"
            value={`$${rawMat.toFixed(2)}`}
          />
          <SummaryRow
            label="Raw Labor Hours"
            value={`${rawLab.toFixed(2)} hrs`}
          />
          <div className="border-t border-border/30 pt-2 mt-2" />
          <SummaryRow
            label={`Adjusted Labor Hours (×${factor.toFixed(2)} + ${lump.toFixed(2)} lump)`}
            value={`${adjustedLab.toFixed(2)} hrs`}
            accent
          />
          {ratePerHour > 0 && (
            <SummaryRow
              label={`Labor Cost (${adjustedLab.toFixed(2)} hrs × $${ratePerHour.toFixed(2)}/hr)`}
              value={`$${laborCost.toFixed(2)}`}
            />
          )}
          <div className="border-t border-border/30 pt-2 mt-2" />
          <SummaryRow
            label="Subtotal (Mat + Labor)"
            value={`$${subtotal.toFixed(2)}`}
          />
          {markup > 0 && (
            <SummaryRow
              label={`Markup (${markup.toFixed(1)}%)`}
              value={`$${markupAmount.toFixed(2)}`}
            />
          )}
          <div className="border-t border-[#F5C518]/30 pt-2 mt-2" />
          <SummaryRow
            label="Total Bid"
            value={`$${totalBid.toFixed(2)}`}
            bold
            accent
          />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={cn(
          "text-muted-foreground",
          bold && "font-semibold text-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-mono",
          bold ? "text-base font-bold" : "text-sm",
          accent ? "text-[#F5C518]" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}
