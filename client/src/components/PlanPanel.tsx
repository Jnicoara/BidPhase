/**
 * BidPhase — PlanPanel (Reusable Embedded Plan Viewer)
 *
 * Single-page view with per-page run isolation.
 * Features:
 *  - One PDF page shown at a time (single-page view)
 *  - Per-page named measurement runs (each page has its own run list)
 *  - Page selector bar at top (numbered chips + prev/next arrows)
 *  - Page overview panel (click grid icon → thumbnail strip to jump pages)
 *  - IndexedDB PDF storage (no 5MB limit)
 *  - Thin precision crosshair (1px hairlines, no dot)
 *  - Per-segment footage labels above each line segment
 *  - Keyboard shortcuts: +/- zoom, U undo, M measure, Escape cancel, ←/→ page
 *  - Scroll-to-zoom (desktop), pinch-to-zoom (mobile)
 *  - Click-drag pan
 *  - Hide-unselected runs toggle
 *
 * Props:
 *  - tabKey: unique string per tab (e.g. "civil") for isolated localStorage keys
 *  - onPushDistance: called when user pushes total footage to the calculator
 *  - onDeleteRun: called when a run is deleted from the run strip
 */
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useIndexedDB } from "@/hooks/useIndexedDB";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Trash2,
  ArrowRight,
  Ruler,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Check,
  MapPin,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CONDUIT_SIZES, type ConduitSize, type CountPin, type CountSession } from "@/contexts/AppContext";
import { Eye, EyeOff } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DEFAULT_ICON_ID } from "@/lib/CountIcons";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// ── Types ─────────────────────────────────────────────────────────────────────
type Mode = "none" | "set-scale-p1" | "set-scale-p2" | "measure" | "count" | "drag-scale" | "drag-run";

// CountPin and CountSession types are imported from AppContext
// (they live there so AssemblyState can reference them without circular imports)

interface NormPoint {
  pageIndex: number; // always 0 in single-page mode (relative to current page)
  nx: number;
  ny: number;
}

interface MeasureRun {
  id: string;
  name: string;
  color: string;
  points: NormPoint[];
  totalFeet: number | null;
  conduitSize: ConduitSize;
  /** 'active' = currently being measured, 'paused' = user paused mid-run, 'finished' = locked */
  status?: "active" | "paused" | "finished";
}

// Per-page run storage: pageIndex → MeasureRun[]
type PageRunsMap = Record<number, MeasureRun[]>;
type PageActiveRunMap = Record<number, string>;

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_DPI = 1.5;
const MIN_ZOOM = 0.10; // absolute floor — fit-to-page will be the effective min
const MAX_ZOOM = 10.0; // 1000%
// 5% increments from 10% → 1000%
const ZOOM_STEPS = Array.from({ length: Math.round((MAX_ZOOM - MIN_ZOOM) / 0.05) + 1 }, (_, i) =>
  parseFloat((MIN_ZOOM + i * 0.05).toFixed(2))
);
// Extra padding (px at zoom=1) around the page so you can pan past edges when zoomed in
const PAGE_GUTTER = 400;

// 10 vibrant base colors for the color picker palette
const BASE_PALETTE = [
  "#60A5FA", // soft blue
  "#34D399", // emerald green
  "#F97316", // warm orange
  "#A78BFA", // soft violet
  "#FBBF24", // amber gold
  "#38BDF8", // sky blue
  "#F472B6", // soft pink
  "#4ADE80", // light green
  "#FB923C", // peach orange
  "#818CF8", // indigo
];
// Legacy alias so any remaining RUN_COLORS refs still compile
const RUN_COLORS = BASE_PALETTE;

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
function dist2D(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}
function nanoid6() {
  return Math.random().toString(36).slice(2, 8);
}

function defaultRun(idx: number): MeasureRun {
  return { id: nanoid6(), name: `Run ${idx + 1}`, color: BASE_PALETTE[idx % BASE_PALETTE.length], points: [], totalFeet: null, conduitSize: "3/4" };
}

// ── RunChip: per-run color picker + rename + delete ──────────────────────────
interface RunChipProps {
  run: MeasureRun;
  isActive: boolean;
  runColor: string;
  canDelete: boolean;
  savedColors: string[];
  onActivate: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
  onSaveColor: (color: string) => void;
}

function RunChip({ run, isActive, runColor, canDelete, savedColors, onActivate, onRename, onDelete, onColorChange, onSaveColor }: RunChipProps) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(run.name);
  const [customColor, setCustomColor] = useState(runColor);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync name when run.name changes externally
  useEffect(() => { if (!editing) setNameVal(run.name); }, [run.name, editing]);

  const commitName = () => {
    setEditing(false);
    const v = nameVal.trim();
    if (v && v !== run.name) onRename(v);
    else setNameVal(run.name);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded border transition-all",
        isActive
          ? run.status === "paused"
            ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
            : run.status === "finished"
              ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
              : "bg-[#F5C518]/10 border-[#F5C518]/50 shadow-sm"
          : "border-transparent opacity-60 hover:opacity-90"
      )}
    >
      {/* Color dot — click to open picker */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="w-5 h-5 rounded-full ml-2 shrink-0 border border-white/20 hover:scale-110 transition-transform"
            style={{ background: runColor }}
            title="Change run color"
            onClick={(e) => e.stopPropagation()}
          />
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3 space-y-3" align="start" sideOffset={6}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Base Colors</p>
          <div className="grid grid-cols-5 gap-1.5">
            {BASE_PALETTE.map((c) => (
              <button
                key={c}
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
                  runColor === c ? "border-white scale-110" : "border-transparent"
                )}
                style={{ background: c }}
                onClick={() => onColorChange(c)}
              />
            ))}
          </div>
          {savedColors.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Saved</p>
              <div className="flex flex-wrap gap-1.5">
                {savedColors.map((c) => (
                  <button
                    key={c}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                      runColor === c ? "border-white scale-110" : "border-transparent"
                    )}
                    style={{ background: c }}
                    onClick={() => onColorChange(c)}
                  />
                ))}
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Custom</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => { setCustomColor(e.target.value); onColorChange(e.target.value); }}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <span className="text-[11px] font-mono text-muted-foreground">{customColor.toUpperCase()}</span>
              <button
                className="ml-auto text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
                onClick={() => onSaveColor(customColor)}
                title="Save this color to favorites"
              >
                Save
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Run name — click to activate, click pencil to rename */}
      {editing ? (
        <input
          ref={inputRef}
          value={nameVal}
          onChange={(e) => setNameVal(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setEditing(false); setNameVal(run.name); } }}
          className="w-24 text-xs bg-background border border-border rounded px-1.5 py-0.5 font-mono outline-none"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <button
          onClick={onActivate}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-xs whitespace-nowrap transition-all",
            isActive ? "font-bold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"
          )}
        >
          <span>{run.name}</span>
          {run.totalFeet !== null && (
            <span className="font-mono" style={{ color: runColor }}>{run.totalFeet}'</span>
          )}
          {run.status === "paused" && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">paused</span>
          )}
          {run.status === "finished" && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">✓ done</span>
          )}
        </button>
      )}

      {/* Rename button (active run only) */}
      {isActive && !editing && (
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); setTimeout(() => inputRef.current?.select(), 10); }}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Rename run"
        >
          <Pencil size={11} />
        </button>
      )}
      {isActive && editing && (
        <button
          onClick={(e) => { e.stopPropagation(); commitName(); }}
          className="p-1 text-[#00FF88] hover:text-[#00FF88]/80 transition-colors"
          title="Confirm rename"
        >
          <Check size={11} />
        </button>
      )}

      {/* Delete button — always visible, confirm on click */}
      {canDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 mr-1 text-muted-foreground/50 hover:text-destructive transition-colors rounded hover:bg-destructive/10"
          title="Delete this run"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}

interface PlanPanelProps {
  tabKey: string;
  onPushDistance?: (ft: number, runName: string, conduitSize?: string, pageNumber?: number) => void;
  onDeleteRun?: (runName: string, pageNumber?: number) => void;
  onCurrentPageChange?: (page: number) => void;
  /** The currently active count session (passed from parent, owns all pins) */
  activeCountSession?: CountSession | null;
  /** Called when a pin is dropped — parent adds pin to active session */
  onPinAdded?: (pin: CountPin) => void;
  /** Called when a pin is removed — parent removes pin from active session */
  onPinRemoved?: (pinId: string) => void;
  /** All sessions (for rendering pins from all sessions on canvas) */
  allCountSessions?: CountSession[];
  /** Called when user clears all pins on the current page for the active session */
  onClearPagePins?: (pageNumber: number) => void;
  /** Called when user clears ALL runs AND pins on the current page */
  onClearPageAll?: (pageNumber: number) => void;
  onPdfReplaced?: () => void;
  /** Called when the Unit Count toolbar button is toggled — passes the new open state */
  onUnitCountToggle?: (open: boolean) => void;
  /** Increment this to programmatically activate count mode from the right panel */
  countModeRequest?: number;
  /** Called when top toolbar Unit Count button is clicked — parent should bootstrap a session if none exists */
  onRequestCountSession?: () => void;
  /** Called when user enters measure mode (Measure / Resume button clicked) */
  onMeasureStart?: () => void;
}

