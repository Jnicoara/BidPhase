/**
 * BomRfqTab — v5.45
 * Aggregated Bill of Materials across all project assemblies + standalone items.
 * Groups by item code/description, sums quantities.
 * Export: copy to clipboard (TSV), download CSV.
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Package, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BomRfqTabProps {
  projectId: number;
}

interface BomRow {
  key: string;
  itemCode: string | null;
  description: string;
  unit: string;
  totalQty: number;
  unitMat: number;
  totalMat: number;
  totalLabHrs: number;
  sources: string[];
}

export default function BomRfqTab({ projectId }: BomRfqTabProps) {
  const { data: assemblies = [], isLoading: loadingAsm } = trpc.projectAssemblies.list.useQuery({ projectId });
  const { data: projectItems = [], isLoading: loadingItems } = trpc.projectItems.list.useQuery({ projectId });

  const isLoading = loadingAsm || loadingItems;

  // ── Aggregate BOM ─────────────────────────────────────────────────────────
  const bom = useMemo<BomRow[]>(() => {
    const map = new Map<string, BomRow>();

    const addRow = (
      itemCode: string | null,
      description: string,
      unit: string,
      qty: number,
      unitMat: number,
      unitLab: number,
      source: string
    ) => {
      const key = itemCode ? `code:${itemCode}` : `desc:${description.toLowerCase().trim()}`;
      if (map.has(key)) {
        const row = map.get(key)!;
        row.totalQty += qty;
        row.totalMat += unitMat * qty;
        row.totalLabHrs += unitLab * qty;
        if (!row.sources.includes(source)) row.sources.push(source);
      } else {
        map.set(key, {
          key,
          itemCode,
          description,
          unit,
          totalQty: qty,
          unitMat,
          totalMat: unitMat * qty,
          totalLabHrs: unitLab * qty,
          sources: [source],
        });
      }
    };

    // From assemblies
    type AsmItem = { itemCode?: string | null; description: string; unit: string; qty?: string | number | null; overrideMaterialCost?: string | number | null; masterMaterialCost?: string | number | null; overrideLaborHours?: string | number | null; masterLaborHours?: string | number | null };
    for (const asm of (assemblies as Array<{ name: string; items?: AsmItem[] }>)) {
      for (const item of (asm.items ?? [])) {
        addRow(
          item.itemCode ?? null,
          item.description,
          item.unit,
          parseFloat(String(item.qty ?? 1)),
          parseFloat(String(item.overrideMaterialCost ?? item.masterMaterialCost ?? 0)),
          parseFloat(String(item.overrideLaborHours ?? item.masterLaborHours ?? 0)),
          asm.name
        );
      }
    }

    // From standalone project items
    type ProjItem = { itemCode?: string | null; description: string; unit: string; qty?: string | number | null; overrideMaterialCost?: string | number | null; masterMaterialCost?: string | number | null; overrideLaborHours?: string | number | null; masterLaborHours?: string | number | null };
    for (const item of (projectItems as ProjItem[])) {
      addRow(
        item.itemCode ?? null,
        item.description,
        item.unit,
        parseFloat(String(item.qty ?? 1)),
        parseFloat(String(item.overrideMaterialCost ?? item.masterMaterialCost ?? 0)),
        parseFloat(String(item.overrideLaborHours ?? item.masterLaborHours ?? 0)),
        "Standalone Items"
      );
    }

    return Array.from(map.values()).sort((a, b) => a.description.localeCompare(b.description));
  }, [assemblies, projectItems]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const grandTotalMat = bom.reduce((s, r) => s + r.totalMat, 0);
  const grandTotalLab = bom.reduce((s, r) => s + r.totalLabHrs, 0);

  // ── Export helpers ────────────────────────────────────────────────────────
  const toTsv = () => {
    const header = ["Item Code", "Description", "Unit", "Total Qty", "Unit Mat $", "Total Mat $", "Total Lab Hrs", "Sources"].join("\t");
    const rows = bom.map(r => [
      r.itemCode ?? "",
      r.description,
      r.unit,
      r.totalQty,
      r.unitMat.toFixed(2),
      r.totalMat.toFixed(2),
      r.totalLabHrs.toFixed(3),
      r.sources.join("; "),
    ].join("\t"));
    return [header, ...rows].join("\n");
  };

  const toCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ["Item Code", "Description", "Unit", "Total Qty", "Unit Mat $", "Total Mat $", "Total Lab Hrs", "Sources"].map(esc).join(",");
    const rows = bom.map(r => [
      esc(r.itemCode ?? ""),
      esc(r.description),
      esc(r.unit),
      r.totalQty,
      r.unitMat.toFixed(2),
      r.totalMat.toFixed(2),
      r.totalLabHrs.toFixed(3),
      esc(r.sources.join("; ")),
    ].join(","));
    return [header, ...rows].join("\n");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(toTsv()).then(
      () => toast.success("BOM copied to clipboard (TSV)"),
      () => toast.error("Copy failed")
    );
  };

  const handleDownloadCsv = () => {
    const blob = new Blob([toCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bom-project-${projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
      <Loader2 size={20} className="animate-spin" /> Building BOM…
    </div>
  );

  return (
    <div className="p-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Bill of Materials / RFQ</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aggregated from all project assemblies and standalone items.
            Identical items are combined by item code (or description if no code).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy} className="gap-2 h-9 text-sm" disabled={bom.length === 0}>
            <Copy size={14} /> Copy TSV
          </Button>
          <Button variant="outline" onClick={handleDownloadCsv} className="gap-2 h-9 text-sm" disabled={bom.length === 0}>
            <Download size={14} /> Download CSV
          </Button>
        </div>
      </div>

      {bom.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/40 rounded-xl">
          <Package size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No items yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Add assemblies or standalone items to generate a BOM
          </p>
        </div>
      ) : (
        <div className="border border-border/40 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Qty</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit Mat $</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Mat $</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Lab Hrs</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sources</th>
                </tr>
              </thead>
              <tbody>
                {bom.map((row, idx) => (
                  <tr
                    key={row.key}
                    className={cn(
                      "border-b border-border/20 hover:bg-muted/10 transition-colors",
                      idx % 2 === 0 ? "bg-background" : "bg-muted/5"
                    )}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">
                      {row.itemCode ?? <span className="text-muted-foreground/30 italic">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-medium">{row.description}</td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground">{row.unit}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-foreground">
                      {row.totalQty % 1 === 0 ? row.totalQty.toFixed(0) : row.totalQty.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                      ${row.unitMat.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-foreground font-semibold">
                      ${row.totalMat.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-foreground">
                      {row.totalLabHrs.toFixed(3)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {row.sources.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/40 bg-muted/20">
                  <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">
                    Grand Totals ({bom.length} line item{bom.length !== 1 ? "s" : ""}):
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-[#F5C518] text-base">
                    ${grandTotalMat.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-[#F5C518] text-base">
                    {grandTotalLab.toFixed(3)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
