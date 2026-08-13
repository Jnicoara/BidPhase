/**
 * HelixBid — Settings Tab
 * UI preferences: theme (Light / Dark), font size scale, and CSV material database.
 */
import { useState, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";
import {
  Sun,
  Moon,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  User,
} from "lucide-react";
import DataConnectorsPanel from "@/components/DataConnectorsPanel";
import { BidPricingDefaultsSection } from "@/components/BidPricingDefaultsSection";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// ── Material DB types ──────────────────────────────────────────────────────────
/** A single material record parsed from an imported CSV. */
export interface MaterialRecord {
  name: string;
  sku: string;
  cost: number; // unit cost in USD
}

/** localStorage key used by both SettingsTab (write) and other tabs (read) */
export const MATERIAL_DB_KEY = "bp_material_db";

const FONT_PRESETS = [
  { label: "80%", value: 0.8, title: "80% zoom" },
  { label: "90%", value: 0.9, title: "90% zoom" },
  { label: "100%", value: 1.0, title: "100% zoom (default)" },
  { label: "110%", value: 1.1, title: "110% zoom" },
  { label: "120%", value: 1.2, title: "120% zoom" },
  { label: "130%", value: 1.3, title: "130% zoom" },
  { label: "140%", value: 1.4, title: "140% zoom" },
];

// ── MaterialDbSection ─────────────────────────────────────────────────────────
/**
 * Parses a CSV and saves material records to localStorage.
 * Accepts flexible column names: Name/Description, SKU/Part, Cost/Price.
 */
function MaterialDbSection() {
  const [db, setDb] = useLocalStorage<MaterialRecord[]>(MATERIAL_DB_KEY, []);
  const [parseStatus, setParseStatus] = useState<"idle" | "ok" | "error">(
    "idle"
  );
  const [parseMsg, setParseMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCsv = (text: string): MaterialRecord[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2)
      throw new Error("CSV must have a header row and at least one data row.");
    const headers = lines[0]
      .split(",")
      .map(h => h.trim().toLowerCase().replace(/["']/g, ""));
    const col = (aliases: string[]) => {
      for (const a of aliases) {
        const i = headers.indexOf(a);
        if (i >= 0) return i;
      }
      return -1;
    };
    const nameIdx = col(["name", "description", "item", "material"]);
    const skuIdx = col(["sku", "part", "part number", "part#", "code", "id"]);
    const costIdx = col([
      "cost",
      "price",
      "unit cost",
      "unit price",
      "unitcost",
      "unitprice",
    ]);
    if (nameIdx < 0)
      throw new Error("Could not find a \'Name\' or \'Description\' column.");
    return lines
      .slice(1)
      .map(line => {
        const cells =
          line
            .match(/(?:"[^"]*"|[^,])+/g)
            ?.map(c => c.replace(/^"|"$/g, "").trim()) ?? [];
        return {
          name: cells[nameIdx] ?? "",
          sku: skuIdx >= 0 ? (cells[skuIdx] ?? "") : "",
          cost:
            costIdx >= 0
              ? parseFloat(cells[costIdx]?.replace(/[^0-9.]/g, "") ?? "0") || 0
              : 0,
        };
      })
      .filter(r => r.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setParseStatus("error");
      setParseMsg("Please select a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const records = parseCsv(ev.target?.result as string);
        setDb(records);
        setParseStatus("ok");
        setParseMsg(
          `${records.length} material${records.length !== 1 ? "s" : ""} imported successfully.`
        );
        toast.success(
          `Material database updated: ${records.length} items loaded.`
        );
      } catch (err) {
        setParseStatus("error");
        setParseMsg((err as Error).message);
        toast.error("CSV import failed: " + (err as Error).message);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const clearDb = () => {
    setDb([]);
    setParseStatus("idle");
    setParseMsg("");
    toast.info("Material database cleared.");
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-0.5">
          Material Database
        </h3>
        <p className="text-xs text-muted-foreground">
          Import a CSV to build a local material database. Expected columns:{" "}
          <span className="font-mono text-foreground">Name</span>,{" "}
          <span className="font-mono text-foreground">SKU</span>,{" "}
          <span className="font-mono text-foreground">Cost</span>. Common
          aliases are accepted automatically.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-xs font-medium cursor-pointer hover:bg-accent transition-colors">
          <Upload size={13} />
          Import CSV
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        {db.length > 0 && (
          <button
            onClick={clearDb}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
          >
            <Trash2 size={12} /> Clear ({db.length})
          </button>
        )}
      </div>
      {parseStatus !== "idle" && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md px-3 py-2 text-xs",
            parseStatus === "ok"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          )}
        >
          {parseStatus === "ok" ? (
            <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
          )}
          <span>{parseMsg}</span>
        </div>
      )}
      {db.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/20 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Preview — {db.length} record{db.length !== 1 ? "s" : ""}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">
                    Name
                  </th>
                  <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">
                    SKU
                  </th>
                  <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">
                    Unit Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {db.slice(0, 5).map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/40 hover:bg-muted/10"
                  >
                    <td className="px-3 py-1.5 text-foreground">{r.name}</td>
                    <td className="px-3 py-1.5 font-mono text-muted-foreground">
                      {r.sku || "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[#F5C518]">
                      {r.cost > 0 ? `$${r.cost.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
                {db.length > 5 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-1.5 text-center text-muted-foreground text-[10px]"
                    >
                      … and {db.length - 5} more
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ── AccountSection ────────────────────────────────────────────────────────────
function AccountSection() {
  const { user, logout } = useAuth();
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-0.5">
          Account
        </h3>
        <p className="text-xs text-muted-foreground">
          Signed in as{" "}
          <span className="text-foreground font-medium">
            {user?.email ?? user?.name ?? "Unknown"}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 border border-border/40">
          <User size={14} className="text-muted-foreground" />
          <span className="text-sm text-foreground">
            {user?.name ?? "User"}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/40 text-sm text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </section>
  );
}

export default function SettingsTab({ onBack }: { onBack?: () => void }) {
  const { uiFontScale, setUiFontScale } = useApp();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-lg mx-auto">
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 group"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="group-hover:-translate-x-0.5 transition-transform"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <h2
          className="text-lg font-bold text-foreground mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Adjust the app to your preference.
        </p>
      </div>

      {/* ── Appearance ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-0.5">
            Appearance
          </h3>
          <p className="text-xs text-muted-foreground">
            Choose between Light and Dark mode. Your preference is saved
            automatically.
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
              <Sun
                size={13}
                className={!isDark ? "text-[#D4A900]" : "text-muted-foreground"}
              />
              <span
                className={cn(
                  "text-xs font-semibold",
                  !isDark ? "text-foreground" : "text-muted-foreground"
                )}
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
              <Moon
                size={13}
                className={isDark ? "text-[#F5C518]" : "text-muted-foreground"}
              />
              <span
                className={cn(
                  "text-xs font-semibold",
                  isDark ? "text-foreground" : "text-muted-foreground"
                )}
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
          <h3 className="text-sm font-semibold text-foreground mb-0.5">
            Font Size
          </h3>
          <p className="text-xs text-muted-foreground">
            Scales all UI text. Useful on large monitors or when working at a
            distance.
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
            <span className="font-mono text-foreground">
              {Math.round(uiFontScale * 100)}%
            </span>
            <span>Larger</span>
          </div>
          <input
            type="range"
            min={0.8}
            max={1.4}
            step={0.1}
            value={uiFontScale}
            onChange={e => setUiFontScale(parseFloat(e.target.value))}
            className="w-full accent-[#F5C518] cursor-pointer"
          />
        </div>

        {/* Live preview */}
        <div className="rounded-md border border-border bg-muted/20 p-4 space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
            Preview
          </p>
          <p
            style={{ fontSize: `calc(${uiFontScale} * 13px)` }}
            className="text-foreground font-medium"
          >
            Run 1 — 142.5 ft · EMT ¾"
          </p>
          <p
            style={{ fontSize: `calc(${uiFontScale} * 11px)` }}
            className="text-muted-foreground"
          >
            Conductors: 3 × #12 AWG Cu · Page 2
          </p>
          <p
            style={{ fontSize: `calc(${uiFontScale} * 10px)` }}
            className="text-muted-foreground font-mono"
          >
            Fittings: 4 × Connectors · 2 × 90° Ells
          </p>
        </div>
      </section>

      {/* ── Bid pricing defaults ─────────────────────────────────────
          First of the real settings: these are the ones that reach every bid,
          and the sidebar entry that lands here is called "Company Defaults". */}
      <BidPricingDefaultsSection />

      {/* ── Material Database (CSV Importer) — legacy local storage ─── */}
      <MaterialDbSection />

      {/* ── Data Connectors (server-side, per-user) ─────────────────── */}
      <DataConnectorsPanel />

      {/* ── Account ──────────────────────────────────────────────── */}
      <AccountSection />

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
        <p className="text-[10px] text-muted-foreground">
          Metric units — coming soon.
        </p>
      </section>
    </div>
  );
}