export default function PlanPanel({
  tabKey,
  onPushDistance,
  onDeleteRun,
  onCurrentPageChange,
  activeCountSession = null,
  onPinAdded,
  onPinRemoved,
  allCountSessions = [],
  onClearPagePins,
  onClearPageAll,
  onPdfReplaced,
  onUnitCountToggle,
  countModeRequest = 0,
  onRequestCountSession,
  onMeasureStart,
}: PlanPanelProps) {
  // ── PDF state (IndexedDB for large files) ──────────────────────────────────
  const { value: pdfFile, setValue: setPdfFile, loading: pdfLoading } = useIndexedDB<string | null>(`bp_pdf_${tabKey}`, null);
  const [pdfHash, setPdfHash] = useLocalStorage<string | null>(`bp_pdfhash_${tabKey}`, null);
  const [numPages, setNumPages] = useState<number>(0);

  // ── Current page (1-indexed) ───────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useLocalStorage<number>(`bp_page_${tabKey}`, 1);

  // ── Zoom state ────────────────────────────────────────────────────────────
  // PDF renders ONCE at RENDER_BASE_ZOOM (fixed high-res). All zoom is pure CSS scale.
  // displayZoom is the logical zoom the user sees (e.g. 0.40 = 40%).
  // The CSS transform is: scale(displayZoom / RENDER_BASE_ZOOM)
  const RENDER_BASE_ZOOM = 1.5; // fixed render resolution — never changes
  const [displayZoom, setDisplayZoom] = useLocalStorage<number>(`bp_zoom_${tabKey}`, 0.40);
  const displayZoomRef = useRef(displayZoom);
  useEffect(() => { displayZoomRef.current = displayZoom; }, [displayZoom]);
  // Legacy aliases so existing code that references renderZoom / zoomRef still compiles
  const renderZoom = RENDER_BASE_ZOOM;
  const renderZoomRef = useRef(RENDER_BASE_ZOOM);
  const zoom = displayZoom;
  const zoomRef = displayZoomRef;

  // ── Per-page runs ──────────────────────────────────────────────────────────
  // pageRunsMap[pageIndex] = MeasureRun[]  (pageIndex is 0-based internally)
  const [pageRunsMap, setPageRunsMap] = useLocalStorage<PageRunsMap>(`bp_pageruns_${tabKey}`, {});
  const [pageActiveRunMap, setPageActiveRunMap] = useLocalStorage<PageActiveRunMap>(`bp_pageactive_${tabKey}`, {});

  const pageIdx = currentPage - 1; // 0-based

  // ── Scale persistence keyed by PDF hash + page index ────────────────────
  // Per-page scale map: pageIdx → { ratio: number | null, points: NormPoint[] }
  type PageScaleEntry = { ratio: number | null; points: NormPoint[]; knownFt?: number; pxDist?: number };
  const pageScaleKey = pdfHash ? `bp_pagescale_${tabKey}_${pdfHash}` : `bp_pagescale_${tabKey}_nohash`;
  const [pageScaleMap, setPageScaleMap] = useLocalStorage<Record<number, PageScaleEntry>>(pageScaleKey, {});

  const scaleRatio: number | null = pageScaleMap[pageIdx]?.ratio ?? null;
  const scalePoints: NormPoint[] = pageScaleMap[pageIdx]?.points ?? [];

  const setScaleRatio = useCallback((ratio: number | null, knownFt?: number, pxDist?: number) => {
    setPageScaleMap((prev) => ({
      ...prev,
      [pageIdx]: { ratio, points: prev[pageIdx]?.points ?? [], knownFt: knownFt ?? prev[pageIdx]?.knownFt, pxDist: pxDist ?? prev[pageIdx]?.pxDist },
    }));
  }, [pageIdx, setPageScaleMap]);

  const setScalePoints = useCallback((pts: NormPoint[] | ((p: NormPoint[]) => NormPoint[])) => {
    setPageScaleMap((prev) => {
      const existing = prev[pageIdx]?.points ?? [];
      const next = typeof pts === "function" ? pts(existing) : pts;
      return { ...prev, [pageIdx]: { ratio: prev[pageIdx]?.ratio ?? null, points: next } };
    });
  }, [pageIdx, setPageScaleMap]);

  const [knownDistance, setKnownDistance] = useState<string>("");
  // ── Scale prompt: show on first PDF load if no scale set ─────────────────
  const [showScalePrompt, setShowScalePrompt] = useState(false);
  // ── Drag state for scale points and run points ────────────────────────────
  // dragPointRef: { type: 'scale' | 'run', index: number, runId?: string }
  const dragPointRef = useRef<{ type: 'scale' | 'run'; index: number; runId?: string } | null>(null);
  // ── Delete confirm dialog ─────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<{ count: number; name?: string; onConfirm: () => void } | null>(null);
  // ── PDF replace confirmation ──────────────────────────────────────────────
  const [pendingPdfFile, setPendingPdfFile] = useState<{ dataUrl: string; hash: string } | null>(null);
  // ── Right-click context menu ──────────────────────────────────────────────
  // Shown when user right-clicks in measure mode; lets them continue a run from
  // the clicked point. { x, y } are viewport pixel coordinates for positioning.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; normPt: NormPoint } | null>(null);
  const lastRightClickRef = useRef<{ time: number; x: number; y: number } | null>(null);
  // ── Paused run tracking ───────────────────────────────────────────────────
  // When the user switches to Unit Count mid-run, we save the active run id so
  // we can resume it automatically when they switch back to Measure mode.
  const [pausedRunId, setPausedRunId] = useState<string | null>(null);

  // ── Count pins (session-based, cross-page) ────────────────────────────────
  // Pins live in the parent's CountSession state, not in a local PagePinsMap.
  // currentPins = pins on this page from the active session (for display).
  // allPagePins = all pins on this page from all sessions (for canvas rendering).
  const currentPins: CountPin[] = (activeCountSession?.pins ?? []).filter(
    (p) => p.pageNumber === currentPage
  );
  const allPagePins: Array<CountPin & { color: string; iconId: string }> = allCountSessions.flatMap((session) =>
    session.pins
      .filter((p) => p.pageNumber === currentPage)
      .map((p) => ({ ...p, color: session.color, iconId: session.iconId }))
  );

  // Ref so canvas handlers can read current pins without stale closure
  const currentPinsRef = useRef(currentPins);
  useEffect(() => { currentPinsRef.current = currentPins; }, [currentPins]);
  const allPagePinsRef = useRef(allPagePins);
  useEffect(() => { allPagePinsRef.current = allPagePins; }, [allPagePins]);

  // Get runs for current page (lazy-init with one default run)
  const currentRuns: MeasureRun[] = pageRunsMap[pageIdx] ?? [];
  const currentActiveRunId: string = pageActiveRunMap[pageIdx] ?? currentRuns[0]?.id ?? "";

  const setCurrentRuns = useCallback((updater: MeasureRun[] | ((prev: MeasureRun[]) => MeasureRun[])) => {
    setPageRunsMap((prev) => {
      const existing = prev[pageIdx] ?? [];
      const next = typeof updater === "function" ? updater(existing) : updater;
      return { ...prev, [pageIdx]: next };
    });
  }, [pageIdx, setPageRunsMap]);

  const setCurrentActiveRunId = useCallback((id: string) => {
    setPageActiveRunMap((prev) => ({ ...prev, [pageIdx]: id }));
  }, [pageIdx, setPageActiveRunMap]);

  const activeRun = currentRuns.find((r) => r.id === currentActiveRunId) ?? currentRuns[0] ?? null;
  const activeRunColor = activeRun?.color ?? BASE_PALETTE[0];

  // ── UI state ───────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("none");
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  // Activate count mode when right panel Unit Count button is pressed
  useEffect(() => {
    if (countModeRequest > 0) {
      setMode("count");
      modeRef.current = "count";
      onUnitCountToggle?.(true);
      toast.info("Unit Count: click to place a pin · right-click to remove.");
    }
  }, [countModeRequest]); // eslint-disable-line react-hooks/exhaustive-deps
  const [hideUnselected, setHideUnselected] = useState(false);
  const [showPageOverview, setShowPageOverview] = useState(false);
  // Saved/favorite custom colors (persisted in localStorage)
  const [savedColors, setSavedColors] = useLocalStorage<string[]>("bp_saved_colors", []);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);   // fixed-size overflow:hidden viewport
  const scrollAreaRef = viewportRef;                  // alias kept for legacy code
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const pageSizeRef = useRef<{ w: number; h: number } | null>(null);
  const [pageReady, setPageReady] = useState(false);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  // Free-drag pan state — stored as translate offsets (px)
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

    // ── Dynamic color-matched cursor ──────────────────────────────────────────────
  // Color for the overlay cursor dot — always yellow in scale, measure, and count modes
  const activeCursorColor = useMemo(() => {
    if (mode === "set-scale-p1" || mode === "set-scale-p2") return "#F5C518";
    if (mode === "measure") return "#F5C518";
    if (mode === "count") return "#F5C518";
    return null; // no custom cursor needed
  }, [mode]);
  // mousePos for the smooth pointer-events:none overlay cursor (no browser cursor lag)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  // ── Full-screen crosshair overlay state ──────────────────────────────────
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

  // Legacy panRef alias (scroll-based pan no longer used)
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);

  // ── Fit-to-page zoom ─────────────────────────────────────────────────────
  const fitZoomRef = useRef<number>(0.40);
  const [fitZoom, setFitZoom] = useState<number>(0.40);
  const autoFittedRef = useRef<boolean>(false);

  // Page natural size in CSS pixels at displayZoom=1
  // pageSizeRef stores the rendered size at RENDER_BASE_ZOOM, so natural = size / RENDER_BASE_ZOOM
  const pageNatSize = useCallback(() => {
    const ps = pageSizeRef.current;
    if (!ps) return null;
    return { w: ps.w / RENDER_BASE_ZOOM, h: ps.h / RENDER_BASE_ZOOM };
  }, [RENDER_BASE_ZOOM]);

  // Center page in viewport at given displayZoom
  const centerPage = useCallback((z: number) => {
    const vp = viewportRef.current;
    const nat = pageNatSize();
    if (!vp || !nat) return;
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    const ox = (vpW - nat.w * z) / 2;
    const oy = (vpH - nat.h * z) / 2;
    panOffsetRef.current = { x: ox, y: oy };
    setPanOffset({ x: ox, y: oy });
  }, [pageNatSize]);

  useEffect(() => {
    if (!pageReady || !pageSizeRef.current) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const nat = pageNatSize();
    if (!nat) return;
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    const fitW = (vpW - 32) / nat.w;
    const fitH = (vpH - 32) / nat.h;
    const fit = parseFloat(Math.min(fitW, fitH, MAX_ZOOM).toFixed(4));
    fitZoomRef.current = fit;
    setFitZoom(fit);
    if (!autoFittedRef.current) {
      autoFittedRef.current = true;
      const startZoom = 0.40;
      setDisplayZoom(startZoom);
      displayZoomRef.current = startZoom;
      centerPage(startZoom);
    }
  }, [pageReady, centerPage, pageNatSize]); // eslint-disable-line

  // Reset auto-fit flag when page changes
  useEffect(() => {
    autoFittedRef.current = false;
  }, [currentPage, pdfFile]);

  // Re-center when viewport resizes (panel drag)
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    let lastW = vp.clientWidth;
    let lastH = vp.clientHeight;
    const ro = new ResizeObserver(() => {
      const newW = vp.clientWidth;
      const newH = vp.clientHeight;
      if (newW === lastW && newH === lastH) return;
      const dw = newW - lastW;
      const dh = newH - lastH;
      lastW = newW;
      lastH = newH;
      panOffsetRef.current = {
        x: panOffsetRef.current.x + dw / 2,
        y: panOffsetRef.current.y + dh / 2,
      };
      setPanOffset({ ...panOffsetRef.current });
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);

  // Reset page render state when page changes
  useEffect(() => {
    pageSizeRef.current = null;
    setPageReady(false);
    setMode("none");
    modeRef.current = "none";
  }, [currentPage, pdfFile]);

  // ── NormPoint → canvas pixel coords (single-page: pageIndex always 0) ─────
  const normToCanvas = useCallback(
    (pt: NormPoint): { x: number; y: number } | null => {
      const s = pageSizeRef.current;
      if (!s || s.w === 0) return null;
      return { x: pt.nx * s.w, y: pt.ny * s.h };
    },
    []
  );

  // ── Canvas pixel → NormPoint ───────────────────────────────────────────────
  const canvasToNorm = useCallback(
    (cx: number, cy: number): NormPoint | null => {
      const s = pageSizeRef.current;
      if (!s || s.w === 0) return null;
      return { pageIndex: 0, nx: cx / s.w, ny: cy / s.h };
    },
    []
  );

  // ── Pixel distance between two NormPoints ──────────────────────────────────
  const normDist = useCallback(
    (a: NormPoint, b: NormPoint): number => {
      const ca = normToCanvas(a);
      const cb = normToCanvas(b);
      if (!ca || !cb) return 0;
      return dist2D(ca.x, ca.y, cb.x, cb.y);
    },
    [normToCanvas]
  );

  // ── Recompute run totals when points/scale/zoom changes ───────────────────
  useEffect(() => {
    if (!scaleRatio || !pageReady) return;
    // scaleRatio is px/ft at zoom=1; canvas pixels are at RENDER_BASE_ZOOM
    const pxPerFt = scaleRatio * RENDER_BASE_ZOOM;
    setCurrentRuns((prev) =>
      prev.map((run) => {
        if (run.points.length < 2) return { ...run, totalFeet: null };
        let totalPx = 0;
        for (let i = 1; i < run.points.length; i++) {
          totalPx += normDist(run.points[i - 1], run.points[i]);
        }
        return { ...run, totalFeet: parseFloat((totalPx / pxPerFt).toFixed(2)) };
      })
    );
  }, [currentRuns.map(r => r.points.length).join(","), scaleRatio, pageReady]); // eslint-disable-line

  // ── Draw overlay canvas ────────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = pageSizeRef.current;
    if (!s || s.w === 0) return;

    canvas.width = s.w;
    canvas.height = s.h;
    canvas.style.width = `${s.w}px`;
    canvas.style.height = `${s.h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Scale factor so strokes/fonts appear constant size on screen ────────────
    // Canvas is rendered at RENDER_BASE_ZOOM but displayed at displayZoom via CSS.
    // To make a 2px screen line, we need: canvasPx = 2 * (RENDER_BASE_ZOOM / displayZoom)
    const dz = displayZoomRef.current || 0.40;
    const S = RENDER_BASE_ZOOM / dz;  // canvas px per 1 screen px

    // ── Draw a run (polyline + dots + per-segment labels) ──────────────────
    const drawRun = (run: MeasureRun, color: string, isActive: boolean) => {
      const pts = run.points.map(normToCanvas).filter(Boolean) as { x: number; y: number }[];
      if (pts.length === 0) return;

      // Outer glow halo — wide, low-opacity bloom
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = color;
        ctx.lineWidth = (isActive ? 14 : 10) * S;
        ctx.setLineDash([]);
        ctx.globalAlpha = isActive ? 0.22 : 0.14;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Mid glow — tighter, brighter
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = color;
        ctx.lineWidth = (isActive ? 6 : 4) * S;
        ctx.setLineDash([]);
        ctx.globalAlpha = isActive ? 0.45 : 0.30;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Dark outline for contrast on light plans
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = (isActive ? 4.5 : 3.5) * S;
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.stroke();
      }

      // Crisp bright core line
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = color;
        ctx.lineWidth = (isActive ? 2.5 : 1.8) * S;
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.stroke();
      }

      // Labels — per-segment or collapsed run total depending on zoom
      if (scaleRatio && pageReady) {
        const pxPerFt = scaleRatio * RENDER_BASE_ZOOM;
        // Font scales with canvas resolution (shrinks as you zoom out)
        const fontSize = Math.max(6, Math.round(9 * RENDER_BASE_ZOOM));
        ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;

        // Collapse threshold: if any segment's screen-pixel length < 40px, show run total only
        const MIN_SEG_SCREEN_PX = 40;
        const showPerSeg = pts.length < 2 ? false : (() => {
          for (let i = 1; i < pts.length; i++) {
            const screenLen = dist2D(pts[i-1].x, pts[i-1].y, pts[i].x, pts[i].y) * dz / RENDER_BASE_ZOOM;
            if (screenLen < MIN_SEG_SCREEN_PX) return false;
          }
          return true;
        })();

        // Helper: draw a label with a semi-transparent pill background
        const drawLabel = (text: string, x: number, y: number, angle: number) => {
          ctx.save();
          ctx.translate(x, y);
          const flip = Math.abs(angle) > Math.PI / 2;
          ctx.rotate(flip ? angle + Math.PI : angle);
          const pad = 5 * S;
          const tw = ctx.measureText(text).width + pad * 2;
          const th = fontSize + pad * 1.2;
          const ry = 3 * S;
          // Semi-transparent dark pill
          ctx.fillStyle = "rgba(0,0,0,0.72)";
          ctx.beginPath();
          ctx.roundRect(-tw / 2, -(th + 3 * S), tw, th, ry);
          ctx.fill();
          // Colored text
          ctx.fillStyle = color;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(text, 0, -(3 * S));
          ctx.restore();
        };

        if (showPerSeg) {
          // Per-segment labels
          for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1];
            const b = pts[i];
            const segPx = dist2D(a.x, a.y, b.x, b.y);
            const segFt = segPx / pxPerFt;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const angle = Math.atan2(b.y - a.y, b.x - a.x);
            drawLabel(`${segFt.toFixed(1)}'`, mx, my, angle);
          }
        } else if (pts.length >= 2) {
          // Collapsed: show run total near midpoint of whole run
          const totalPx = pts.reduce((sum, _, i) => i === 0 ? sum : sum + dist2D(pts[i-1].x, pts[i-1].y, pts[i].x, pts[i].y), 0);
          const totalFt = totalPx / pxPerFt;
          const mid = pts[Math.floor(pts.length / 2)];
          drawLabel(`${totalFt.toFixed(1)}' total`, mid.x, mid.y, 0);
        }
      }

      // Dots — color-matched to the run line, white halo for contrast
      const dotR = (isActive ? 5 : 4) * S;
      pts.forEach((p, i) => {
        // White halo for contrast
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR + 2 * S, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
        // Color-matched fill (same as the run line)
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        // Thin dark ring
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 1 * S;
        ctx.stroke();
        if (isActive && (i === 0 || i === pts.length - 1)) {
          ctx.fillStyle = color;
          ctx.font = `bold ${Math.round(11 * S)}px 'JetBrains Mono', monospace`;
          ctx.fillText(i === 0 ? "▶" : "■", p.x + 7 * S, p.y - 6 * S);
        }
      });

      // Run name label near first point
      if (pts.length > 0 && currentRuns.length > 1) {
        const nameFontSize = Math.round(12 * S);
        ctx.font = `bold ${nameFontSize}px 'Space Grotesk', sans-serif`;
        const nameText = run.name;
        const nw = ctx.measureText(nameText).width + 8 * S;
        const nh = nameFontSize + 6 * S;
        const nx = pts[0].x + 10 * S;
        const ny = pts[0].y + 14 * S;
        ctx.fillStyle = "rgba(10,10,10,0.75)";
        ctx.beginPath();
        ctx.roundRect(nx - 4 * S, ny - nh + 2 * S, nw, nh, 3 * S);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.globalAlpha = isActive ? 1 : 0.6;
        ctx.fillText(nameText, nx, ny);
        ctx.globalAlpha = 1;
      }
    };

    // ── Count pins ──────────────────────────────────────────────────────────
    const pinsToRender = allPagePinsRef.current;
    pinsToRender.forEach((pin, idx) => {
      const px = normToCanvas({ pageIndex: 0, nx: pin.nx, ny: pin.ny });
      if (!px) return;

      const shape = (pin.iconId ?? DEFAULT_ICON_ID) as string;
      const color = pin.color;

      // Pin sizes are FIXED in canvas pixels regardless of zoom.
      // S = RENDER_BASE_ZOOM / displayZoom, so sizes stay constant on screen.
      // ── Dots (solid filled) — SM / MD / LG / XL
      const DOT_SM = 3 * S;
      const DOT_MD = 5 * S;
      const DOT_LG = 8 * S;
      const DOT_XL = 11 * S;
      // ── Circles (stroke-only rings) — SM / MD / LG / XL
      const CIR_SM = 8 * S;
      const CIR_MD = 11 * S;
      const CIR_LG = 14 * S;
      const CIR_XL = 18 * S;
      // ── Squares (half-side) — SM / MD / LG / XL
      const SQ_SM  = 7 * S;
      const SQ_MD  = 10 * S;
      const SQ_LG  = 14 * S;
      const SQ_XL  = 18 * S;
      // ── Triangles (half-base) — SM / MD / LG / XL
      const TRI_SM = 7 * S;
      const TRI_MD = 10 * S;
      const TRI_LG = 14 * S;
      const TRI_XL = 18 * S;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2 * S;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([]);

      // Drop shadow for visibility against any background
      ctx.shadowColor = "rgba(0,0,0,0.70)";
      ctx.shadowBlur = 4 * S;

      const drawTriangle = (half: number) => {
        const h = half * 1.73; // equilateral height
        ctx.beginPath();
        ctx.moveTo(px.x, px.y - h * 0.67);
        ctx.lineTo(px.x + half, px.y + h * 0.33);
        ctx.lineTo(px.x - half, px.y + h * 0.33);
        ctx.closePath();
        ctx.stroke();
      };

      // ── Dots
      if (shape === "dot-sm") {
        ctx.beginPath(); ctx.arc(px.x, px.y, DOT_SM, 0, Math.PI * 2); ctx.fill();
      } else if (shape === "dot-md") {
        ctx.beginPath(); ctx.arc(px.x, px.y, DOT_MD, 0, Math.PI * 2); ctx.fill();
      } else if (shape === "dot-lg") {
        ctx.beginPath(); ctx.arc(px.x, px.y, DOT_LG, 0, Math.PI * 2); ctx.fill();
      } else if (shape === "dot-xl") {
        ctx.beginPath(); ctx.arc(px.x, px.y, DOT_XL, 0, Math.PI * 2); ctx.fill();
      // ── Circles
      } else if (shape === "circle-sm") {
        ctx.beginPath(); ctx.arc(px.x, px.y, CIR_SM, 0, Math.PI * 2); ctx.stroke();
      } else if (shape === "circle-md") {
        ctx.beginPath(); ctx.arc(px.x, px.y, CIR_MD, 0, Math.PI * 2); ctx.stroke();
      } else if (shape === "circle-lg") {
        ctx.beginPath(); ctx.arc(px.x, px.y, CIR_LG, 0, Math.PI * 2); ctx.stroke();
      } else if (shape === "circle-xl") {
        ctx.beginPath(); ctx.arc(px.x, px.y, CIR_XL, 0, Math.PI * 2); ctx.stroke();
      // ── Squares
      } else if (shape === "square-sm") {
        ctx.strokeRect(px.x - SQ_SM, px.y - SQ_SM, SQ_SM * 2, SQ_SM * 2);
      } else if (shape === "square-md") {
        ctx.strokeRect(px.x - SQ_MD, px.y - SQ_MD, SQ_MD * 2, SQ_MD * 2);
      } else if (shape === "square-lg") {
        ctx.strokeRect(px.x - SQ_LG, px.y - SQ_LG, SQ_LG * 2, SQ_LG * 2);
      } else if (shape === "square-xl") {
        ctx.strokeRect(px.x - SQ_XL, px.y - SQ_XL, SQ_XL * 2, SQ_XL * 2);
      // ── Triangles
      } else if (shape === "triangle-sm") {
        drawTriangle(TRI_SM);
      } else if (shape === "triangle-md") {
        drawTriangle(TRI_MD);
      } else if (shape === "triangle-lg") {
        drawTriangle(TRI_LG);
      } else if (shape === "triangle-xl") {
        drawTriangle(TRI_XL);
      // ── Legacy IDs (backward compat for any saved sessions)
      } else if (shape === "dot-xs" || shape === "dot") {
        ctx.beginPath(); ctx.arc(px.x, px.y, DOT_MD, 0, Math.PI * 2); ctx.fill();
      } else if (shape === "circle" || shape === "large-circle") {
        ctx.beginPath(); ctx.arc(px.x, px.y, CIR_MD, 0, Math.PI * 2); ctx.stroke();
      } else if (shape === "xl-circle") {
        ctx.beginPath(); ctx.arc(px.x, px.y, CIR_XL, 0, Math.PI * 2); ctx.stroke();
      } else if (shape === "square") {
        ctx.strokeRect(px.x - SQ_MD, px.y - SQ_MD, SQ_MD * 2, SQ_MD * 2);
      } else if (shape === "triangle") {
        drawTriangle(TRI_MD);
      } else {
        // Fallback: filled dot MD
        ctx.beginPath(); ctx.arc(px.x, px.y, DOT_MD, 0, Math.PI * 2); ctx.fill();
      }

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.restore();

      // Index badge below the pin — font size scales with the shape size
      // Compute the visual radius of the shape so the number sits just below it
      const shapeRadius = (() => {
        if (shape === "dot-sm") return DOT_SM;
        if (shape === "dot-md") return DOT_MD;
        if (shape === "dot-lg") return DOT_LG;
        if (shape === "dot-xl") return DOT_XL;
        if (shape === "circle-sm") return CIR_SM;
        if (shape === "circle-md") return CIR_MD;
        if (shape === "circle-lg") return CIR_LG;
        if (shape === "circle-xl") return CIR_XL;
        if (shape === "square-sm") return SQ_SM;
        if (shape === "square-md") return SQ_MD;
        if (shape === "square-lg") return SQ_LG;
        if (shape === "square-xl") return SQ_XL;
        if (shape === "triangle-sm") return TRI_SM;
        if (shape === "triangle-md") return TRI_MD;
        if (shape === "triangle-lg") return TRI_LG;
        if (shape === "triangle-xl") return TRI_XL;
        return DOT_MD; // fallback
      })();
      // Badge font: 6px for SM, 8px for MD, 10px for LG, 12px for XL (in screen px)
      const badgePx = shape.endsWith("-sm") ? 6 : shape.endsWith("-md") ? 8 : shape.endsWith("-lg") ? 10 : 12;
      const badgeSize = Math.round(badgePx * S);
      ctx.font = `bold ${badgeSize}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = color;
      ctx.fillText(String(idx + 1), px.x, px.y + shapeRadius + 2 * S);
    });

    // Draw all inactive runs first, then active on top
    if (!hideUnselected) {
      currentRuns.forEach((run) => {
        if (run.id !== currentActiveRunId) {
          drawRun(run, run.color ?? BASE_PALETTE[0], false);
        }
      });
    }
    const activeIdx = currentRuns.findIndex((r) => r.id === currentActiveRunId);
    if (activeIdx >= 0) drawRun(currentRuns[activeIdx], currentRuns[activeIdx].color ?? BASE_PALETTE[0], true);

    // ── Scale reference line ───────────────────────────────────────────────────
    const scalePts = scalePoints.map(normToCanvas).filter(Boolean) as { x: number; y: number }[];
    if (scalePts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(scalePts[0].x, scalePts[0].y);
      ctx.lineTo(scalePts[1].x, scalePts[1].y);
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 4 * S;
      ctx.setLineDash([]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(scalePts[0].x, scalePts[0].y);
      ctx.lineTo(scalePts[1].x, scalePts[1].y);
      ctx.strokeStyle = "#F5C518";
      ctx.lineWidth = 2 * S;
      ctx.setLineDash([8 * S, 5 * S]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    scalePts.forEach((p, i) => {
      // White halo
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8 * S, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
      // Yellow fill — matches the scale line color
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 * S, 0, Math.PI * 2);
      ctx.fillStyle = "#F5C518";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 1.5 * S;
      ctx.stroke();
      // Label
            ctx.fillStyle = "#F5C518";
      ctx.font = `bold ${Math.round(11 * S)}px 'JetBrains Mono', monospace`;
      ctx.fillText(`S${i + 1}`, p.x + 9 * S, p.y - 7 * S);
    });
    // ── Full-screen crosshair overlay ────────────────────────────────────────────
    // Draws spanning hairlines from edge to edge in the active color.
    // Color: yellow for scale mode, active run color for measure mode.
    if (crosshair) {
      const { x, y } = crosshair;
      // Crosshair lines are always yellow regardless of mode
      const hex = "#F5C518";
      // Parse hex to rgb for rgba usage
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      ctx.save();
      ctx.setLineDash([]);
      // Outer soft glow
      ctx.strokeStyle = `rgba(${r},${g},${b},0.18)`;
      ctx.lineWidth = 8 * S;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      // Mid glow
      ctx.strokeStyle = `rgba(${r},${g},${b},0.45)`;
      ctx.lineWidth = 3 * S;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      // Crisp inner hairline
      ctx.strokeStyle = `rgba(${r},${g},${b},1)`;
      ctx.lineWidth = 1 * S;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      ctx.restore();
    }
  }, [currentRuns, currentActiveRunId, scalePoints, normToCanvas, scaleRatio, pageReady, hideUnselected, displayZoom, currentPins, allPagePins, crosshair, activeRunColor]);

  useEffect(() => { drawCanvas(); }, [drawCanvas, pageReady, crosshair]);
  // Clear crosshair guide whenever mode returns to idle
  useEffect(() => { if (mode === "none") setCrosshair(null); }, [mode]);

  // ── File upload ────────────────────────────────────────────────────────────
  const applyPdfLoad = useCallback((dataUrl: string, hash: string) => {
    setPdfHash(hash);
    setPdfFile(dataUrl);
    // Reset per-page runs, scale, and go to page 1
    setPageRunsMap({});
    setPageActiveRunMap({});
    setPageScaleMap({});
    setCurrentPage(1);
    setMode("none");
    modeRef.current = "none";
    pageSizeRef.current = null;
    setPageReady(false);
    // Clear all overlays so tools are not hidden after PDF replacement
    setShowPageOverview(false);
    setShowScalePrompt(false);
    setDeleteConfirm(null);
    setScalePoints([]);
    // Notify parent to clear count pins and sessions
    onPdfReplaced?.();
    toast.success("PDF loaded. Set scale before measuring.");
  }, [setPdfHash, setPdfFile, setPageRunsMap, setPageActiveRunMap, setPageScaleMap, setCurrentPage, setPageReady, onPdfReplaced, setShowPageOverview, setShowScalePrompt, setDeleteConfirm, setScalePoints]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Please upload a PDF file."); return; }
    // Reset the input so the same file can be re-selected
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const sample = dataUrl.slice(0, 2048);
      let h = 0;
      for (let i = 0; i < sample.length; i++) { h = (Math.imul(31, h) + sample.charCodeAt(i)) | 0; }
      const hash = (h >>> 0).toString(16);
      if (pdfFile) {
        // A PDF is already loaded — ask for confirmation before replacing
        setPendingPdfFile({ dataUrl, hash });
      } else {
        applyPdfLoad(dataUrl, hash);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Page render callback ───────────────────────────────────────────────────
  const onPageRenderSuccess = useCallback((page: { width: number; height: number }) => {
    pageSizeRef.current = { w: page.width, h: page.height };
    setPageReady(true);
  }, []);

  // Dismiss scale prompt when scale is set (e.g. after user completes set-scale flow)
  // We do NOT auto-show the prompt on page load — only when user tries to measure
  useEffect(() => {
    if (pageReady && scaleRatio !== null) {
      setShowScalePrompt(false);
    }
  }, [pageReady, scaleRatio]);

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  // No debounce needed — PDF renders once at RENDER_BASE_ZOOM, zoom is pure CSS scale.
  const zoomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null); // kept for compat

  const applyZoom = useCallback((
    newZoomRaw: number,
    focalClientX?: number,
    focalClientY?: number
  ) => {
    const vp = viewportRef.current;
    if (!vp) return;

    const oldZoom = displayZoomRef.current;
    const effectiveMin = Math.max(fitZoomRef.current * 0.50, MIN_ZOOM);
    const newZoom = clamp(parseFloat(newZoomRaw.toFixed(4)), effectiveMin, MAX_ZOOM);
    if (Math.abs(newZoom - oldZoom) < 0.001) return;

    // Focal point in viewport-local coords
    const rect = vp.getBoundingClientRect();
    const vpX = focalClientX !== undefined ? focalClientX - rect.left : rect.width / 2;
    const vpY = focalClientY !== undefined ? focalClientY - rect.top  : rect.height / 2;

    // Keep the point under the cursor fixed in page space
    const ox = panOffsetRef.current.x;
    const oy = panOffsetRef.current.y;
    const pageX = (vpX - ox) / oldZoom;
    const pageY = (vpY - oy) / oldZoom;
    const newOx = vpX - pageX * newZoom;
    const newOy = vpY - pageY * newZoom;

    // Clamp pan so at least 80px of the page stays visible in each axis
    const nat = pageNatSize();
    const MARGIN = 80;
    const clampedOx = nat ? clamp(newOx, -(nat.w * newZoom - MARGIN), vp.clientWidth - MARGIN) : newOx;
    const clampedOy = nat ? clamp(newOy, -(nat.h * newZoom - MARGIN), vp.clientHeight - MARGIN) : newOy;

    panOffsetRef.current = { x: clampedOx, y: clampedOy };
    setPanOffset({ x: clampedOx, y: clampedOy });

    // Pure CSS scale — no PDF re-render needed
    setDisplayZoom(newZoom);
    displayZoomRef.current = newZoom;
  }, [pageNatSize]);

  const zoomIn = useCallback(() => {
    const cur = displayZoomRef.current;
    const next = ZOOM_STEPS.find(s => s > cur + 0.005) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
    applyZoom(next);
  }, [applyZoom]);

  const zoomOut = useCallback(() => {
    const cur = displayZoomRef.current;
    const prev = [...ZOOM_STEPS].reverse().find(s => s < cur - 0.005) ?? ZOOM_STEPS[0];
    applyZoom(prev);
  }, [applyZoom]);

  // Reset zoom = 40% centered
  const zoomReset = useCallback(() => {
    const targetZoom = 0.40;
    setDisplayZoom(targetZoom);
    displayZoomRef.current = targetZoom;
    centerPage(targetZoom);
  }, [centerPage]);

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Snap to nearest 5% step in the direction of scroll
      const cur = displayZoomRef.current;
      const goingUp = e.deltaY < 0;
      const next = goingUp
        ? ZOOM_STEPS.find(s => s > cur + 0.005) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]
        : [...ZOOM_STEPS].reverse().find(s => s < cur - 0.005) ?? ZOOM_STEPS[0];
      applyZoom(next, e.clientX, e.clientY);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  // ── Pinch zoom ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const getTouchDist = (e: TouchEvent) => Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY
    );
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2)
        pinchRef.current = { startDist: getTouchDist(e), startZoom: displayZoomRef.current };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const ratio = getTouchDist(e) / pinchRef.current.startDist;
        const mid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        applyZoom(clamp(pinchRef.current.startZoom * ratio, MIN_ZOOM, MAX_ZOOM), mid.x, mid.y);
      }
    };
    const onTouchEnd = () => { pinchRef.current = null; };
    vp.addEventListener("touchstart", onTouchStart, { passive: true });
    vp.addEventListener("touchmove", onTouchMove, { passive: false });
    vp.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      vp.removeEventListener("touchstart", onTouchStart);
      vp.removeEventListener("touchmove", onTouchMove);
      vp.removeEventListener("touchend", onTouchEnd);
    };
  }, [applyZoom]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomIn(); }
      if (e.key === "-") { e.preventDefault(); zoomOut(); }
      if (e.key === "0") { e.preventDefault(); zoomReset(); }
      if ((e.key === "u" || e.key === "U") && !e.ctrlKey && !e.metaKey) { e.preventDefault(); handleUndo(); }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        if (modeRef.current === "measure") {
          setMode("none");
          modeRef.current = "none";
        } else if (pdfFile) {
          // M key: start a new run and activate measure mode (scale required - addRun checks)
          addRun();
        }
      }
      if (e.key === "Escape") {
        setCtxMenu(null);
        setMode("none");
        modeRef.current = "none";
      }
      if (e.key === "ArrowLeft" && numPages > 1) {
        e.preventDefault();
        setCurrentPage((p) => Math.max(1, p - 1));
      }
      if (e.key === "ArrowRight" && numPages > 1) {
        e.preventDefault();
        setCurrentPage((p) => Math.min(numPages, p + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, zoomReset, scaleRatio, numPages]); // eslint-disable-line

  // ── Canvas click handler ───────────────────────────────────────────────────
  // Canvas is rendered at renderZoom; getBoundingClientRect gives display size.
  // During the transient CSS scale (displayZoom != renderZoom) the canvas is also
  // scaled, so we must account for the visual scale to get correct canvas pixels.
  // ── Helper: canvas coords from mouse event ───────────────────────────────────────────
  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      cx: (e.clientX - rect.left) * scaleX,
      cy: (e.clientY - rect.top)  * scaleY,
    };
  }, []);

  // ── Hit-test helpers ──────────────────────────────────────────────────────────────────
  const HIT_PX = 14; // screen pixels
  const hitTestPoint = useCallback((cx: number, cy: number, pt: NormPoint): boolean => {
    const p = normToCanvas(pt);
    if (!p) return false;
    const screenDist = dist2D(cx, cy, p.x, p.y) * (displayZoomRef.current / RENDER_BASE_ZOOM);
    return screenDist <= HIT_PX;
  }, [normToCanvas]);

  const hitTestSegment = useCallback((cx: number, cy: number, a: NormPoint, b: NormPoint): boolean => {
    const pa = normToCanvas(a);
    const pb = normToCanvas(b);
    if (!pa || !pb) return false;
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return dist2D(cx, cy, pa.x, pa.y) * (displayZoomRef.current / RENDER_BASE_ZOOM) <= HIT_PX;
    const t = Math.max(0, Math.min(1, ((cx - pa.x) * dx + (cy - pa.y) * dy) / lenSq));
    const projX = pa.x + t * dx;
    const projY = pa.y + t * dy;
    return dist2D(cx, cy, projX, projY) * (displayZoomRef.current / RENDER_BASE_ZOOM) <= HIT_PX;
  }, [normToCanvas]);

  // ── Canvas mouse down: start drag if near a point, else click-to-place ───────
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const { cx, cy } = coords;
    const m = modeRef.current;

    // In scale modes: check if clicking near an existing scale point to drag it
    if (m === "set-scale-p1" || m === "set-scale-p2") {
      for (let i = 0; i < scalePoints.length; i++) {
        if (hitTestPoint(cx, cy, scalePoints[i])) {
          dragPointRef.current = { type: 'scale', index: i };
          setMode("drag-scale");
          modeRef.current = "drag-scale";
          e.stopPropagation();
          return;
        }
      }
    }

    // In measure mode: check if clicking near an existing run point to drag it
    if (m === "measure" && activeRun) {
      for (let i = 0; i < activeRun.points.length; i++) {
        if (hitTestPoint(cx, cy, activeRun.points[i])) {
          dragPointRef.current = { type: 'run', index: i, runId: activeRun.id };
          setMode("drag-run");
          modeRef.current = "drag-run";
          e.stopPropagation();
          return;
        }
      }
    }

    // In none mode: check if clicking near a run line to activate that run
    if (m === "none") {
      for (const run of currentRuns) {
        if (run.points.length < 2) continue;
        for (let i = 1; i < run.points.length; i++) {
          if (hitTestSegment(cx, cy, run.points[i - 1], run.points[i])) {
            setCurrentActiveRunId(run.id);
            setPausedRunId(null); // user explicitly selected a different run — clear any paused state
            setMode("measure");
            modeRef.current = "measure";
            toast.info(`"${run.name}" selected — click to add points or press Esc to finish.`);
            e.stopPropagation();
            return;
          }
        }
      }
    }
  }, [getCanvasCoords, scalePoints, hitTestPoint, hitTestSegment, activeRun, currentRuns, setCurrentActiveRunId]);

  // ── Canvas mouse move during drag ───────────────────────────────────────────────
  const handleCanvasDragMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragPointRef.current;
    if (!drag) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const { cx, cy } = coords;
    const pt = canvasToNorm(cx, cy);
    if (!pt) return;

    if (drag.type === 'scale') {
      setScalePoints((prev) => {
        const next = [...prev];
        next[drag.index] = pt;
        return next;
      });
    } else if (drag.type === 'run' && drag.runId) {
      setCurrentRuns((prev) =>
        prev.map((r) => {
          if (r.id !== drag.runId) return r;
          const pts = [...r.points];
          pts[drag.index] = pt;
          return { ...r, points: pts };
        })
      );
    }
  }, [getCanvasCoords, canvasToNorm, setScalePoints, setCurrentRuns]);

  // ── Canvas mouse up: end drag ────────────────────────────────────────────────────────
  const handleCanvasDragEnd = useCallback(() => {
    const drag = dragPointRef.current;
    if (!drag) return;
    dragPointRef.current = null;
    if (drag.type === 'scale') {
      setMode("set-scale-p2");
      modeRef.current = "set-scale-p2";
    } else {
      setMode("measure");
      modeRef.current = "measure";
    }
  }, []);

  // ── Canvas click handler ──────────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragPointRef.current !== null) return; // just finished a drag
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const { cx, cy } = coords;
    const pt = canvasToNorm(cx, cy);
    if (!pt) return;

    const m = modeRef.current;
    if (m === "set-scale-p1") {
      setScalePoints([pt]);
      setMode("set-scale-p2");
      modeRef.current = "set-scale-p2";
    } else if (m === "set-scale-p2") {
      if (scalePoints.length === 0 || !hitTestPoint(cx, cy, scalePoints[0])) {
        setScalePoints((prev) => [...prev.slice(0, 1), pt]);
      }
    } else if (m === "measure") {
      const isNearExisting = activeRun?.points.some((p) => hitTestPoint(cx, cy, p)) ?? false;
      if (!isNearExisting) {
        setCurrentRuns((prev) =>
          prev.map((r) =>
            r.id === currentActiveRunId ? { ...r, points: [...r.points, pt] } : r
          )
        );
      }
    } else if (m === "count") {
      if (!activeCountSession) {
        toast.warning("Create a count session first.");
        return;
      }
      const newPin: CountPin = {
        id: nanoid6(),
        nx: pt.nx,
        ny: pt.ny,
        pageNumber: currentPage,
      };
      onPinAdded?.(newPin);
      const total = (activeCountSession.pins.length) + 1;
      toast.success(`Pin ${total} placed (${activeCountSession.name}).`);
    }
  }, [getCanvasCoords, canvasToNorm, setScalePoints, setCurrentRuns, currentActiveRunId, activeCountSession, currentPage, onPinAdded, scalePoints, hitTestPoint, activeRun]);

  // ── Canvas right-click ────────────────────────────────────────────────────
  // • In "count" mode: remove nearest pin
  // • In "measure" mode: show "Continue run from here" context menu
  // • Otherwise: no-op (prevent default to avoid browser menu)
  const handleCanvasContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const m = modeRef.current;

    if (m === "count") {
      // Delete nearest pin
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top)  * scaleY;
      const s = pageSizeRef.current;
      if (!s) return;
      const HIT_RADIUS = 20 * (canvas.width / (s.w * (displayZoomRef.current / RENDER_BASE_ZOOM)));
      const pins = currentPinsRef.current;
      let closest: { id: string; dist: number } | null = null;
      pins.forEach((pin) => {
        const px = normToCanvas({ pageIndex: 0, nx: pin.nx, ny: pin.ny });
        if (!px) return;
        const d = dist2D(cx, cy, px.x, px.y);
        if (d < HIT_RADIUS && (!closest || d < closest.dist)) closest = { id: pin.id, dist: d };
      });
      if (closest !== null) {
        onPinRemoved?.((closest as { id: string }).id);
        toast.info("Pin removed.");
      }
      return;
    }

    if (m === "measure") {
      // Double-right-click to open "Continue run from here" menu
      const now = Date.now();
      const prev = lastRightClickRef.current;
      const DOUBLE_THRESHOLD = 400; // ms
      const DIST_THRESHOLD = 20; // px
      const dx = prev ? Math.abs(e.clientX - prev.x) : 999;
      const dy = prev ? Math.abs(e.clientY - prev.y) : 999;
      const isDouble = prev && (now - prev.time) < DOUBLE_THRESHOLD && dx < DIST_THRESHOLD && dy < DIST_THRESHOLD;
      lastRightClickRef.current = { time: now, x: e.clientX, y: e.clientY };
      if (!isDouble) return; // single right-click — ignore
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top)  * scaleY;
      const normPt = canvasToNorm(cx, cy);
      if (!normPt) return;
      setCtxMenu({ x: e.clientX, y: e.clientY, normPt });
      return;
    }
  }, [normToCanvas, onPinRemoved, canvasToNorm]);

  // ── Canvas mouse move (drag only) ────────────────────────────────────────
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (modeRef.current === "none") { setCrosshair(null); setMousePos(null); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scaleX = canvas.width  / canvas.offsetWidth;
    const scaleY = canvas.height / canvas.offsetHeight;
    setCrosshair({
      x: e.nativeEvent.offsetX * scaleX,
      y: e.nativeEvent.offsetY * scaleY,
    });
    // Track viewport-relative position for the smooth overlay cursor div
    const viewport = viewportRef.current;
    if (viewport) {
      const rect = viewport.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, []);

  // ── Confirm scale ──────────────────────────────────────────────────────────
  const confirmScale = useCallback(() => {
    if (scalePoints.length < 2) { toast.error("Place both scale points first."); return; }
    const d = parseFloat(knownDistance);
    if (!d || d <= 0) { toast.error("Enter a valid distance in feet."); return; }
    const pxDist = normDist(scalePoints[0], scalePoints[1]);
    if (pxDist < 2) { toast.error("Points too close. Try again."); return; }
    // pxDist is in canvas pixels at RENDER_BASE_ZOOM; divide by RENDER_BASE_ZOOM to get px/ft at zoom=1
    const pxPerFtAtZoom1 = (pxDist / d) / RENDER_BASE_ZOOM;
    setScaleRatio(pxPerFtAtZoom1, d, pxDist);
    setKnownDistance(""); // clear so next reset starts with empty input
    setMode("none");
    modeRef.current = "none";
    setShowScalePrompt(false);
    toast.success(`Scale set ✓  1 ft = ${(pxDist / d).toFixed(2)} px at current zoom.`);
  }, [scalePoints, knownDistance, normDist, setScaleRatio]);

  // ── Undo ───────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    const m = modeRef.current;
    if (m === "set-scale-p2" && scalePoints.length > 0) {
      setScalePoints([]);
      setMode("set-scale-p1");
      modeRef.current = "set-scale-p1";
      toast.info("Scale point removed. Re-click to place.");
    } else if (m === "count") {
      // Undo last dropped pin on this page for the active session
      const pins = currentPinsRef.current;
      if (pins.length > 0) {
        const lastPin = pins[pins.length - 1];
        onPinRemoved?.(lastPin.id);
        toast.info("Last pin removed.");
      } else {
        toast.info("No pins to undo on this page.");
      }
    } else if (activeRun && activeRun.points.length > 0) {
      setCurrentRuns((prev) =>
        prev.map((r) =>
          r.id === currentActiveRunId
            ? { ...r, points: r.points.slice(0, -1) }
            : r
        )
      );
      toast.info(
        activeRun.points.length > 1
          ? `Removed last point (${activeRun.points.length - 1} remaining).`
          : "All points cleared from this run."
      );
    } else {
      toast.info("Nothing to undo.");
    }
  }, [scalePoints, activeRun, currentActiveRunId, setScalePoints, setCurrentRuns, onPinRemoved]);

  const canUndo =
    (mode === "set-scale-p2" && scalePoints.length > 0) ||
    (mode === "count" && currentPins.length > 0) ||
    (activeRun?.points?.length ?? 0) > 0;

  // ── Add new run ────────────────────────────────────────────────────────────
  const addRun = useCallback(() => {
    // Scale is required before measuring
    if (!scaleRatio) {
      toast.error("Set scale first — click \"Set Scale\", mark two points, enter the known distance in feet, then click OK.");
      return;
    }
    const id = nanoid6();
    const name = `Run ${currentRuns.length + 1}`;
    const color = BASE_PALETTE[currentRuns.length % BASE_PALETTE.length];
    const newRun: MeasureRun = { id, name, color, points: [], totalFeet: null, conduitSize: "1/2" };
    setCurrentRuns((prev) => [...prev, newRun]);
    setCurrentActiveRunId(id);
    // Automatically activate measure mode so the user can start clicking immediately
    setMode("measure");
    modeRef.current = "measure";
    toast.info(`"${name}" ready — click points along the path to measure.`);
  }, [currentRuns.length, scaleRatio, setCurrentRuns, setCurrentActiveRunId, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const setRunColor = useCallback((runId: string, color: string) => {
    setCurrentRuns((prev) => prev.map((r) => r.id === runId ? { ...r, color } : r));
  }, [setCurrentRuns]);

  const renameRun = useCallback((runId: string, name: string) => {
    setCurrentRuns((prev) => prev.map((r) => r.id === runId ? { ...r, name } : r));
  }, [setCurrentRuns]);

  const deleteRun = useCallback((runId: string) => {
    setCurrentRuns((prev) => {
      const target = prev.find((r) => r.id === runId);
      if (target) onDeleteRun?.(target.name, currentPage);
      const next = prev.filter((r) => r.id !== runId);
      // Re-number remaining runs sequentially (Run 1, Run 2, ...)
      const renumbered = next.map((r, i) => {
        const expectedName = `Run ${i + 1}`;
        // Only auto-rename if the name matches the default pattern ("Run N")
        const isDefaultName = /^Run \d+$/.test(r.name);
        return isDefaultName ? { ...r, name: expectedName } : r;
      });
      if (currentActiveRunId === runId) setCurrentActiveRunId(renumbered[0]?.id ?? "");
      // Clear paused state if the paused run was deleted
      if (pausedRunId === runId) setPausedRunId(null);
      return renumbered;
    });
  }, [currentActiveRunId, pausedRunId, setCurrentRuns, setCurrentActiveRunId, onDeleteRun]);

  // ── Push to calculator ─────────────────────────────────────────────────────
  const handlePush = () => {
    const ft = activeRun?.totalFeet;
    if (!ft || ft <= 0) { toast.error("No measurement on active run."); return; }
    if (!activeRun) return;
    onPushDistance?.(ft, activeRun.name, activeRun.conduitSize, currentPage);
    toast.success(`${ft} ft pushed from "${activeRun.name}" (page ${currentPage}).`);
  };

  // ── Page navigation ────────────────────────────────────────────────────────
  const goToPage = useCallback((p: number) => {
    const clamped = clamp(p, 1, numPages || 1);
    setCurrentPage(clamped);
    onCurrentPageChange?.(clamped);
    setMode("none");
    modeRef.current = "none";
  }, [numPages, setCurrentPage, onCurrentPageChange]);

  // ── Compute run count per page for page selector badges ───────────────────
  const getPageRunCount = useCallback((pIdx: number) => {
    const runs = pageRunsMap[pIdx];
    if (!runs) return 0;
    return runs.filter(r => (r.totalFeet ?? 0) > 0).length;
  }, [pageRunsMap]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background border-r border-border relative">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      {/* flex-wrap: buttons drop to the next line when the panel is narrow */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-border bg-card shrink-0">
        {/* Load PDF */}
        <label className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium cursor-pointer bg-secondary text-secondary-foreground hover:bg-accent transition-colors shrink-0" title="Load PDF">
          <Upload size={12} />
          <span>PDF</span>
          <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
        </label>

        <div className="w-px h-4 bg-border shrink-0" />

                {/* Scale group — yellow when editing, dark/locked when set */}
        {(() => {
          const isEditingScale = mode === "set-scale-p1" || mode === "set-scale-p2";
          const entry = pageScaleMap[pageIdx];
          const hasScale = scaleRatio !== null && scaleRatio > 0;
          const scaleLabel = (() => {
            if (isEditingScale) return "Setting Scale…";
            if (!hasScale) return "Set Scale";
            if (!entry?.knownFt || !entry?.pxDist) return "Reset Scale";
            const ftPerIn = (162 * entry.knownFt) / entry.pxDist;
            const rounded = ftPerIn >= 10 ? Math.round(ftPerIn) : Math.round(ftPerIn * 2) / 2;
            return `${entry.knownFt} ft  ·  1 in = ${rounded} ft`;
          })();
          return (
            <Button
              size="sm"
              className={cn(
                "h-7 text-xs px-2 shrink-0 transition-all",
                isEditingScale
                  ? "bg-[#F5C518] text-black border-[#F5C518] hover:bg-[#F5C518]/90"
                  : hasScale
                    ? "bg-muted/40 text-muted-foreground border-border hover:bg-destructive/20 hover:text-destructive"
                    : ""
              )}
              variant={isEditingScale ? "default" : "outline"}
              onClick={() => {
                if (isEditingScale) {
                  // Cancel back to locked state (keep previous scale if any)
                  setScalePoints([]);
                  setMode("none");
                  modeRef.current = "none";
                  toast.info("Scale edit cancelled.");
                } else if (hasScale) {
                  // Confirm before resetting — returns to dark inactive state, NOT scale mode
                  setDeleteConfirm({
                    count: 0,
                    name: "scale",
                    onConfirm: () => {
                      setScalePoints([]);
                      setScaleRatio(null, undefined);
                      setMode("none");
                      modeRef.current = "none";
                      toast.info("Scale cleared. Press \"Set Scale\" when ready to re-measure.");
                    },
                  });
                } else {
                  // Enter edit mode for first-time scale setting
                  setScalePoints([]);
                  setMode("set-scale-p1");
                  modeRef.current = "set-scale-p1";
                  toast.info("Click the START of your known-distance reference line.");
                }
              }}
              disabled={!pdfFile}
              title={isEditingScale ? "Cancel scale edit" : hasScale ? "Reset scale for this page" : "Set scale"}
            >
              {isEditingScale ? (
                <><Pencil size={11} className="mr-1" />Setting Scale…</>
              ) : (
                scaleLabel
              )}
            </Button>
          );
        })()}

        {mode === "set-scale-p2" && scalePoints.length >= 2 && (
          <div className="flex items-center gap-1 shrink-0">
            <Input
              type="number"
              placeholder="ft"
              value={knownDistance}
              onChange={(e) => setKnownDistance(e.target.value)}
              className="w-16 h-7 text-xs"
              onKeyDown={(e) => { if (e.key === "Enter") confirmScale(); }}
            />
            <Button size="sm" className="h-7 text-xs px-2" onClick={confirmScale}>OK</Button>
          </div>
        )}

        <div className="w-px h-4 bg-border shrink-0" />

        {/* Measure / Pause / Finish / Resume buttons — context-aware */}
        {mode === "measure" ? (
          // Currently measuring: show Pause and Finish side by side
          <>
            <Button
              size="sm"
              className="h-7 text-xs px-2 shrink-0 bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
              variant="outline"
              onClick={() => {
                // Pause: mark run as paused, exit measure mode
                if (activeRun) {
                  setCurrentRuns((prev) => prev.map((r) => r.id === activeRun.id ? { ...r, status: "paused" } : r));
                  setPausedRunId(activeRun.id);
                }
                setMode("none");
                modeRef.current = "none";
                toast.info(`"${activeRun?.name}" paused — click Resume to continue or start a new run.`);
              }}
              title="Pause this run — you can resume it later"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="mr-1"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              Pause
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs px-2 shrink-0 bg-[#F5C518] text-black border-[#F5C518] hover:bg-[#F5C518]/90"
              variant="default"
              onClick={() => {
                // Finish: mark run as finished, exit measure mode
                if (activeRun) {
                  setCurrentRuns((prev) => prev.map((r) => r.id === activeRun.id ? { ...r, status: "finished" } : r));
                }
                setMode("none");
                modeRef.current = "none";
                toast.success(`"${activeRun?.name}" finished — ${activeRun?.totalFeet ?? 0} ft.`);
              }}
              title="Finish this run"
            >
              <Check size={11} className="mr-1" />
              Finish
            </Button>
          </>
        ) : (
          // Not measuring: show Measure button (or Resume if there's a paused run)
          <Button
            size="sm"
            className={cn(
              "h-7 text-xs px-2 shrink-0",
              pausedRunId && currentRuns.find(r => r.id === pausedRunId)
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                : ""
            )}
            variant="outline"
            onClick={() => {
              // Scale is required before measuring — show the prompt instead of just a toast
              if (!scaleRatio) {
                setShowScalePrompt(true);
                return;
              }
              // Notify parent to switch right panel to Runs tab
              onMeasureStart?.();
              // If there's a paused run, resume it instead of creating a new one
              if (pausedRunId) {
                const pausedRun = currentRuns.find(r => r.id === pausedRunId);
                if (pausedRun) {
                  setCurrentActiveRunId(pausedRunId);
                  setCurrentRuns((prev) => prev.map((r) => r.id === pausedRunId ? { ...r, status: "active" } : r));
                  setPausedRunId(null);
                  setMode("measure");
                  modeRef.current = "measure";
                  toast.success(`Resumed "${pausedRun.name}" — continue clicking to extend.`);
                  return;
                }
                setPausedRunId(null); // stale — fall through to create new run
              }
              // Auto-create a new run and immediately start measuring it
              const id = nanoid6();
              const runNum = currentRuns.length + 1;
              const name = `Run ${runNum}`;
              const color = BASE_PALETTE[(runNum - 1) % BASE_PALETTE.length];
              const newRun: MeasureRun = { id, name, color, points: [], totalFeet: null, conduitSize: "1/2", status: "active" };
              setCurrentRuns((prev) => [...prev, newRun]);
              setCurrentActiveRunId(id);
              setMode("measure");
              modeRef.current = "measure";
              toast.info(`"${name}" started — click points along the path.`);
            }}
            disabled={!pdfFile}
            title={pausedRunId && currentRuns.find(r => r.id === pausedRunId) ? "Resume paused run" : "Measure — starts a new run automatically"}
          >
            {pausedRunId && currentRuns.find(r => r.id === pausedRunId) ? (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="mr-1"><polygon points="5,3 19,12 5,21"/></svg>Resume</>
            ) : (
              <><Ruler size={12} className="mr-1" />Measure</>
            )}
          </Button>
        )}


        {/* Unit Count button — enters count mode immediately */}
        <Button
          size="sm"
          className={cn(
            "h-7 text-xs px-2 shrink-0 transition-all",
            mode === "count"
              ? "bg-[#F5C518] text-black border-[#F5C518] hover:bg-[#F5C518]/90"
              : ""
          )}
          variant={mode === "count" ? "default" : "outline"}
          onClick={() => {
            if (mode === "count") {
              // Toggle off count mode
              setMode("none");
              modeRef.current = "none";
              return;
            }
            // Bootstrap session if needed and enter count mode
            onRequestCountSession?.();
            setMode("count");
            modeRef.current = "count";
            toast.info("Unit Count: click to place a pin · right-click to remove.");
          }}
          disabled={!pdfFile}
          title="Unit Count — click to place pins"
        >
          <Hash size={12} className="mr-1" />
          Unit Count
        </Button>

        <div className="w-px h-4 bg-border shrink-0" />

        {/* Undo — icon only with tooltip */}
        <Button
          size="icon"
          className="h-7 w-7 shrink-0"
          variant="ghost"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (U)"
        >
          <Undo2 size={13} />
        </Button>

        {/* Trash button — scoped to what you’re actively working with:
             - In measure mode: clears only the active run’s points on this page
             - In count mode: clears only the active count session’s pins on this page
             - In other modes: clears the active run’s points */}
        <Button
          size="icon"
          className="h-7 w-7 shrink-0"
          variant="ghost"
          onClick={() => {
            if (mode === "count") {
              // Count mode: only clear the active count session’s pins on this page
              if (!activeCountSession) return;
              const pinsOnPage = currentPins.length;
              if (pinsOnPage === 0) { toast.info("No pins on this page."); return; }
              const doDelete = () => {
                onClearPagePins?.(currentPage);
                toast.info(`Cleared ${pinsOnPage} pin${pinsOnPage !== 1 ? "s" : ""} from “${activeCountSession.name}” on page ${currentPage}.`);
              };
              if (pinsOnPage >= 3) {
                setDeleteConfirm({
                  count: pinsOnPage,
                  name: `“${activeCountSession.name}” pins on page ${currentPage}`,
                  onConfirm: doDelete,
                });
              } else {
                doDelete();
              }
            } else {
              // Measure / other modes: only clear the active run’s points
              const pts = activeRun?.points?.length ?? 0;
              if (pts === 0) { toast.info("No points on active run."); return; }
              const doDelete = () => {
                setCurrentRuns((prev) => prev.map((r) => r.id === currentActiveRunId ? { ...r, points: [], totalFeet: null } : r));
                setMode("none");
                modeRef.current = "none";
                toast.info(`Cleared “${activeRun?.name ?? "run"}”. Scale preserved.`);
              };
              if (pts >= 3) {
                setDeleteConfirm({ count: pts, name: activeRun?.name, onConfirm: doDelete });
              } else {
                doDelete();
              }
            }
          }}
          disabled={!pdfFile}
          title={mode === "count"
            ? `Clear “${activeCountSession?.name ?? "active session"}” pins on page ${currentPage}`
            : `Clear “${activeRun?.name ?? "active run"}” points (scale preserved)`}
        >
          <Trash2 size={13} />
        </Button>

        {/* Clear Page — unified button: clears both runs AND pins on the current page */}
        {(currentRuns.length > 0 || currentPins.length > 0) && (
          <Button
            size="sm"
            className="h-7 text-xs px-2 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            variant="ghost"
            onClick={() => {
              const runsCount = currentRuns.length;
              const pinsCount = currentPins.length;
              const parts: string[] = [];
              if (runsCount > 0) parts.push(`${runsCount} run${runsCount !== 1 ? "s" : ""}`);
              if (pinsCount > 0) parts.push(`${pinsCount} pin${pinsCount !== 1 ? "s" : ""}`);
              setDeleteConfirm({
                count: runsCount + pinsCount,
                name: `all marks on page ${currentPage} (${parts.join(" and ")})`,
                onConfirm: () => {
                  // Clear local canvas runs for this page
                  setCurrentRuns([]);
                  setCurrentActiveRunId("");
                  setMode("none");
                  modeRef.current = "none";
                  // Notify parent to clear its run list + count pins
                  onClearPageAll?.(currentPage);
                  toast.info(`Cleared page ${currentPage}: ${parts.join(" and ")}.`);
                },
              });
            }}
            title={`Clear all runs and pins on page ${currentPage}`}
            disabled={!pdfFile}
          >
            <Trash2 size={11} className="mr-1" />
            Clear page
          </Button>
        )}

        {/* Zoom — right-aligned */}
        <div className="ml-auto flex items-center gap-0 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomOut} title="Zoom out (-)">
            <ZoomOut size={13} />
          </Button>
          <span className="text-[10px] font-mono w-9 text-center tabular-nums">
            {Math.round(displayZoom * 100)}%
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomIn} title="Zoom in (+)">
            <ZoomIn size={13} />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomReset} title="Reset zoom (0)">
            <RotateCcw size={12} />
          </Button>
        </div>
      </div>

            {/* ── Page Selector Bar ─────────────────────────────────────────── */}
      {pdfFile && numPages > 0 && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/20 shrink-0 overflow-x-auto">
          {/* Grid overview button */}
          <button
            onClick={() => setShowPageOverview(true)}
            className="flex items-center justify-center w-7 h-7 rounded border border-border text-muted-foreground hover:text-foreground hover:border-[#F5C518]/50 transition-all shrink-0"
            title="Page overview"
          >
            {/* Three stacked horizontal rectangles icon */}
            <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="0.5" width="12" height="2.5" rx="0.5" fill="currentColor" opacity="0.9"/>
              <rect x="1" y="4.75" width="12" height="2.5" rx="0.5" fill="currentColor" opacity="0.9"/>
              <rect x="1" y="9" width="12" height="2.5" rx="0.5" fill="currentColor" opacity="0.9"/>
            </svg>
          </button>

          <div className="w-px h-4 bg-border shrink-0" />

          {/* Prev page */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors shrink-0"
            title="Previous page (←)"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Page number chips */}
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {Array.from({ length: numPages }, (_, i) => {
              const pNum = i + 1;
              const isActive = pNum === currentPage;
              const runCount = getPageRunCount(i);
              return (
                <button
                  key={i}
                  onClick={() => goToPage(pNum)}
                  className={cn(
                    "relative flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded text-[11px] font-mono font-semibold transition-all shrink-0",
                    isActive
                      ? "bg-[#F5C518] text-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                  title={`Page ${pNum}${runCount > 0 ? ` · ${runCount} run${runCount !== 1 ? "s" : ""}` : ""}`}
                >
                  {pNum}
                  {runCount > 0 && (
                    <span className={cn(
                      "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
                      isActive ? "bg-black" : "bg-[#F5C518]"
                    )} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Next page */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors shrink-0"
            title="Next page (→)"
          >
            <ChevronRight size={14} />
          </button>

          <span className="ml-auto text-[10px] text-muted-foreground font-mono shrink-0 pr-1">
            {currentPage} / {numPages}
          </span>
        </div>
      )}

      {/* ── Named Runs Bar ────────────────────────────────────────────── */}
      {pdfFile && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/30 shrink-0 overflow-x-auto">
          {currentRuns.map((run) => {
            const isActive = run.id === currentActiveRunId;
            const runColor = run.color ?? BASE_PALETTE[0];
            return (
              <RunChip
                key={run.id}
                run={run}
                isActive={isActive}
                runColor={runColor}
                canDelete={true}
                savedColors={savedColors}
                onActivate={() => {
                  setCurrentActiveRunId(run.id);
                  if (run.status === "paused") {
                    // Clicking a paused run chip: mark it as the paused run so Resume button appears
                    setPausedRunId(run.id);
                  } else if (run.status === "finished") {
                    // Clicking a finished run: just select it, don't re-enter measure mode
                    setPausedRunId(null);
                  } else {
                    // Active run: select and enter measure mode if scale is set
                    setPausedRunId(null);
                    if (scaleRatio) {
                      setCurrentRuns((prev) => prev.map((r) => r.id === run.id ? { ...r, status: "active" } : r));
                      setMode("measure");
                      modeRef.current = "measure";
                    }
                  }
                }}
                onRename={(name) => renameRun(run.id, name)}
                onDelete={() => deleteRun(run.id)}
                onColorChange={(c) => setRunColor(run.id, c)}
                onSaveColor={(c) => setSavedColors((prev) => prev.includes(c) ? prev : [...prev.slice(-9), c])}
              />
            );
          })}
          <button
            onClick={addRun}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Add new measurement run"
          >
            <Plus size={12} />
            New Run
          </button>
          {/* Hide unselected runs toggle */}
          <button
            onClick={() => setHideUnselected((v) => !v)}
            className={cn(
              "ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-all",
              hideUnselected
                ? "border-[#F5C518]/50 bg-[#F5C518]/10 text-[#F5C518]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            title={hideUnselected ? "Show all runs" : "Hide other runs"}
          >
            {hideUnselected ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{hideUnselected ? "Solo" : "All"}</span>
          </button>
        </div>
      )}

      {/* ── Hint bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1 bg-muted/20 border-b border-border text-[10px] text-muted-foreground shrink-0">
        <span>
          {mode === "set-scale-p1" && "Click the START of your reference line."}
          {mode === "set-scale-p2" && scalePoints.length < 2 && "Click the END of the reference line."}
          {mode === "set-scale-p2" && scalePoints.length >= 2 && "Enter real-world distance (ft) → Confirm."}
          {mode === "measure" && `Measuring: ${activeRun?.name} · Click to add points · Pause or Finish when done · U=undo`}
          {mode === "count" && `Unit Count · Click=place pin · Right-click=remove · U=undo · ${activeCountSession ? activeCountSession.pins.length + " total" : "No session selected"}`}
          {mode === "none" && `Page ${currentPage}/${numPages || "–"} · Scroll=zoom · ←/→=page · M=measure`}
        </span>
        {activeRun != null && activeRun.totalFeet != null && activeRun.totalFeet > 0 && (
          <Button
            size="sm"
            className="h-6 text-[10px] gap-1 bg-yellow-400 text-black hover:bg-yellow-300 px-2"
            onClick={handlePush}
          >
            <ArrowRight size={10} />
            Push {activeRun.totalFeet} ft
          </Button>
        )}
      </div>

      {/* ── Viewport (overflow:hidden, free-drag pan) ───────────────────── */}
      <div
        ref={viewportRef}
        className="flex-1 relative overflow-hidden"
        style={{
          cursor: isPanning ? "grabbing" : activeCursorColor ? "none" : (mode !== "none" ? "crosshair" : "grab"),
        }}
        onContextMenu={(e) => { if (mode !== "count") e.preventDefault(); }}
        onMouseDown={(e) => {
          // Both left-click (idle mode) and right-click always pan
          if (e.button === 2 || (e.button === 0 && mode === "none")) {
            dragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              ox: panOffsetRef.current.x,
              oy: panOffsetRef.current.y,
            };
            setIsPanning(true);
            e.preventDefault();
          }
        }}
        onMouseMove={(e) => {
          if (!dragRef.current) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          const newOffset = { x: dragRef.current.ox + dx, y: dragRef.current.oy + dy };
          panOffsetRef.current = newOffset;
          setPanOffset(newOffset);
        }}
        onMouseUp={() => { dragRef.current = null; setIsPanning(false); }}
        onMouseLeave={() => { dragRef.current = null; setIsPanning(false); }}
      >
        {pdfLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Loading…
          </div>
        ) : !pdfFile ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
              <Upload size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No Plan Loaded</p>
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 text-black text-xs font-semibold cursor-pointer hover:bg-yellow-300 transition-colors">
              <Upload size={13} />
              Load PDF
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        ) : (
          /* Free-drag page container — positioned via CSS transform */
          <div
            ref={pagesContainerRef}
            style={{
              position: "absolute",
              transformOrigin: "top left",
              // translate(pan) then scale(zoom) — order matters
              // PDF renders at RENDER_BASE_ZOOM; CSS scale adjusts to displayZoom
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${displayZoom / RENDER_BASE_ZOOM})`,
              // will-change: transform tells the browser to promote to its own GPU layer
              willChange: "transform",
            }}
          >
            {/* Inner wrapper rendered at renderZoom — no gutter needed since we can pan freely */}
            <div style={{ position: "relative", display: "inline-block" }}>
              <Document
                file={pdfFile}
                onLoadSuccess={({ numPages: n }) => {
                  setNumPages(n);
                  pageSizeRef.current = null;
                  setPageReady(false);
                }}
                loading={
                  <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
                    Loading PDF…
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={BASE_DPI * RENDER_BASE_ZOOM}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  onRenderSuccess={(page) =>
                    onPageRenderSuccess({ width: page.width, height: page.height })
                  }
                />
              </Document>

              {/* Overlay canvas — sits directly on top of the PDF page */}
              {pageReady && (
                <canvas
                  ref={canvasRef}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "auto",
                    zIndex: 10,
                    cursor: mode === "drag-scale" || mode === "drag-run" ? "grabbing" : mode === "none" ? "inherit" : (activeCursorColor ? "none" : "crosshair"),
                  }}
                  onClick={handleCanvasClick}
                  onContextMenu={handleCanvasContextMenu}
                  onMouseMove={(e) => { handleCanvasMouseMove(e); handleCanvasDragMove(e); }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseUp={handleCanvasDragEnd}
                  onMouseLeave={() => { handleCanvasDragEnd(); setCrosshair(null); setMousePos(null); }}
                />
              )}
            </div>
          </div>
        )}


        {/* ── Page Overview Overlay ─────────────────────────────────────── */}
        {/* ── Scale Prompt Overlay ─────────────────────────────────────────── */}
        {showScalePrompt && (
          <div className="absolute inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Scale Not Set for This Page</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">You must set the scale before measuring or adding runs. Draw a line over a known distance on the plan to calibrate.</p>
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">How to set scale:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Click <strong>Set Scale Now</strong> below</li>
                  <li>Click the start of a known-length line on the plan</li>
                  <li>Click the end of that line</li>
                  <li>Enter the real-world distance in feet and click OK</li>
                </ol>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-yellow-400 text-black hover:bg-yellow-300"
                  onClick={() => {
                    setShowScalePrompt(false);
                    setScalePoints([]);
                    setMode("set-scale-p1");
                    modeRef.current = "set-scale-p1";
                    toast.info("Click the START of your known-distance reference line.");
                  }}
                >
                  Set Scale Now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowScalePrompt(false)}
                  title="Dismiss — you can set scale later from the toolbar"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Confirm Dialog ─────────────────────────────────────────── */}
        {deleteConfirm && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-card border border-border rounded-xl shadow-2xl p-5 max-w-xs w-full mx-4 space-y-4">
              <div className="space-y-1">
                {deleteConfirm.name === "scale" ? (
                  <>
                    <h3 className="text-sm font-bold text-foreground">Reset Scale?</h3>
                    <p className="text-sm text-muted-foreground">
                      This will clear the scale for this page. You’ll need to re-set it before measuring.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-bold text-destructive">Confirm Delete</h3>
                    <p className="text-sm text-muted-foreground">
                      Delete <strong>{deleteConfirm.name ?? "this run"}</strong>? This cannot be undone.
                    </p>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={deleteConfirm.name === "scale" ? "default" : "destructive"}
                  className={cn("flex-1", deleteConfirm.name === "scale" ? "bg-[#F5C518] text-black hover:bg-[#F5C518]/90" : "")}
                  onClick={() => {
                    deleteConfirm.onConfirm();
                    setDeleteConfirm(null);
                  }}
                >
                  {deleteConfirm.name === "scale" ? "Reset Scale" : "Yes, Delete"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── PDF Replace Confirmation Dialog ─────────────────────────────── */}
        {pendingPdfFile && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-card border border-border rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4 space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-destructive">Replace PDF?</h3>
                <p className="text-sm text-muted-foreground">
                  Loading a new PDF will <strong>clear all runs, pins, and scale</strong> on this project.
                  You'll need to set the scale again before measuring.
                </p>
                <p className="text-xs text-muted-foreground/70">This cannot be undone.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    applyPdfLoad(pendingPdfFile.dataUrl, pendingPdfFile.hash);
                    setPendingPdfFile(null);
                  }}
                >
                  Yes, Replace PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPendingPdfFile(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {showPageOverview && pdfFile && numPages > 0 && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                All Pages — {numPages} total
              </span>
              <button
                onClick={() => setShowPageOverview(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
              <div className="flex flex-col gap-2">
                {Array.from({ length: numPages }, (_, i) => {
                  const pNum = i + 1;
                  const isActive = pNum === currentPage;
                  return (
                    <button
                      key={i}
                      onClick={() => { goToPage(pNum); setShowPageOverview(false); }}
                      className={cn(
                        "relative flex flex-col rounded-lg border overflow-hidden transition-all hover:border-[#F5C518]/60",
                        isActive ? "border-[#F5C518] ring-1 ring-[#F5C518]/30" : "border-border bg-card hover:bg-muted/20"
                      )}
                    >
                      {/* PDF thumbnail — full width */}
                      <div className="w-full bg-muted/30 flex items-center justify-center overflow-hidden">
                        <Document file={pdfFile} loading={<div className="h-32 w-full" />}>
                          <Page
                            pageNumber={pNum}
                            width={440}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                          />
                        </Document>
                      </div>
                      {/* Page number only */}
                      <div className={cn(
                        "px-3 py-1.5 text-center",
                        isActive ? "bg-[#F5C518]/10" : "bg-card"
                      )}>
                        <span className={cn(
                          "text-xs font-semibold font-mono",
                          isActive ? "text-[#F5C518]" : "text-muted-foreground"
                        )}>
                          {isActive ? "▶ " : ""}Page {pNum}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Smooth overlay cursor — pointer-events:none div that tracks mouse, GPU-composited, zero lag */}
        {mousePos && activeCursorColor && !isPanning && (
          <div
            className="absolute pointer-events-none z-[50]"
            style={{
              left: mousePos.x,
              top: mousePos.y,
              transform: "translate(-50%, -50%)",
              willChange: "transform",
            }}
          >
            {/* Dot */}
            <div
              className="absolute rounded-full"
              style={{
                width: 10,
                height: 10,
                left: -5,
                top: -5,
                backgroundColor: activeCursorColor,
                boxShadow: "0 0 0 1.5px rgba(0,0,0,0.5)",
              }}
            />
            {/* Horizontal hairline */}
            <div
              className="absolute"
              style={{
                width: 20,
                height: 1,
                left: -10,
                top: -0.5,
                backgroundColor: activeCursorColor,
                opacity: 0.7,
              }}
            />
            {/* Vertical hairline */}
            <div
              className="absolute"
              style={{
                width: 1,
                height: 20,
                left: -0.5,
                top: -10,
                backgroundColor: activeCursorColor,
                opacity: 0.7,
              }}
            />
          </div>
        )}
      </div>

      {/* ── Right-click context menu ─────────────────────────────────────────── */}
      {ctxMenu && (
        <>
          {/* Invisible backdrop — click anywhere to dismiss */}
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setCtxMenu(null)}
          />
          {/* Menu */}
          <div
            className="fixed z-[101] min-w-[180px] rounded-lg border border-border bg-card shadow-xl overflow-hidden"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <div className="px-3 py-2 border-b border-border/50">
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">
                Run: {currentRuns.find(r => r.id === currentActiveRunId)?.name ?? "Active Run"}
              </p>
            </div>
            <button
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-[#F5C518]/10 hover:text-[#F5C518] transition-colors text-left"
              onClick={() => {
                // Append the right-clicked point to the active run and keep measuring
                setCurrentRuns((prev) =>
                  prev.map((r) =>
                    r.id === currentActiveRunId
                      ? { ...r, points: [...r.points, ctxMenu.normPt] }
                      : r
                  )
                );
                setCtxMenu(null);
                toast.success("Continued run from this point — keep clicking to extend.");
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Continue run from here
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/30 transition-colors text-left"
              onClick={() => setCtxMenu(null)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
