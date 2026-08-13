/**
 * DataConnectorsPanel — Materials database upload for the Unit Count CatalogPicker.
 * Allows users to import their own material catalog via CSV or JSON.
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

// ─── CSV / JSON Parsers ───────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

function parseJSON(text: string): Record<string, unknown>[] {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DataConnectorsPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [replaceAll, setReplaceAll] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const {
    data: materials,
    isLoading,
    refetch,
  } = trpc.data.materials.list.useQuery();
  const bulkImport = trpc.data.materials.bulkImport.useMutation({
    onSuccess: res => {
      toast.success(`Imported ${res.count} items`);
      refetch();
      setImporting(false);
    },
    onError: err => {
      toast.error(err.message);
      setImporting(false);
    },
  });
  const clearAll = trpc.data.materials.clear.useMutation({
    onSuccess: () => {
      toast.success("Materials database cleared");
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setImporting(true);

    const text = await file.text();
    let rows: Record<string, unknown>[];

    if (file.name.endsWith(".json")) {
      rows = parseJSON(text);
    } else {
      rows = parseCSV(text);
    }

    if (rows.length === 0) {
      setParseError(
        "No rows found. Check that your file has a header row and at least one data row."
      );
      setImporting(false);
      return;
    }

    const normalize = (row: Record<string, unknown>) => {
      const get = (keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(row).find(
            rk => rk.toLowerCase() === k.toLowerCase()
          );
          if (found && row[found] !== undefined && row[found] !== "")
            return row[found];
        }
        return undefined;
      };
      return {
        description: String(
          get(["description", "desc", "name", "item"]) ?? ""
        ).trim(),
        itemCode:
          String(
            get(["itemCode", "item_code", "code", "sku", "id"]) ?? ""
          ).trim() || undefined,
        unit: String(get(["unit", "uom"]) ?? "EA").trim() || "EA",
        unitMaterialCost:
          parseFloat(
            String(
              get([
                "unitMaterialCost",
                "unit_material_cost",
                "material_cost",
                "cost",
                "price",
              ]) ?? "0"
            )
          ) || 0,
        baseLaborHours:
          parseFloat(
            String(
              get([
                "baseLaborHours",
                "base_labor_hours",
                "labor_hours",
                "laborHours",
                "hours",
              ]) ?? "0"
            )
          ) || 0,
        phase:
          String(get(["phase", "category", "section"]) ?? "").trim() ||
          undefined,
        source: String(get(["source"]) ?? "custom").trim() || "custom",
        externalSku:
          String(
            get(["externalSku", "external_sku", "distributor_sku"]) ?? ""
          ).trim() || undefined,
      };
    };

    const items = rows.map(normalize).filter(r => r.description.length > 0);

    if (items.length === 0) {
      setParseError(
        "No valid rows found. Make sure your file has a 'description' column."
      );
      setImporting(false);
      return;
    }

    bulkImport.mutate({ items, replaceAll });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wrench size={18} className="text-[#F5C518]" />
          Materials Database
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your own material catalog (CSV or JSON). Items appear in the
          Unit Count search. All data is private to your account.
        </p>
      </div>

      {/* Upload card */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload size={16} className="text-[#F5C518]" />
            Upload Materials
          </CardTitle>
          <CardDescription>
            CSV or JSON file with item descriptions, unit costs, and labor
            hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted/40 border border-border/40 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">
              Expected columns (CSV header row):
            </p>
            <p>
              <span className="font-mono text-[#F5C518]">description</span>{" "}
              (required), <span className="font-mono">itemCode</span>,{" "}
              <span className="font-mono">unit</span>,{" "}
              <span className="font-mono">unitMaterialCost</span>,{" "}
              <span className="font-mono">baseLaborHours</span>,{" "}
              <span className="font-mono">phase</span>
            </p>
            <p>Column names are case-insensitive. Extra columns are ignored.</p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={replaceAll}
              onChange={e => setReplaceAll(e.target.checked)}
              className="rounded"
            />
            Replace all existing materials (clear before import)
          </label>

          {parseError && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              {parseError}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="gap-2"
            >
              {importing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {importing ? "Importing…" : "Choose File (CSV or JSON)"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        </CardContent>
      </Card>

      {/* Current database */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database size={16} className="text-[#F5C518]" />
              Your Materials
              {materials && (
                <Badge variant="secondary" className="ml-1">
                  {materials.length} items
                </Badge>
              )}
            </CardTitle>
            {materials && materials.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive gap-1.5 text-xs"
                onClick={() => {
                  if (
                    confirm(
                      "Clear all imported materials? This cannot be undone."
                    )
                  ) {
                    clearAll.mutate();
                  }
                }}
                disabled={clearAll.isPending}
              >
                <Trash2 size={13} />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : !materials || materials.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No materials imported yet. Upload a CSV or JSON file above.
            </div>
          ) : (
            <div className="overflow-auto max-h-64 rounded-md border border-border/40">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">
                      Description
                    </th>
                    <th className="text-left px-3 py-2 font-medium">Unit</th>
                    <th className="text-right px-3 py-2 font-medium">
                      Mat. Cost
                    </th>
                    <th className="text-right px-3 py-2 font-medium">
                      Labor Hrs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {materials.slice(0, 200).map(m => (
                    <tr
                      key={m.id}
                      className="border-t border-border/30 hover:bg-muted/20"
                    >
                      <td className="px-3 py-1.5 max-w-[200px] truncate">
                        {m.description}
                      </td>
                      <td className="px-3 py-1.5">{m.unit}</td>
                      <td className="px-3 py-1.5 text-right">
                        ${(m.unitMaterialCost ?? 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {(m.baseLaborHours ?? 0).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                  {materials.length > 200 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-2 text-center text-muted-foreground"
                      >
                        … and {materials.length - 200} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
