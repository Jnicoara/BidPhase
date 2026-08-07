/**
 * HelixBid — PlanPanel (Reusable Embedded Plan Viewer)
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
  useLayoutEffect,
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
  FileUp,
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
  XCircle,
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

// ── Bitmap cache helpers ──────────────────────────────────────────────────────
// Keyed by `${pdfHash}:${pageNumber}` — survives page navigation within the same PDF
const globalBitmapCache = new Map<string, ImageBitmap>();
let globalPdfDoc: import("pdfjs-dist").PDFDocumentProxy | null = null;
let globalPdfHash: string | null = null;

const globalBitmapInFlight = new Map<string, Promise<ImageBitmap | null>>();

async function renderPageBitmap(
  pageNum: number,
  scale: number,
  pdfHash: string
): Promise<ImageBitmap | null> {
  const cacheKey = `${pdfHash}:${pageNum}`;
  if (globalBitmapCache.has(cacheKey)) return globalBitmapCache.get(cacheKey)!;
  // Dedupe concurrent requests for the same page
  if (globalBitmapInFlight.has(cacheKey)) return globalBitmapInFlight.get(cacheKey)!;
  if (!globalPdfDoc) return null;
  const promise = (async () => {
  try {
    const page = await globalPdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const offscreen = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = offscreen.getContext("2d")!;
    // pdfjs RenderParameters requires `canvas` (the DOM canvas) alongside `canvasContext`.
    // For OffscreenCanvas we pass null for canvas and cast ctx to satisfy the type.
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      canvas: null as unknown as HTMLCanvasElement,
      viewport,
    }).promise;
    const bitmap = await createImageBitmap(offscreen);
    globalBitmapCache.set(cacheKey, bitmap);
    return bitmap;
  } catch {
    return null;
  } finally {
    globalBitmapInFlight.delete(cacheKey);
  }
  })();
  globalBitmapInFlight.set(cacheKey, promise);
  return promise;
}

function clearBitmapCache(pdfHash?: string) {
  if (pdfHash) {
    Array.from(globalBitmapCache.keys()).forEach((key) => {
      if (key.startsWith(`${pdfHash}:`)) globalBitmapCache.delete(key);
    });
  } else {
    globalBitmapCache.clear();
  }
}

function hashPdfDataUrl(dataUrl: string) {
  const sample = dataUrl.slice(0, 2048);
  let h = 0;
  for (let i = 0; i < sample.length; i++) {
    h = (Math.imul(31, h) + sample.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}


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
/** Sentinel NormPoint inserted on double-click to "lift the pen" between segments of the same run */
const PEN_LIFT: NormPoint = { pageIndex: -1, nx: -2, ny: -2 };
const isPenLift = (p: NormPoint) => p.nx === -2 && p.ny === -2;
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
  onPushDistance?: (ft: number, runName: string, conduitSize?: string, pageNumber?: number, segmentFeet?: number[]) => void;
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
  /** Increment this to programmatically activate measure mode from the right panel (Runs tab click) */
  measureModeRequest?: number;
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
  measureModeRequest = 0,
  onRequestCountSession,
  onMeasureStart,
}: PlanPanelProps) {
  // ── PDF state (IndexedDB for large files) ──────────────────────────────────
  const { value: pdfFile, setValue: setPdfFile, loading: pdfLoading } = useIndexedDB<string | null>(`bp_pdf_${tabKey}`, null);
  const [pdfHash, setPdfHash] = useLocalStorage<string | null>(`bp_pdfhash_${tabKey}`, null);
  const [numPages, setNumPages] = useState<number>(0);
  // Counter that increments on every PDF load to force Document remount even if hash is the same
  const [pdfLoadId, setPdfLoadId] = useState(0);

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

  // Activate measure mode when right panel Runs tab is opened
  useEffect(() => {
    if (measureModeRequest > 0 && scaleRatio) {
      setMode("measure");
      modeRef.current = "measure";
      onUnitCountToggle?.(false);
    }
  }, [measureModeRequest]); // eslint-disable-line react-hooks/exhaustive-deps
  const [hideUnselected, setHideUnselected] = useState(false);
  const [showPageOverview, setShowPageOverview] = useState(false);
  // Quick Count state
  const [qcRows, setQcRows] = useState("");
  const [qcPerRow, setQcPerRow] = useState("");
  const [qcAddN, setQcAddN] = useState("");
  // Saved/favorite custom colors (persisted in localStorage)
  const [savedColors, setSavedColors] = useLocalStorage<string[]>("bp_saved_colors", []);

  // ── Refs ───────────────────────────────────────────────────────────────────
  // pdfDocRef: holds the raw pdfjs document for bitmap cache rendering
  const pdfDocRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Dedicated crosshair canvas — sits on top of main canvas, pointer-events:none.
  // Crosshair is drawn here via RAF so the main canvas is never touched on mouse move.
  const crosshairCanvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapCanvasRef = useRef<HTMLCanvasElement>(null);
  // Track whether the current page is already showing from the bitmap cache (for instant nav)
  const bitmapPageRef = useRef<string>(""); // "pdfHash:pageNum" of what's currently drawn
  const crosshairRafRef = useRef<number | null>(null);
  const crosshairPosRef = useRef<{ x: number; y: number } | null>(null);
  // Stable ref so drawCanvas can call drawCrosshair without a forward-reference issue
  const drawCrosshairRef = useRef<() => void>(() => {});
  // Direct DOM ref for the cursor dot overlay — avoids React re-renders on every mousemove
  const cursorDotRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);   // fixed-size overflow:hidden viewport
  const scrollAreaRef = viewportRef;                  // alias kept for legacy code
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const pageSizeRef = useRef<{ w: number; h: number } | null>(null);
  const [pageReady, setPageReady] = useState(false);
  // Incremental pinch state: stores the previous frame's distance and midpoint
  const pinchRef = useRef<{ prevDist: number; prevMid: { x: number; y: number } } | null>(null);
  const isPinchingRef = useRef(false);
  // Flag to prevent mouse pan handler from firing during touch events
  const isTouchingRef = useRef(false);
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

  // Track both-buttons-pressed for pen-lift gesture (left+right click simultaneously)
  const bothButtonsRef = useRef<{ pending: boolean; timer: ReturnType<typeof setTimeout> | null }>({ pending: false, timer: null });

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

  // ── Project (tabKey) change: reset ALL transient state ───────────────────────
  // PlanPanel is reused across projects — only tabKey changes. When it does, plain
  // useState/useRef values (numPages, pdfLoadId, autoFittedRef, etc.) keep the
  // previous project's values. This effect resets everything so the new project
  // starts clean, while persisted state (currentPage, displayZoom, pdfHash) is
  // already handled by the useLocalStorage key-change re-read.
  useEffect(() => {
    setNumPages(0);
    setPdfLoadId((c) => c + 1);      // force Document remount for new project
    autoFittedRef.current = false;
    bitmapPageRef.current = "";
    pageSizeRef.current = null;
    setPageReady(false);
    setMode("none");
    modeRef.current = "none";
    dragRef.current = null;
    dragPointRef.current = null;
    setIsPanning(false);
    setMousePos(null);
    setCrosshair(null);
    setShowPageOverview(false);
    setShowScalePrompt(false);
    setDeleteConfirm(null);
    setPendingPdfFile(null);
    setPausedRunId(null);
    // Reset zoom to 40% so the new project always opens at the right zoom
    const startZoom = 0.40;
    setDisplayZoom(startZoom);
    displayZoomRef.current = startZoom;
    panOffsetRef.current = { x: 0, y: 0 };
    setPanOffset({ x: 0, y: 0 });
  }, [tabKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page render state when page changes (NOT on pdfFile change — that's handled by applyPdfLoad
  // and the Document key={pdfHash} remount. Including pdfFile here would race with onRenderSuccess.)
  useEffect(() => {
    // Only clear pageReady if we don't already have this page in the bitmap cache.
    // If cached, the instant-display effect below will set pageReady=true immediately,
    // so clearing it here just causes an unnecessary flash.
    if (!pdfHash || !globalBitmapCache.has(`${pdfHash}:${currentPage}`)) {
      pageSizeRef.current = null;
      setPageReady(false);
    }
    setMode("none");
    modeRef.current = "none";
  }, [currentPage, pdfHash]);

  // ── Instant page display from bitmap cache ────────────────────────────────
  // When navigating to a page that's already in the bitmap cache, draw it immediately
  // to the bitmapCanvas so the user sees the page without waiting for react-pdf's <Page>
  // to re-render. The <Page> component still renders in the background to populate pageSizeRef
  // (needed for overlay canvas coordinates), but the visual is instant.
  useEffect(() => {
    if (!pdfHash || !currentPage) return;
    const cacheKey = `${pdfHash}:${currentPage}`;
    if (bitmapPageRef.current === cacheKey) return; // already showing this page
    const bitmap = globalBitmapCache.get(cacheKey);
    const bc = bitmapCanvasRef.current;
    if (!bitmap || !bc) return;
    bc.width = bitmap.width;
    bc.height = bitmap.height;
    bc.style.width = `${bitmap.width}px`;
    bc.style.height = `${bitmap.height}px`;
    const ctx = bc.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmap, 0, 0);
    bitmapPageRef.current = cacheKey;
    // Immediately set pageSizeRef so overlay canvas can draw without waiting for react-pdf
    pageSizeRef.current = { w: bitmap.width, h: bitmap.height };
    setPageReady(true);
    centerPage(displayZoomRef.current);
  }, [currentPage, pdfHash, centerPage]);

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
        // Skip pen-lift sentinels when computing total distance.
        // Simply sum distance for every consecutive pair where NEITHER point is a pen-lift.
        // PEN_LIFT acts as a segment break — the pair (realPt → PEN_LIFT) and
        // (PEN_LIFT → realPt) are both skipped, so only real point-to-point
        // distances within each segment are counted.
        const realPts = run.points.filter(p => !isPenLift(p));
        if (realPts.length < 2) return { ...run, totalFeet: null };
        let totalPx = 0;
        for (let i = 1; i < run.points.length; i++) {
          if (isPenLift(run.points[i]) || isPenLift(run.points[i - 1])) continue;
          totalPx += normDist(run.points[i - 1], run.points[i]);
        }
        return { ...run, totalFeet: parseFloat((totalPx / pxPerFt).toFixed(2)) };
      })
    );
  // Trigger on point count changes AND coordinate changes (drag moves a point without changing count)
  }, [currentRuns.map(r => r.points.map(p => `${p.nx?.toFixed(4)},${p.ny?.toFixed(4)}`).join("|")).join(";"), scaleRatio, pageReady]); // eslint-disable-line

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

    // Crosshair canvas is now viewport-sized and positioned as a sibling to the viewport content.
    // It does NOT need to be synced here — drawCrosshair handles its own sizing.

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Scale factor so strokes/fonts appear constant size on screen ────────────
    // Canvas is rendered at RENDER_BASE_ZOOM but displayed at displayZoom via CSS.
    // To make a 2px screen line, we need: canvasPx = 2 * (RENDER_BASE_ZOOM / displayZoom)
    const dz = displayZoomRef.current || 0.40;
    const S = RENDER_BASE_ZOOM / dz;  // canvas px per 1 screen px

    // ── Draw a run (polyline + dots + per-segment labels) ──────────────────
    // ── Helper: build segments + flat pts for a run ──────────────────────────
    const buildRunGeom = (run: MeasureRun) => {
      const segments: { x: number; y: number }[][] = [];
      let seg: { x: number; y: number }[] = [];
      for (const p of run.points) {
        if (isPenLift(p)) {
          if (seg.length > 0) { segments.push(seg); seg = []; }
        } else {
          const canvas = normToCanvas(p);
          if (canvas) seg.push(canvas);
        }
      }
      if (seg.length > 0) segments.push(seg);
      return { segments, pts: segments.flat() };
    };

    // ── Pass 1: draw lines + dots for a run (NO measurement labels) ───────────
    const drawRunGeometry = (run: MeasureRun, color: string, isActive: boolean) => {
      const { segments, pts } = buildRunGeom(run);
      if (pts.length === 0) return;

      const strokeSegments = () => {
        for (const s of segments) {
          if (s.length < 2) continue;
          ctx.beginPath();
          ctx.moveTo(s[0].x, s[0].y);
          for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
          ctx.stroke();
        }
      };

      // Outer glow halo
      if (pts.length >= 2) {
        ctx.strokeStyle = color;
        ctx.lineWidth = (isActive ? 14 : 10) * S;
        ctx.setLineDash([]);
        ctx.globalAlpha = isActive ? 0.22 : 0.14;
        strokeSegments();
        ctx.globalAlpha = 1;
      }
      // Mid glow
      if (pts.length >= 2) {
        ctx.strokeStyle = color;
        ctx.lineWidth = (isActive ? 6 : 4) * S;
        ctx.setLineDash([]);
        ctx.globalAlpha = isActive ? 0.45 : 0.30;
        strokeSegments();
        ctx.globalAlpha = 1;
      }
      // Dark outline
      if (pts.length >= 2) {
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = (isActive ? 4.5 : 3.5) * S;
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        strokeSegments();
      }
      // Crisp core line
      if (pts.length >= 2) {
        ctx.strokeStyle = color;
        ctx.lineWidth = (isActive ? 2.5 : 1.8) * S;
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        strokeSegments();
      }

      // Dots
      const dotR = (isActive ? 5 : 4) * S;
      pts.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR + 2 * S, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
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

    // ── Pass 2: draw measurement labels for a run (always on top of all geometry) ─
    const drawRunLabels = (run: MeasureRun, color: string, isActive: boolean) => {
      if (!scaleRatio || !pageReady) return;
      const { segments, pts } = buildRunGeom(run);
      if (pts.length < 2) return;

      const pxPerFt = scaleRatio * RENDER_BASE_ZOOM;
      const fontSize = Math.max(6, Math.round(9 * RENDER_BASE_ZOOM));
      ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;

      const MIN_SEG_SCREEN_PX = 25;
      const showPerSeg = (() => {
        for (const s of segments) {
          for (let i = 1; i < s.length; i++) {
            const screenLen = dist2D(s[i-1].x, s[i-1].y, s[i].x, s[i].y) * dz / RENDER_BASE_ZOOM;
            if (screenLen < MIN_SEG_SCREEN_PX) return false;
          }
        }
        return true;
      })();

      const drawLabel = (text: string, x: number, y: number, angle: number) => {
        ctx.save();
        ctx.translate(x, y);
        const flip = Math.abs(angle) > Math.PI / 2;
        ctx.rotate(flip ? angle + Math.PI : angle);
        const pad = 5 * S;
        const tw = ctx.measureText(text).width + pad * 2;
        const th = fontSize + pad * 1.2;
        const ry = 3 * S;
        ctx.fillStyle = "rgba(0,0,0,0.82)";
        ctx.beginPath();
        ctx.roundRect(-tw / 2, -(th + 3 * S), tw, th, ry);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(text, 0, -(3 * S));
        ctx.restore();
      };

      const arcMid = (s: { x: number; y: number }[]) => {
        const totalLen = s.reduce((sum, _, i) => i === 0 ? sum : sum + dist2D(s[i-1].x, s[i-1].y, s[i].x, s[i].y), 0);
        const half = totalLen / 2;
        let acc = 0;
        for (let i = 1; i < s.length; i++) {
          const d = dist2D(s[i-1].x, s[i-1].y, s[i].x, s[i].y);
          if (acc + d >= half) {
            const t = (half - acc) / d;
            return { x: s[i-1].x + t * (s[i].x - s[i-1].x), y: s[i-1].y + t * (s[i].y - s[i-1].y) };
          }
          acc += d;
        }
        return s[Math.floor(s.length / 2)];
      };

      if (showPerSeg) {
        for (const s of segments) {
          for (let i = 1; i < s.length; i++) {
            const a = s[i - 1];
            const b = s[i];
            const segFt = dist2D(a.x, a.y, b.x, b.y) / pxPerFt;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            drawLabel(`${segFt.toFixed(1)}'`, mx, my, Math.atan2(b.y - a.y, b.x - a.x));
          }
        }
        if (segments.length > 1) {
          for (const s of segments) {
            const groupFt = s.reduce((sum, _, i) => i === 0 ? sum : sum + dist2D(s[i-1].x, s[i-1].y, s[i].x, s[i].y), 0) / pxPerFt;
            const mid = s[Math.floor(s.length / 2)];
            if (mid) drawLabel(`∑${groupFt.toFixed(1)}'`, mid.x, mid.y - 18 * S, 0);
          }
        }
      } else {
        if (segments.length > 1) {
          for (const s of segments) {
            const groupFt = s.reduce((sum, _, i) => i === 0 ? sum : sum + dist2D(s[i-1].x, s[i-1].y, s[i].x, s[i].y), 0) / pxPerFt;
            const mid = arcMid(s);
            if (mid) drawLabel(`${groupFt.toFixed(1)}'`, mid.x, mid.y, 0);
          }
        } else {
          const totalFt = segments.reduce((runSum, s) =>
            runSum + s.reduce((sum, _, i) => i === 0 ? sum : sum + dist2D(s[i-1].x, s[i-1].y, s[i].x, s[i].y), 0), 0) / pxPerFt;
          const mid = arcMid(segments[0]);
          drawLabel(`${totalFt.toFixed(1)}'`, mid.x, mid.y, 0);
        }
      }
    };

    // Keep drawRun as a compatibility shim (not used in main draw loop below)
    const drawRun = (run: MeasureRun, color: string, isActive: boolean) => {
      drawRunGeometry(run, color, isActive);
      drawRunLabels(run, color, isActive);
    };
    void drawRun; // suppress unused warning — kept for potential future use

    // ── Count pins ──────────────────────────────────────────────────────────
    const pinsToRender = allPagePinsRef.current;
    pinsToRender.forEach((pin, idx) => {
      if (pin.nx < 0) return; // virtual bulk-added pin — no canvas position
      const px = normToCanvas({ pageIndex: 0, nx: pin.nx, ny: pin.ny });
      if (!px) return;

      const shape = (pin.iconId ?? DEFAULT_ICON_ID) as string;
      const color = pin.color;

      // Pin sizes scale WITH zoom (no S compensation) so they shrink as the user zooms out.
      // Fixed canvas pixel values — at RENDER_BASE_ZOOM=1.5 and displayZoom=0.40 these look
      // like ~5-18px on screen, and proportionally smaller/larger as the user zooms.
      // ── Dots (solid filled) — SM / MD / LG / XL
      const DOT_SM = 4;
      const DOT_MD = 7;
      const DOT_LG = 11;
      const DOT_XL = 16;
      // ── Circles (stroke-only rings) — SM / MD / LG / XL
      const CIR_SM = 10;
      const CIR_MD = 15;
      const CIR_LG = 20;
      const CIR_XL = 27;
      // ── Squares (half-side) — SM / MD / LG / XL
      const SQ_SM  = 9;
      const SQ_MD  = 13;
      const SQ_LG  = 18;
      const SQ_XL  = 25;
      // ── Triangles (half-base) — SM / MD / LG / XL
      const TRI_SM = 9;
      const TRI_MD = 13;
      const TRI_LG = 18;
      const TRI_XL = 25;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([]);

      // Drop shadow for visibility against any background
      ctx.shadowColor = "rgba(0,0,0,0.70)";
      ctx.shadowBlur = 4;

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
      // Badge font: fixed canvas px (scales with zoom naturally)
      const badgeSize = shape.endsWith("-sm") ? 8 : shape.endsWith("-md") ? 11 : shape.endsWith("-lg") ? 14 : 17;
      ctx.font = `bold ${badgeSize}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = color;
      ctx.fillText(String(idx + 1), px.x, px.y + shapeRadius + 2);
    });

    // ── Two-pass draw: geometry first, labels last so labels are never occluded ──
    // Pass 1a: inactive run geometry (lines + dots)
    if (!hideUnselected) {
      currentRuns.forEach((run) => {
        if (run.id !== currentActiveRunId) {
          drawRunGeometry(run, run.color ?? BASE_PALETTE[0], false);
        }
      });
    }
    // Pass 1b: active run geometry on top of inactive
    const activeIdx = currentRuns.findIndex((r) => r.id === currentActiveRunId);
    if (activeIdx >= 0) drawRunGeometry(currentRuns[activeIdx], currentRuns[activeIdx].color ?? BASE_PALETTE[0], true);

    // Pass 2a: inactive run labels (on top of all geometry)
    if (!hideUnselected) {
      currentRuns.forEach((run) => {
        if (run.id !== currentActiveRunId) {
          drawRunLabels(run, run.color ?? BASE_PALETTE[0], false);
        }
      });
    }
    // Pass 2b: active run labels (topmost layer)
    if (activeIdx >= 0) drawRunLabels(currentRuns[activeIdx], currentRuns[activeIdx].color ?? BASE_PALETTE[0], true);

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
  }, [currentRuns, currentActiveRunId, scalePoints, normToCanvas, scaleRatio, pageReady, hideUnselected, currentPins, allPagePins, activeRunColor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw canvas whenever runs/pins/page change, then redraw crosshair so it persists
  useEffect(() => { drawCanvas(); drawCrosshairRef.current(); }, [drawCanvas, pageReady]);

  // ── Crosshair canvas: sync size to main canvas and clear when mode is idle ──
  // The crosshair canvas is sized to match the main canvas whenever pageReady changes.
  // On mouse move, drawCrosshair() is called via RAF to draw only the crosshair lines.
  const drawCrosshair = useCallback(() => {
    const cc = crosshairCanvasRef.current;
    const mc = canvasRef.current;
    if (!cc || !mc) return;
    // Crosshair canvas is viewport-sized (not canvas-sized).
    // Sync to viewport dimensions so lines span the full visible area.
    const vp = viewportRef.current;
    if (!vp) return;
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    if (cc.width !== vpW || cc.height !== vpH) {
      cc.width = vpW;
      cc.height = vpH;
      cc.style.width = `${vpW}px`;
      cc.style.height = `${vpH}px`;
    }
    const ctx2 = cc.getContext("2d");
    if (!ctx2) return;
    ctx2.clearRect(0, 0, cc.width, cc.height);
    const pos = crosshairPosRef.current;
    if (!pos) return;
    // pos is in viewport CSS pixels — crosshair canvas matches viewport size exactly
    const x = pos.x;
    const y = pos.y;
    const S = 1;
    const hex = "#F5C518";
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    ctx2.save();
    ctx2.setLineDash([]);
    // Outer soft glow
    ctx2.strokeStyle = `rgba(${r},${g},${b},0.18)`;
    ctx2.lineWidth = 8 * S;
    ctx2.beginPath(); ctx2.moveTo(x, 0); ctx2.lineTo(x, cc.height); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(0, y); ctx2.lineTo(cc.width, y); ctx2.stroke();
    // Mid glow
    ctx2.strokeStyle = `rgba(${r},${g},${b},0.45)`;
    ctx2.lineWidth = 3 * S;
    ctx2.beginPath(); ctx2.moveTo(x, 0); ctx2.lineTo(x, cc.height); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(0, y); ctx2.lineTo(cc.width, y); ctx2.stroke();
    // Crisp inner hairline
    ctx2.strokeStyle = `rgba(${r},${g},${b},1)`;
    ctx2.lineWidth = 1 * S;
    ctx2.beginPath(); ctx2.moveTo(x, 0); ctx2.lineTo(x, cc.height); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(0, y); ctx2.lineTo(cc.width, y); ctx2.stroke();
    ctx2.restore();
  }, []);
  // Keep the stable ref in sync with the latest drawCrosshair callback
  useEffect(() => { drawCrosshairRef.current = drawCrosshair; }, [drawCrosshair]);

  // Clear crosshair canvas whenever mode returns to idle
  useEffect(() => {
    if (mode === "none") {
      crosshairPosRef.current = null;
      setCrosshair(null);
      const cc = crosshairCanvasRef.current;
      if (cc) { const ctx2 = cc.getContext("2d"); ctx2?.clearRect(0, 0, cc.width, cc.height); }
    }
  }, [mode]);

  // ── File upload ────────────────────────────────────────────────────────────
  const applyPdfLoad = useCallback((dataUrl: string, hash: string) => {
    setPdfHash(hash);
    setPdfFile(dataUrl);
    setPdfLoadId((c) => c + 1); // Force Document remount via unique key
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
    // Reset all transient cursor/pan state so cursor and tools work after new PDF loads
    dragRef.current = null;
    dragPointRef.current = null;
    setIsPanning(false);
    setMousePos(null);
    setCrosshair(null);
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
      const hash = hashPdfDataUrl(dataUrl);
      if (pdfFile) {
        // A PDF is already loaded — ask for confirmation before replacing
        setPendingPdfFile({ dataUrl, hash });
      } else {
        applyPdfLoad(dataUrl, hash);
      }
    };
    reader.readAsDataURL(file);
  };

  // Legacy-project migration: older saved projects may have the PDF restored from IndexedDB
  // without a persisted pdfHash. Derive and save the hash once so bitmap caching, prefetch,
  // and page-scale keys work the same on old and new projects.
  useEffect(() => {
    if (pdfLoading || !pdfFile || pdfHash) return;
    const hash = hashPdfDataUrl(pdfFile);
    bitmapPageRef.current = "";
    pageSizeRef.current = null;
    setPageReady(false);
    setPdfHash(hash);
    setPdfLoadId((c) => c + 1);
  }, [pdfLoading, pdfFile, pdfHash, setPdfHash]);

  // ── Page render callback ───────────────────────────────────────────────────
  const onPageRenderSuccess = useCallback((page: { width: number; height: number }) => {
    pageSizeRef.current = { w: page.width, h: page.height };
    setPageReady(true);
    // Re-center using the freshly known page dimensions so page navigation always lands
    // with the full sheet visible, even on older projects restored from persisted state.
    centerPage(displayZoomRef.current);
    // Always reset transient pointer/pan state when a new page renders
    // This is the safety net that ensures cursor and tools work after PDF replacement
    dragRef.current = null;
    dragPointRef.current = null;
    setIsPanning(false);
    setMousePos(null);
    setCrosshair(null);
  }, [centerPage]);

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
    displayZoomRef.current = newZoom;

    // Write CSS transform directly to DOM IMMEDIATELY — before React re-renders.
    // This makes zoom feel instant instead of waiting for the next render cycle.
    const el = pagesContainerRef.current;
    if (el) el.style.transform = `translate(${clampedOx}px, ${clampedOy}px) scale(${newZoom / RENDER_BASE_ZOOM})`;

    // Batch both state updates into a single React render (React 18 auto-batching)
    setPanOffset({ x: clampedOx, y: clampedOy });
    setDisplayZoom(newZoom);
  }, [pageNatSize]);

  // DEFINITIVE TRANSFORM DRIVER:
  // The pagesContainerRef div has NO transform in its JSX style.
  // This useLayoutEffect is the ONLY place that writes the CSS transform.
  // It runs after every render (no deps array), always reading from refs.
  // This means React's reconciler can NEVER overwrite the transform with stale state,
  // because the transform is not in the virtual DOM at all.
  useLayoutEffect(() => {
    const el = pagesContainerRef.current;
    if (el) {
      const z = displayZoomRef.current;
      const { x, y } = panOffsetRef.current;
      el.style.transform = `translate(${x}px, ${y}px) scale(${z / RENDER_BASE_ZOOM})`;
    }
  });

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

  // ── Global mouseup: clean up drag if mouse released outside viewport ──────
  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setIsPanning(false);
        document.body.classList.remove("bp-dragging");
        setPanOffset({ ...panOffsetRef.current });
      }
    };
    window.addEventListener("mouseup", onGlobalMouseUp);
    return () => window.removeEventListener("mouseup", onGlobalMouseUp);
  }, []);

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      // When the page overview is open, allow the browser to scroll that overlay naturally.
      if (showPageOverview) return;
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
  }, [applyZoom, showPageOverview]);

  // ── Pinch zoom + simultaneous pan ────────────────────────────────────────────
  // KEY DESIGN: During the pinch gesture, we apply the CSS transform DIRECTLY to
  // the DOM node (bypassing React state) to avoid render-cycle jitter at 60fps.
  // React state is only synced when the pinch ends.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const getInfo = (e: TouchEvent) => ({
      dist: Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      ),
      mid: {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      },
    });

    // Apply transform directly to DOM — no React re-render
    const applyTransformDirect = (zoom: number, ox: number, oy: number) => {
      const el = pagesContainerRef.current;
      if (el) el.style.transform = `translate(${ox}px, ${oy}px) scale(${zoom / RENDER_BASE_ZOOM})`;
    };

    // Single-finger pan state
    let touchPanStart: { x: number; y: number; ox: number; oy: number } | null = null;

    const onTouchStart = (e: TouchEvent) => {
      isTouchingRef.current = true;
      dragRef.current = null;
      setIsPanning(false);
      if (e.touches.length === 2) {
        // Prevent browser from interpreting 2-finger touch as edge-swipe navigation
        // or pull-to-refresh. touchAction:none on the viewport handles most cases,
        // but explicit preventDefault is belt-and-suspenders for older browsers.
        e.preventDefault();
        touchPanStart = null; // cancel any single-finger pan
        const { dist, mid } = getInfo(e);
        pinchRef.current = { prevDist: dist, prevMid: mid };
        isPinchingRef.current = true;
      } else if (e.touches.length === 1) {
        // Single-finger pan — only in idle mode (not measure/count/scale)
        if (modeRef.current === "none") {
          touchPanStart = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            ox: panOffsetRef.current.x,
            oy: panOffsetRef.current.y,
          };
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      // Handle single-finger pan
      if (e.touches.length === 1 && touchPanStart && !isPinchingRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - touchPanStart.x;
        const dy = e.touches[0].clientY - touchPanStart.y;
        const newOx = touchPanStart.ox + dx;
        const newOy = touchPanStart.oy + dy;
        panOffsetRef.current = { x: newOx, y: newOy };
        applyTransformDirect(displayZoomRef.current, newOx, newOy);
        return;
      }
      if (e.touches.length !== 2 || !pinchRef.current) return;
      e.preventDefault();

      const { dist: curDist, mid: curMid } = getInfo(e);
      const { prevDist, prevMid } = pinchRef.current;

      // ── Zoom: incremental ratio this frame ──
      const effectiveMin = Math.max(fitZoomRef.current * 0.50, MIN_ZOOM);
      const newZoom = clamp(displayZoomRef.current * (curDist / prevDist), effectiveMin, MAX_ZOOM);

      // ── Pan: keep the pinch midpoint fixed in page space ──
      // 1. Where is the midpoint in page-space right now?
      const ox = panOffsetRef.current.x;
      const oy = panOffsetRef.current.y;
      const oldZoom = displayZoomRef.current;
      const pageX = (curMid.x - ox) / oldZoom;
      const pageY = (curMid.y - oy) / oldZoom;
      // 2. New offset so the same page point stays under the NEW midpoint
      //    (This focal-point math also handles panning as the midpoint moves —
      //     no separate delta needed. Adding one causes double-pan jitter.)
      let newOx = curMid.x - pageX * newZoom;
      let newOy = curMid.y - pageY * newZoom;

      // ── Clamp ──
      const nat = pageNatSize();
      const MARGIN = 80;
      if (nat) {
        newOx = clamp(newOx, -(nat.w * newZoom - MARGIN), vp.clientWidth - MARGIN);
        newOy = clamp(newOy, -(nat.h * newZoom - MARGIN), vp.clientHeight - MARGIN);
      }

      // ── Write to refs (no React setState — avoids render jitter) ──
      displayZoomRef.current = newZoom;
      panOffsetRef.current = { x: newOx, y: newOy };
      applyTransformDirect(newZoom, newOx, newOy);

      pinchRef.current = { prevDist: curDist, prevMid: curMid };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchRef.current = null;
        isPinchingRef.current = false;
      }
      if (e.touches.length === 0) {
        isTouchingRef.current = false;
        touchPanStart = null;
        // Sync React state once all touches end so the rest of the app is consistent
        setDisplayZoom(displayZoomRef.current);
        setPanOffset({ ...panOffsetRef.current });
      }
    };

    vp.addEventListener("touchstart", onTouchStart, { passive: false });
    vp.addEventListener("touchmove", onTouchMove, { passive: false });
    vp.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      vp.removeEventListener("touchstart", onTouchStart);
      vp.removeEventListener("touchmove", onTouchMove);
      vp.removeEventListener("touchend", onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNatSize]);

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
    // Both-button pen-lift: if user presses left while right is held (or right while left is held)
    // in measure mode, insert a PEN_LIFT to start a disconnected segment
    if (modeRef.current === "measure" && currentActiveRunId) {
      // e.buttons is a bitmask: 1=left, 2=right. If both are pressed, bitmask includes both.
      const bothHeld = (e.buttons & 1) && (e.buttons & 2);
      if (bothHeld) {
        e.preventDefault();
        e.stopPropagation();
        const coords = getCanvasCoords(e);
        if (coords) {
          const pt = canvasToNorm(coords.cx, coords.cy);
          if (pt) {
            setCurrentRuns((prev) =>
              prev.map((r) =>
                r.id === currentActiveRunId
                  ? { ...r, points: [...r.points, PEN_LIFT, pt] }
                  : r
              )
            );
            toast.info("Pen lifted \u2014 click to start new segment.", { duration: 1200 });
          }
        }
        // Cancel any pending pan that may have started from the right-click
        dragRef.current = null;
        setIsPanning(false);
        return;
      }
    }
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
      // Auto-re-push: after dragging a run point, recalculate totalFeet and push
      // to the right panel so the L&M totals update immediately without needing
      // the user to press Push again.
      if (drag.runId && scaleRatio && onPushDistance) {
        const pxPerFt = scaleRatio * RENDER_BASE_ZOOM;
        // Read the latest runs directly from pageRunsMap ref to avoid stale closure
        const latestRuns = pageRunsMap[pageIdx] ?? [];
        const run = latestRuns.find((r) => r.id === drag.runId);
        if (run && run.points.length >= 2) {
          let totalPx = 0;
          for (let i = 1; i < run.points.length; i++) {
            if (isPenLift(run.points[i]) || isPenLift(run.points[i - 1])) continue;
            const ca = normToCanvas(run.points[i - 1]);
            const cb = normToCanvas(run.points[i]);
            if (ca && cb) totalPx += dist2D(ca.x, ca.y, cb.x, cb.y);
          }
          const ft = parseFloat((totalPx / pxPerFt).toFixed(2));
          if (ft > 0) {
            onPushDistance(ft, run.name, run.conduitSize, currentPage);
          }
        }
      }
    }
  }, [scaleRatio, pageRunsMap, pageIdx, normToCanvas, onPushDistance, currentPage]);

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

  // ── Canvas double-click: lift pen (start disconnected segment on same run) ──────────
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (modeRef.current !== "measure") return;
    if (!currentActiveRunId) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const { cx, cy } = coords;
    const pt = canvasToNorm(cx, cy);
    if (!pt) return;
    // Insert PEN_LIFT then the new start point so the next segment begins here
    setCurrentRuns((prev) =>
      prev.map((r) =>
        r.id === currentActiveRunId
          ? { ...r, points: [...r.points, PEN_LIFT, pt] }
          : r
      )
    );
    toast.info("New segment started — continuing same run.", { duration: 1500 });
  }, [getCanvasCoords, canvasToNorm, setCurrentRuns, currentActiveRunId]);

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

    // Measure mode: pen-lift is now handled by simultaneous left+right click (see handleCanvasMouseDown)
    // Right-click in measure mode is a no-op (panning is handled by viewport)
  }, [normToCanvas, onPinRemoved, canvasToNorm]);

  // ── Canvas mouse move (drag only) ────────────────────────────────────────
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (modeRef.current === "none") {
      crosshairPosRef.current = null;
      setCrosshair(null);
      setMousePos(null);
      const cc = crosshairCanvasRef.current;
      if (cc) { const ctx2 = cc.getContext("2d"); ctx2?.clearRect(0, 0, cc.width, cc.height); }
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Use getBoundingClientRect for pixel-perfect tracking after CSS scale transforms.
    // offsetX/offsetY can drift when the canvas container has a CSS scale() applied.
    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    // Convert CSS position to canvas pixel position
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = cssX * scaleX;
    const canvasY = cssY * scaleY;
    // Store viewport-relative position for crosshair drawing.
    // The crosshair canvas is positioned over the viewport (not inside the scaled container),
    // so we draw in viewport coordinates directly — no coordinate math needed.
    const vpRect2 = viewportRef.current?.getBoundingClientRect();
    if (vpRect2) {
      crosshairPosRef.current = {
        x: e.clientX - vpRect2.left,
        y: e.clientY - vpRect2.top,
      };
    }
    // Schedule RAF to draw crosshair on the dedicated canvas (deduplicated per frame)
    if (crosshairRafRef.current !== null) cancelAnimationFrame(crosshairRafRef.current);
    crosshairRafRef.current = requestAnimationFrame(() => {
      crosshairRafRef.current = null;
      drawCrosshair();
    });
    // Move cursor dot via direct DOM style mutation — zero React re-renders on mousemove
    const dot = cursorDotRef.current;
    if (dot) {
      const viewport = viewportRef.current;
      if (viewport) {
        const vpRect = viewport.getBoundingClientRect();
        const dx = e.clientX - vpRect.left;
        const dy = e.clientY - vpRect.top;
        dot.style.left = `${dx}px`;
        dot.style.top = `${dy}px`;
        dot.style.display = "block";
      }
    }
  }, [drawCrosshair]);

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
      // Undo: if the last point is a PEN_LIFT sentinel, remove both the sentinel AND the point before it
      // (right-click pen-lift inserts [PEN_LIFT, pt] together, so undo must remove both atomically)
      setCurrentRuns((prev) =>
        prev.map((r) => {
          if (r.id !== currentActiveRunId) return r;
          const pts = r.points;
          // If last two points are [PEN_LIFT, pt], remove both
          if (pts.length >= 2 && isPenLift(pts[pts.length - 2])) {
            return { ...r, points: pts.slice(0, -2) };
          }
          // Otherwise remove just the last point
          return { ...r, points: pts.slice(0, -1) };
        })
      );
      const remaining = activeRun.points.length - 1;
      toast.info(
        remaining > 0
          ? `Removed last point (${remaining} remaining).`
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
    // Compute per-segment footage for the breakdown display in the right panel
    const pxPerFt = scaleRatio ? scaleRatio * RENDER_BASE_ZOOM : null;
    let segFeet: number[] | undefined;
    if (pxPerFt && activeRun.points.length >= 2) {
      const segs: number[] = [];
      let segPx = 0;
      let inSeg = false;
      for (let i = 1; i < activeRun.points.length; i++) {
        const prev = activeRun.points[i - 1];
        const curr = activeRun.points[i];
        if (isPenLift(curr) || isPenLift(prev)) {
          if (inSeg && segPx > 0) { segs.push(parseFloat((segPx / pxPerFt).toFixed(2))); segPx = 0; inSeg = false; }
          continue;
        }
        segPx += normDist(prev, curr);
        inSeg = true;
      }
      if (inSeg && segPx > 0) segs.push(parseFloat((segPx / pxPerFt).toFixed(2)));
      if (segs.length > 1) segFeet = segs;
    }
    onPushDistance?.(ft, activeRun.name, activeRun.conduitSize, currentPage, segFeet);
    toast.success(`${ft} ft pushed from "${activeRun.name}" (page ${currentPage}).`);
  };

  // ── Page navigation ────────────────────────────────────────────────────────
  const goToPage = useCallback((p: number) => {
    const clamped = clamp(p, 1, numPages || 1);
    setCurrentPage(clamped);
    onCurrentPageChange?.(clamped);
    setMode("none");
    modeRef.current = "none";
    // Reset zoom and re-center so the user is never lost in the black after navigating
    zoomReset();
  }, [numPages, setCurrentPage, onCurrentPageChange, zoomReset]);

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
      {/* Contextual toolbar: buttons shown depend on the current mode */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-border bg-card shrink-0">

        {/* ── DEFAULT MODE: PDF + Scale + Measure + Count ── */}
        {(mode === "none" || mode === "set-scale-p1" || mode === "set-scale-p2") && (
          <>
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
                      setScalePoints([]);
                      setMode("none");
                      modeRef.current = "none";
                      toast.info("Scale edit cancelled.");
                    } else if (hasScale) {
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

            {/* Measure button */}
            <Button
              size="sm"
              className="h-7 text-xs px-2 shrink-0 transition-all"
              variant="outline"
              onClick={() => {
                if (!scaleRatio) { setShowScalePrompt(true); return; }
                onMeasureStart?.();
                const id = nanoid6();
                const runNum = currentRuns.length + 1;
                const name = `Run ${runNum}`;
                const color = BASE_PALETTE[(runNum - 1) % BASE_PALETTE.length];
                const newRun: MeasureRun = { id, name, color, points: [], totalFeet: null, conduitSize: "1/2", status: "active" };
                setCurrentRuns((prev) => [...prev, newRun]);
                setCurrentActiveRunId(id);
                setMode("measure");
                modeRef.current = "measure";
                toast.info(`"${name}" started — click to measure. Right-click to lift pen & start a new segment.`);
              }}
              disabled={!pdfFile}
              title="Measure [M] — starts a new run automatically"
            >
              <Ruler size={12} className="mr-1" />
              Measure
            </Button>

            {/* Unit Count button */}
            <Button
              size="sm"
              className="h-7 text-xs px-2 shrink-0 transition-all"
              variant="outline"
              onClick={() => {
                onRequestCountSession?.();
                setMode("count");
                modeRef.current = "count";
                toast.info("Unit Count: click to place a pin · right-click to remove.");
              }}
              disabled={!pdfFile}
              title="Unit Count [C] — click to place pins"
            >
              <Hash size={12} className="mr-1" />
              Unit Count
            </Button>

            {/* Undo + Clear Page (idle) — Clear Page sits right after Unit Count */}
            {(currentRuns.length > 0 || currentPins.length > 0) && (
              <>
                <div className="w-px h-4 bg-border shrink-0" />
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
                        setCurrentRuns([]);
                        setCurrentActiveRunId("");
                        setMode("none");
                        modeRef.current = "none";
                        dragRef.current = null;
                        setIsPanning(false);
                        setMousePos(null);
                        setCrosshair(null);
                        onClearPageAll?.(currentPage);
                        toast.info(`Cleared page ${currentPage}: ${parts.join(" and ")}.`);
                      },
                    });
                  }}
                  title={`Clear all runs and pins on page ${currentPage} [Shift+Del]`}
                  disabled={!pdfFile}
                >
                  <Trash2 size={11} className="mr-1" />
                  Clear page
                </Button>
                <Button
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  variant="ghost"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  title="Undo [U]"
                >
                  <Undo2 size={13} />
                </Button>
              </>
            )}
          </>
        )}

        {/* ── MEASURE MODE: PDF + Mode switches + Active run indicator + Undo + Trash run + Clear page ── */}
        {mode === "measure" && (
          <>
            {/* Load PDF — always accessible */}
            <label className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium cursor-pointer bg-secondary text-secondary-foreground hover:bg-accent transition-colors shrink-0" title="Load PDF">
              <Upload size={12} />
              <span>PDF</span>
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            </label>
            <div className="w-px h-4 bg-border shrink-0" />

            {/* Mode switch buttons — always visible */}
            <Button
              size="sm"
              className="h-7 text-xs px-2 shrink-0 bg-[#F5C518]/20 border-[#F5C518]/50 text-[#F5C518]"
              variant="outline"
              disabled
              title="Currently measuring"
            >
              <Ruler size={12} className="mr-1" />
              Measure
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs px-2 shrink-0 transition-all"
              variant="outline"
              onClick={() => {
                onRequestCountSession?.();
                setMode("count");
                modeRef.current = "count";
                toast.info("Unit Count: click to place a pin \u00b7 right-click to remove.");
              }}
              disabled={!pdfFile}
              title="Switch to Unit Count [C]"
            >
              <Hash size={12} className="mr-1" />
              Unit Count
            </Button>
            <div className="w-px h-4 bg-border shrink-0" />

            {/* Active run indicator */}
            <div className="flex items-center gap-1.5 shrink-0 mr-1">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeRun?.color ?? "#F5C518" }}
              />
              <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                {activeRun?.name ?? "Measuring"}
              </span>
            </div>
            <div className="w-px h-4 bg-border shrink-0" />
            {/* Undo */}
            <Button
              size="icon"
              className="h-7 w-7 shrink-0"
              variant="ghost"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo last point [U]"
            >
              <Undo2 size={13} />
            </Button>
            {/* Trash active run */}
            <Button
              size="icon"
              className="h-7 w-7 shrink-0"
              variant="ghost"
              onClick={() => {
                const pts = activeRun?.points?.length ?? 0;
                if (pts === 0) { toast.info("No points on active run."); return; }
                const doDelete = () => {
                  setCurrentRuns((prev) => prev.map((r) => r.id === currentActiveRunId ? { ...r, points: [], totalFeet: null } : r));
                  setMode("none");
                  modeRef.current = "none";
                  toast.info(`Cleared "${activeRun?.name ?? "run"}". Scale preserved.`);
                };
                if (pts >= 3) {
                  setDeleteConfirm({ count: pts, name: activeRun?.name, onConfirm: doDelete });
                } else {
                  doDelete();
                }
              }}
              disabled={!pdfFile}
              title={`Clear "${activeRun?.name ?? "active run"}" points (scale preserved)`}
            >
              <Trash2 size={13} />
            </Button>
            {/* Clear page */}
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
                      setCurrentRuns([]);
                      setCurrentActiveRunId("");
                      setMode("none");
                      modeRef.current = "none";
                      // Reset all transient cursor/pan state so cursor doesn't get stuck
                      dragRef.current = null;
                      setIsPanning(false);
                      setMousePos(null);
                      setCrosshair(null);
                      onClearPageAll?.(currentPage);
                      toast.info(`Cleared page ${currentPage}: ${parts.join(" and ")}.`);
                    },
                  });
                }}
                title={`Clear all runs and pins on page ${currentPage} [Shift+Del]`}
                disabled={!pdfFile}
              >
                <Trash2 size={11} className="mr-1" />
                Clear page
              </Button>
            )}

            {/* Quick Count calculator — visible when a count session is active */}
            {activeCountSession && (
              <>
                <div className="w-px h-4 bg-border shrink-0" />
                {/* Rows × Per Row */}
                <div className="flex items-center gap-1 shrink-0">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Rows"
                    value={qcRows}
                    onChange={(e) => setQcRows(e.target.value)}
                    className="h-7 w-14 text-xs px-1.5 text-center"
                    title="Number of rows"
                  />
                  <span className="text-muted-foreground text-xs shrink-0">×</span>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Each"
                    value={qcPerRow}
                    onChange={(e) => setQcPerRow(e.target.value)}
                    className="h-7 w-14 text-xs px-1.5 text-center"
                    title="Count per row"
                  />
                  {(() => {
                    const r = parseInt(qcRows, 10);
                    const p = parseInt(qcPerRow, 10);
                    const total = (!isNaN(r) && !isNaN(p) && r > 0 && p > 0) ? r * p : null;
                    return total !== null ? (
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2 shrink-0 bg-[#F5C518] text-black hover:bg-[#F5C518]/90"
                        onClick={() => {
                          for (let i = 0; i < total; i++) {
                            onPinAdded?.({
                              id: `bulk-${Date.now()}-${i}`,
                              nx: -1,
                              ny: -1,
                              pageNumber: currentPage,
                            });
                          }
                          toast.success(`Added ${total} to "${activeCountSession.name}"`);
                          setQcRows("");
                          setQcPerRow("");
                        }}
                      >
                        +{total}
                      </Button>
                    ) : null;
                  })()}
                </div>
                {/* Add N directly */}
                <div className="flex items-center gap-1 shrink-0">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Add N"
                    value={qcAddN}
                    onChange={(e) => setQcAddN(e.target.value)}
                    className="h-7 w-16 text-xs px-1.5 text-center"
                    title="Add a specific quantity directly without placing pins"
                  />
                  {(() => {
                    const n = parseInt(qcAddN, 10);
                    return (!isNaN(n) && n > 0) ? (
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2 shrink-0 bg-[#F5C518]/20 border border-[#F5C518]/50 text-[#F5C518] hover:bg-[#F5C518]/30"
                        onClick={() => {
                          for (let i = 0; i < n; i++) {
                            onPinAdded?.({
                              id: `bulk-${Date.now()}-${i}`,
                              nx: -1,
                              ny: -1,
                              pageNumber: currentPage,
                            });
                          }
                          toast.success(`Added ${n} to "${activeCountSession.name}"`);
                          setQcAddN("");
                        }}
                      >
                        <Plus size={11} className="mr-0.5" />
                        Add
                      </Button>
                    ) : null;
                  })()}
                </div>
              </>
            )}
          </>
        )}

        {/* ── COUNT MODE: PDF + Mode switches + Active session indicator + Undo + Trash pins ── */}
        {mode === "count" && (
          <>
            {/* Load PDF — always accessible */}
            <label className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium cursor-pointer bg-secondary text-secondary-foreground hover:bg-accent transition-colors shrink-0" title="Load PDF">
              <Upload size={12} />
              <span>PDF</span>
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            </label>
            <div className="w-px h-4 bg-border shrink-0" />

            {/* Mode switch buttons — always visible */}
            <Button
              size="sm"
              className="h-7 text-xs px-2 shrink-0 transition-all"
              variant="outline"
              onClick={() => {
                if (!scaleRatio) { setShowScalePrompt(true); return; }
                onMeasureStart?.();
                const id = nanoid6();
                const runNum = currentRuns.length + 1;
                const name = `Run ${runNum}`;
                const color = BASE_PALETTE[(runNum - 1) % BASE_PALETTE.length];
                const newRun: MeasureRun = { id, name, color, points: [], totalFeet: null, conduitSize: "1/2", status: "active" };
                setCurrentRuns((prev) => [...prev, newRun]);
                setCurrentActiveRunId(id);
                setMode("measure");
                modeRef.current = "measure";
                toast.info(`"${name}" started \u2014 click to measure.`);
              }}
              disabled={!pdfFile}
              title="Switch to Measure [M]"
            >
              <Ruler size={12} className="mr-1" />
              Measure
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs px-2 shrink-0 bg-[#F5C518]/20 border-[#F5C518]/50 text-[#F5C518]"
              variant="outline"
              disabled
              title="Currently counting"
            >
              <Hash size={12} className="mr-1" />
              Unit Count
            </Button>
            <div className="w-px h-4 bg-border shrink-0" />

            {/* Active session indicator */}
            <div className="flex items-center gap-1.5 shrink-0 mr-1">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeCountSession?.color ?? "#F5C518" }}
              />
              <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                {activeCountSession?.name ?? "Counting"}
              </span>
            </div>
            <div className="w-px h-4 bg-border shrink-0" />
            {/* Undo */}
            <Button
              size="icon"
              className="h-7 w-7 shrink-0"
              variant="ghost"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo last pin [U]"
            >
              <Undo2 size={13} />
            </Button>
            {/* Delete (trash) active session pins on this page — matches Runs toolbar Trash styling */}
            <Button
              size="icon"
              className="h-7 w-7 shrink-0"
              variant="ghost"
              onClick={() => {
                if (!activeCountSession) return;
                const pinsOnPage = currentPins.length;
                if (pinsOnPage === 0) { toast.info("No pins on this page."); return; }
                const doDelete = () => {
                  onClearPagePins?.(currentPage);
                  toast.info(`Cleared ${pinsOnPage} pin${pinsOnPage !== 1 ? "s" : ""} from "${activeCountSession.name}" on page ${currentPage}.`);
                };
                if (pinsOnPage >= 3) {
                  setDeleteConfirm({
                    count: pinsOnPage,
                    name: `"${activeCountSession.name}" pins on page ${currentPage}`,
                    onConfirm: doDelete,
                  });
                } else {
                  doDelete();
                }
              }}
              disabled={!pdfFile}
              title={`Delete "${activeCountSession?.name ?? "active session"}" pins on page ${currentPage}`}
            >
              <Trash2 size={13} />
            </Button>
            {/* Clear page — matches Runs toolbar styling exactly */}
            {(currentRuns.length > 0 || currentPins.length > 0) && (
              <Button
                size="sm"
                className="h-7 text-xs px-2 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                variant="ghost"
                onClick={() => {
                  const runCount = currentRuns.length;
                  const pinCount = currentPins.length;
                  const parts: string[] = [];
                  if (runCount > 0) parts.push(`${runCount} run${runCount !== 1 ? "s" : ""}`);
                  if (pinCount > 0) parts.push(`${pinCount} pin${pinCount !== 1 ? "s" : ""}`);
                  setDeleteConfirm({
                    count: runCount + pinCount,
                    name: `all marks on page ${currentPage}${parts.length ? ` (${parts.join(" and ")})` : ""}`,
                    onConfirm: () => {
                      onClearPageAll?.(currentPage);
                      toast.info(`Cleared page ${currentPage}.`);
                    },
                  });
                }}
                disabled={!pdfFile}
                title={`Clear all runs and pins on page ${currentPage}`}
              >
                <Trash2 size={11} className="mr-1" />
                Clear page
              </Button>
            )}
          </>
        )}

        {/* Zoom — always right-aligned */}
        <div className="ml-auto flex items-center gap-0 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomOut} title="Zoom out [-]">
            <ZoomOut size={13} />
          </Button>
          <span className="text-[10px] font-mono w-9 text-center tabular-nums">
            {Math.round(displayZoom * 100)}%
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomIn} title="Zoom in [+]">
            <ZoomIn size={13} />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomReset} title="Reset zoom [0]">
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
                    "relative flex items-center justify-center h-7 px-2 rounded text-[11px] font-mono font-semibold transition-all shrink-0",
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
          {mode === "measure" && `Measuring: ${activeRun?.name} · Click=add point · Both buttons=pen lift · Dbl-click=new segment · U=undo`}
          {mode === "count" && `Unit Count · Click=place pin · Right-click=remove · U=undo · ${activeCountSession ? activeCountSession.pins.length + " total" : "No session selected"}`}
          {mode === "none" && `Page ${currentPage}/${numPages || "–"} · Scroll=zoom · ←/→=page`}
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

      {/* Thumbnail strip removed — page navigation is in the page selector bar above */}

      {/* ── Viewport (overflow:hidden, free-drag pan) ───────────────────── */}
      <div
        ref={viewportRef}
        className="flex-1 relative overflow-hidden"
        style={{
          cursor: (pendingPdfFile || deleteConfirm || showScalePrompt || !pageReady)
            ? "default"
            : isPanning ? "grabbing" : "grab",
          // Disable ALL browser touch handling (pan, pinch-zoom, pull-to-refresh, edge-swipe).
          // Our own touch handlers in the useEffect below manage everything.
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none" as React.CSSProperties["WebkitUserSelect"],
        }}
        onContextMenu={(e) => {
          // Always suppress context menu during touch (prevents long-press menu on mobile)
          if (isTouchingRef.current) { e.preventDefault(); return; }
          if (mode !== "count") e.preventDefault();
        }}
        onMouseDown={(e) => {
          // Ignore mouse events during touch (prevents mouse/touch conflict)
          if (isTouchingRef.current) return;
          // Both left-click (idle mode) and right-click always pan
          if (e.button === 2 || (e.button === 0 && mode === "none")) {
            dragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              ox: panOffsetRef.current.x,
              oy: panOffsetRef.current.y,
            };
            setIsPanning(true);
            // Mark body as dragging so sidebar hover is suppressed (see index.css)
            document.body.classList.add("bp-dragging");
            e.preventDefault();
          }
        }}
        onMouseMove={(e) => {
          if (!dragRef.current) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          const newOffset = { x: dragRef.current.ox + dx, y: dragRef.current.oy + dy };
          // Write directly to DOM — no React setState during drag to avoid per-frame re-renders
          panOffsetRef.current = newOffset;
          const el = pagesContainerRef.current;
          if (el) {
            const z = displayZoomRef.current;
            el.style.transform = `translate(${newOffset.x}px, ${newOffset.y}px) scale(${z / RENDER_BASE_ZOOM})`;
          }
        }}
        onMouseUp={() => {
          dragRef.current = null;
          setIsPanning(false);
          document.body.classList.remove("bp-dragging");
          // Sync React state once drag ends (triggers re-render + useLayoutEffect re-applies transform)
          setPanOffset({ ...panOffsetRef.current });
        }}
        onMouseLeave={() => {
          if (!dragRef.current) return;
          dragRef.current = null;
          setIsPanning(false);
          document.body.classList.remove("bp-dragging");
          setPanOffset({ ...panOffsetRef.current });
        }}
      >
        {(pdfLoading && !globalBitmapCache.has(`${pdfHash}:${currentPage}`)) ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Loading…
          </div>
        ) : !pdfFile ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 select-none">
            {/* Large icon */}
            <div className="w-24 h-24 rounded-2xl bg-muted/60 border-2 border-dashed border-border flex items-center justify-center">
              <FileUp size={40} className="text-muted-foreground/60" />
            </div>
            {/* Heading + instructions */}
            <div className="text-center space-y-1.5">
              <p className="text-base font-semibold text-foreground">Upload a Construction Plan</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Load a PDF to start measuring conduit runs and placing unit count pins.
              </p>
            </div>
            {/* Steps */}
            <div className="flex flex-col gap-2 text-xs text-muted-foreground max-w-xs w-full px-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold text-[10px]">1</span>
                <span>Click <strong className="text-foreground">Load PDF</strong> below or use the toolbar button to upload your plan.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold text-[10px]">2</span>
                <span>Set the <strong className="text-foreground">Scale</strong> by clicking two points on a known-length reference line.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold text-[10px]">3</span>
                <span>Press <strong className="text-foreground">Measure [M]</strong> and click along conduit runs to record footage.</span>
              </div>
            </div>
            {/* CTA button */}
            <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 text-black text-sm font-semibold cursor-pointer hover:bg-yellow-300 active:scale-95 transition-all shadow-md">
              <FileUp size={15} />
              Load PDF
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        ) : (
          <div
            ref={pagesContainerRef}
            style={{
              position: "absolute",
              transformOrigin: "top left",
              willChange: "transform",
            }}
          >
            {/* Inner wrapper rendered at renderZoom — no gutter needed since we can pan freely */}
            <div style={{ position: "relative", display: "inline-block" }}>
              <Document
                key={`${tabKey}-${pdfHash || "default"}-${pdfLoadId}`}
                file={pdfFile}
                onLoadSuccess={(doc) => {
                  const n = doc.numPages;
                  setNumPages(n);
                  pageSizeRef.current = null;
                  setPageReady(false);
                  // Store raw pdfjs document for bitmap cache
                  pdfDocRef.current = doc as unknown as import("pdfjs-dist").PDFDocumentProxy;
                  globalPdfDoc = pdfDocRef.current;
                  globalPdfHash = pdfHash;
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
                  onRenderSuccess={(page) => {
                    onPageRenderSuccess({ width: page.width, height: page.height });
                    // After react-pdf renders the current page:
                    // 1. Render it to the bitmapCanvas and cache it for instant future navigation
                    // 2. Kick off background prefetch of adjacent pages (±2)
                    if (pdfHash && pdfDocRef.current) {
                      const scale = BASE_DPI * RENDER_BASE_ZOOM;
                      const hash = pdfHash;
                      const total = numPages;
                      const cacheKey = `${hash}:${currentPage}`;
                      // Render current page to bitmap cache + draw to bitmapCanvas
                      renderPageBitmap(currentPage, scale, hash).then((bitmap) => {
                        if (!bitmap) return;
                        const bc = bitmapCanvasRef.current;
                        if (bc && bitmapPageRef.current !== cacheKey) {
                          bc.width = bitmap.width;
                          bc.height = bitmap.height;
                          bc.style.width = `${bitmap.width}px`;
                          bc.style.height = `${bitmap.height}px`;
                          const ctx = bc.getContext("2d");
                          if (ctx) ctx.drawImage(bitmap, 0, 0);
                          bitmapPageRef.current = cacheKey;
                        }
                      });
                      // Prefetch adjacent pages: ±1, ±2
                      const pagesToPrefetch = [
                        currentPage + 1,
                        currentPage - 1,
                        currentPage + 2,
                        currentPage - 2,
                      ].filter((p) => p >= 1 && p <= total);
                      let delay = 50;
                      pagesToPrefetch.forEach((p) => {
                        setTimeout(() => {
                          renderPageBitmap(p, scale, hash);
                        }, delay);
                        delay += 50;
                      });
                    }
                  }}
                />
              </Document>

              {/* Bitmap canvas — displays cached PDF page bitmap for instant navigation */}
              <canvas
                ref={bitmapCanvasRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  pointerEvents: "none",
                  zIndex: 1,
                  display: "block",
                }}
              />
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
                    cursor: mode === "drag-scale" || mode === "drag-run" ? "grabbing" : activeCursorColor ? "none" : "inherit",
                  }}
                  onClick={handleCanvasClick}
                  onDoubleClick={handleCanvasDoubleClick}
                  onContextMenu={handleCanvasContextMenu}
                  onMouseMove={(e) => { handleCanvasMouseMove(e); handleCanvasDragMove(e); }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseUp={handleCanvasDragEnd}
                  onMouseLeave={() => {
                    handleCanvasDragEnd();
                    crosshairPosRef.current = null;
                    setCrosshair(null);
                    setMousePos(null);
                    if (cursorDotRef.current) cursorDotRef.current.style.display = "none";
                    const cc = crosshairCanvasRef.current;
                    if (cc) { const ctx2 = cc.getContext("2d"); ctx2?.clearRect(0, 0, cc.width, cc.height); }
                  }}
                />
              )}
              {/* Crosshair canvas moved to viewport level — see below */}
            </div>
          </div>
        )}


        {/* ── Page Overview Overlay ─────────────────────────────────────── */}
        {/* ── Scale Prompt Overlay ─────────────────────────────────────────── */}
        {showScalePrompt && (
          <div className="absolute inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center"
            style={{ cursor: "default" }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
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
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
            style={{ cursor: "default" }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
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
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
            style={{ cursor: "default" }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
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
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
            style={{ cursor: "default" }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
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
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex flex-col gap-2">
                {Array.from({ length: numPages }, (_, i) => {
                  const pNum = i + 1;
                  const isActive = pNum === currentPage;
                  const cacheKey = `${pdfHash}:${pNum}`;
                  const cachedBitmap = globalBitmapCache.get(cacheKey);
                  return (
                    <button
                      key={i}
                      onClick={() => { goToPage(pNum); setShowPageOverview(false); }}
                      className={cn(
                        "relative flex flex-col rounded-lg border overflow-hidden transition-all hover:border-[#F5C518]/60",
                        isActive ? "border-[#F5C518] ring-1 ring-[#F5C518]/30" : "border-border bg-card hover:bg-muted/20"
                      )}
                    >
                      {/* Thumbnail: use cached bitmap if available, else a placeholder */}
                      <div className="w-full bg-muted/30 flex items-center justify-center overflow-hidden" style={{ minHeight: 80 }}>
                        {cachedBitmap ? (
                          <canvas
                            ref={(el) => {
                              if (!el) return;
                              const aspect = cachedBitmap.height / cachedBitmap.width;
                              const w = el.parentElement?.clientWidth || 220;
                              el.width = cachedBitmap.width;
                              el.height = cachedBitmap.height;
                              el.style.width = `${w}px`;
                              el.style.height = `${w * aspect}px`;
                              const ctx2 = el.getContext("2d");
                              if (ctx2) ctx2.drawImage(cachedBitmap, 0, 0);
                            }}
                            style={{ display: "block" }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-20 w-full text-muted-foreground/40 text-xs font-mono">
                            pg {pNum}
                          </div>
                        )}
                      </div>
                      {/* Page number label */}
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
        {/* Crosshair canvas — viewport-sized, outside the CSS-scaled container.
             Positioned absolutely over the entire viewport. Lines are drawn in viewport
             coordinates so zoom/pan never affects the coordinate math. */}
        <canvas
          ref={crosshairCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
            zIndex: 20,
            display: mode === "none" ? "none" : "block",
          }}
        />

        {/* Cursor dot overlay — always mounted, position updated via ref (no React re-renders) */}
        {activeCursorColor && !isPanning && (
          <div
            ref={cursorDotRef}
            className="absolute pointer-events-none z-[50]"
            style={{
              display: "none",
              transform: "translate(-50%, -50%)",
              willChange: "left, top",
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

    </div>
  );
}
