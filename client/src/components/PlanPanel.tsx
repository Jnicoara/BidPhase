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
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CONDUIT_SIZES, type ConduitSize } from "@/contexts/AppContext";
import { Eye, EyeOff } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// ── Types ─────────────────────────────────────────────────────────────────────
type Mode = "none" | "set-scale-p1" | "set-scale-p2" | "measure";

interface NormPoint {
  pageIndex: number; // always 0 in single-page mode (relative to current page)
  nx: number;
  ny: number;
}

interface MeasureRun {
  id: string;
  name: string;
  points: NormPoint[];
  totalFeet: number | null;
  conduitSize: ConduitSize;
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

// Run colors — cycles through these for each named run
const RUN_COLORS = [
  "#22C55E", // green
  "#3B82F6", // blue
  "#F97316", // orange
  "#A855F7", // purple
  "#EC4899", // pink
  "#14B8A6", // teal
];

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
function dist2D(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}
function nanoid6() {
  return Math.random().toString(36).slice(2, 8);
}

function defaultRun(idx: number): MeasureRun {
  return { id: nanoid6(), name: `Run ${idx + 1}`, points: [], totalFeet: null, conduitSize: "3/4" };
}

interface PlanPanelProps {
  tabKey: string;
  onPushDistance?: (ft: number, runName: string, conduitSize?: string) => void;
  onDeleteRun?: (runName: string) => void;
}

export default function PlanPanel({ tabKey, onPushDistance, onDeleteRun }: PlanPanelProps) {
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
  type PageScaleEntry = { ratio: number | null; points: NormPoint[] };
  const pageScaleKey = pdfHash ? `bp_pagescale_${tabKey}_${pdfHash}` : `bp_pagescale_${tabKey}_nohash`;
  const [pageScaleMap, setPageScaleMap] = useLocalStorage<Record<number, PageScaleEntry>>(pageScaleKey, {});

  const scaleRatio: number | null = pageScaleMap[pageIdx]?.ratio ?? null;
  const scalePoints: NormPoint[] = pageScaleMap[pageIdx]?.points ?? [];

  const setScaleRatio = useCallback((ratio: number | null) => {
    setPageScaleMap((prev) => ({
      ...prev,
      [pageIdx]: { ratio, points: prev[pageIdx]?.points ?? [] },
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

  // Get runs for current page (lazy-init with one default run)
  const currentRuns: MeasureRun[] = pageRunsMap[pageIdx] ?? [defaultRun(0)];
  const currentActiveRunId: string = pageActiveRunMap[pageIdx] ?? currentRuns[0]?.id ?? "";

  const setCurrentRuns = useCallback((updater: MeasureRun[] | ((prev: MeasureRun[]) => MeasureRun[])) => {
    setPageRunsMap((prev) => {
      const existing = prev[pageIdx] ?? [defaultRun(0)];
      const next = typeof updater === "function" ? updater(existing) : updater;
      return { ...prev, [pageIdx]: next };
    });
  }, [pageIdx, setPageRunsMap]);

  const setCurrentActiveRunId = useCallback((id: string) => {
    setPageActiveRunMap((prev) => ({ ...prev, [pageIdx]: id }));
  }, [pageIdx, setPageActiveRunMap]);

  const activeRun = currentRuns.find((r) => r.id === currentActiveRunId) ?? currentRuns[0];
  const activeRunColor = RUN_COLORS[currentRuns.findIndex((r) => r.id === currentActiveRunId) % RUN_COLORS.length];

  // ── UI state ───────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("none");
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [hideUnselected, setHideUnselected] = useState(false);
  const [showPageOverview, setShowPageOverview] = useState(false);

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
    setCrosshair(null);
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

      // Shadow/outline pass for contrast against light backgrounds
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = (isActive ? 5 : 4) * S;
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.stroke();
      }

      // Polyline (colored)
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = color;
        ctx.lineWidth = (isActive ? 3 : 2) * S;
        ctx.setLineDash([]);
        ctx.globalAlpha = isActive ? 1 : 0.75;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Per-segment labels — scale WITH zoom so they shrink when zoomed out
      if (scaleRatio && pageReady) {
        const pxPerFt = scaleRatio * RENDER_BASE_ZOOM;
        // Font size in canvas pixels — scales with zoom (appears ~13px at 100% zoom)
        const fontSize = Math.max(8, Math.round(13 * RENDER_BASE_ZOOM));
        ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1];
          const b = pts[i];
          const segPx = dist2D(a.x, a.y, b.x, b.y);
          const segFt = segPx / pxPerFt;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          const label = `${segFt.toFixed(1)}'`;

          ctx.save();
          ctx.translate(mx, my);
          const flip = Math.abs(angle) > Math.PI / 2;
          ctx.rotate(flip ? angle + Math.PI : angle);

          // Text shadow for readability without a background box
          ctx.shadowColor = "rgba(0,0,0,0.85)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillStyle = color;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(label, 0, -4);
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.restore();
        }
      }

      // Dots
      const dotR = (isActive ? 5 : 4) * S;
      pts.forEach((p, i) => {
        // Dot shadow
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR + 1.5 * S, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fill();
        // Dot fill
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = isActive ? 1 : 0.75;
        ctx.fill();
        ctx.globalAlpha = 1;
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

    // Draw all inactive runs first, then active on top
    if (!hideUnselected) {
      currentRuns.forEach((run, idx) => {
        if (run.id !== currentActiveRunId) {
          drawRun(run, RUN_COLORS[idx % RUN_COLORS.length], false);
        }
      });
    }
    const activeIdx = currentRuns.findIndex((r) => r.id === currentActiveRunId);
    if (activeIdx >= 0) drawRun(currentRuns[activeIdx], RUN_COLORS[activeIdx % RUN_COLORS.length], true);

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
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 * S, 0, Math.PI * 2);
      ctx.fillStyle = "#F5C518";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1.5 * S;
      ctx.stroke();
      ctx.fillStyle = "#F5C518";
      ctx.font = `bold ${Math.round(11 * S)}px 'JetBrains Mono', monospace`;
      ctx.fillText(`S${i + 1}`, p.x + 8 * S, p.y - 6 * S);
    });

    // ── Vibrant precision crosshair ──────────────────────────────────────────
    if (crosshair && modeRef.current !== "none") {
      const { x, y } = crosshair;
      ctx.save();
      ctx.setLineDash([]);
      // Outer glow (constant screen size)
      ctx.strokeStyle = "rgba(255,220,0,0.20)";
      ctx.lineWidth = 8 * S;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      // Mid glow
      ctx.strokeStyle = "rgba(255,230,0,0.50)";
      ctx.lineWidth = 3 * S;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      // Crisp inner line
      ctx.strokeStyle = "rgba(255,238,0,1)";
      ctx.lineWidth = 1 * S;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      // Center dot
      ctx.beginPath();
      ctx.arc(x, y, 5 * S, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,238,0,1)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 1.5 * S;
      ctx.stroke();
      ctx.restore();
    }
  }, [currentRuns, currentActiveRunId, scalePoints, crosshair, normToCanvas, scaleRatio, pageReady, hideUnselected, displayZoom]);

  useEffect(() => { drawCanvas(); }, [drawCanvas, pageReady]);

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Please upload a PDF file."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const sample = dataUrl.slice(0, 2048);
      let h = 0;
      for (let i = 0; i < sample.length; i++) { h = (Math.imul(31, h) + sample.charCodeAt(i)) | 0; }
      const hash = (h >>> 0).toString(16);
      setPdfHash(hash);
      setPdfFile(dataUrl);
      // Reset per-page runs and go to page 1
      setPageRunsMap({});
      setPageActiveRunMap({});
      setCurrentPage(1);
      setMode("none");
      modeRef.current = "none";
      pageSizeRef.current = null;
      setPageReady(false);
      toast.success("PDF loaded. Scale auto-restored if previously set.");
    };
    reader.readAsDataURL(file);
  };

  // ── Page render callback ───────────────────────────────────────────────────
  const onPageRenderSuccess = useCallback((page: { width: number; height: number }) => {
    pageSizeRef.current = { w: page.width, h: page.height };
    setPageReady(true);
  }, []);

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
        if (scaleRatio) {
          setMode("measure");
          modeRef.current = "measure";
        }
      }
      if (e.key === "Escape") {
        setMode("none");
        modeRef.current = "none";
        setCrosshair(null);
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
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // rect.width = canvas.width * (displayZoom / renderZoom) during transient scale
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top)  * scaleY;
    const pt = canvasToNorm(cx, cy);
    if (!pt) return;

    const m = modeRef.current;
    if (m === "set-scale-p1") {
      setScalePoints([pt]);
      setMode("set-scale-p2");
      modeRef.current = "set-scale-p2";
    } else if (m === "set-scale-p2") {
      setScalePoints((prev) => [...prev.slice(0, 1), pt]);
    } else if (m === "measure") {
      setCurrentRuns((prev) =>
        prev.map((r) =>
          r.id === currentActiveRunId ? { ...r, points: [...r.points, pt] } : r
        )
      );
    }
  }, [canvasToNorm, setScalePoints, setCurrentRuns, currentActiveRunId]);

  // ── Canvas mouse move (thin crosshair) ────────────────────────────────────
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (modeRef.current === "none") { setCrosshair(null); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Use offsetX/Y (pre-transform canvas local coords) — correct even inside CSS-scaled container
    const scaleX = canvas.width  / canvas.offsetWidth;
    const scaleY = canvas.height / canvas.offsetHeight;
    setCrosshair({
      x: e.nativeEvent.offsetX * scaleX,
      y: e.nativeEvent.offsetY * scaleY,
    });
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
    setScaleRatio(pxPerFtAtZoom1);
    setMode("none");
    modeRef.current = "none";
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
  }, [scalePoints, activeRun, currentActiveRunId, setScalePoints, setCurrentRuns]);

  const canUndo =
    (mode === "set-scale-p2" && scalePoints.length > 0) ||
    (activeRun?.points?.length ?? 0) > 0;

  // ── Add new run ────────────────────────────────────────────────────────────
  const addRun = useCallback(() => {
    const id = nanoid6();
    const name = `Run ${currentRuns.length + 1}`;
    const newRun: MeasureRun = { id, name, points: [], totalFeet: null, conduitSize: "3/4" };
    setCurrentRuns((prev) => [...prev, newRun]);
    setCurrentActiveRunId(id);
    toast.info(`New run "${name}" created on page ${currentPage}.`);
  }, [currentRuns.length, setCurrentRuns, setCurrentActiveRunId, currentPage]);

  const renameRun = useCallback((runId: string, name: string) => {
    setCurrentRuns((prev) => prev.map((r) => r.id === runId ? { ...r, name } : r));
  }, [setCurrentRuns]);

  const deleteRun = useCallback((runId: string) => {
    setCurrentRuns((prev) => {
      const target = prev.find((r) => r.id === runId);
      if (target) onDeleteRun?.(target.name);
      const next = prev.filter((r) => r.id !== runId);
      const safe = next.length > 0 ? next : [defaultRun(0)];
      if (currentActiveRunId === runId) setCurrentActiveRunId(safe[0].id);
      return safe;
    });
  }, [currentActiveRunId, setCurrentRuns, setCurrentActiveRunId, onDeleteRun]);

  // ── Push to calculator ─────────────────────────────────────────────────────
  const handlePush = () => {
    const ft = activeRun?.totalFeet;
    if (!ft || ft <= 0) { toast.error("No measurement on active run."); return; }
    onPushDistance?.(ft, activeRun.name, activeRun.conduitSize);
    toast.success(`${ft} ft pushed from "${activeRun.name}" (page ${currentPage}).`);
  };

  // ── Page navigation ────────────────────────────────────────────────────────
  const goToPage = useCallback((p: number) => {
    const clamped = clamp(p, 1, numPages || 1);
    setCurrentPage(clamped);
    setMode("none");
    modeRef.current = "none";
    setCrosshair(null);
  }, [numPages, setCurrentPage]);

  // ── Compute run count per page for page selector badges ───────────────────
  const getPageRunCount = useCallback((pIdx: number) => {
    const runs = pageRunsMap[pIdx];
    if (!runs) return 0;
    return runs.filter(r => (r.totalFeet ?? 0) > 0).length;
  }, [pageRunsMap]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background border-r border-border relative">

      {/* ── Page Overview Overlay ─────────────────────────────────────── */}
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

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-border bg-card shrink-0">
        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium cursor-pointer hover:bg-accent transition-colors">
          <Upload size={13} />
          <span>Load PDF</span>
          <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
        </label>

        <div className="w-px h-5 bg-border" />

        <Button
          size="sm"
          className="h-7 text-xs px-2.5"
          variant={mode === "set-scale-p1" || mode === "set-scale-p2" ? "default" : "outline"}
          onClick={() => {
            setScalePoints([]);
            setMode("set-scale-p1");
            modeRef.current = "set-scale-p1";
            toast.info("Click the START of your known-distance reference line.");
          }}
          disabled={!pdfFile}
        >
          Set Scale
        </Button>

        {scaleRatio && mode === "none" && (
          <span className="text-[10px] font-mono text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/30">
            Scale ✓
          </span>
        )}

        {mode === "set-scale-p2" && scalePoints.length >= 2 && (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              placeholder="ft"
              value={knownDistance}
              onChange={(e) => setKnownDistance(e.target.value)}
              className="w-20 h-7 text-xs"
              onKeyDown={(e) => { if (e.key === "Enter") confirmScale(); }}
            />
            <Button size="sm" className="h-7 text-xs px-2.5" onClick={confirmScale}>Confirm</Button>
          </div>
        )}

        <div className="w-px h-5 bg-border" />

        <Button
          size="sm"
          className="h-7 text-xs px-2.5"
          variant={mode === "measure" ? "default" : "outline"}
          onClick={() => {
            if (!scaleRatio) { toast.error("Set scale first."); return; }
            setMode("measure");
            modeRef.current = "measure";
            toast.info("Click points along the path. M key toggles. Esc to cancel.");
          }}
          disabled={!pdfFile || !scaleRatio}
          title="Measure (M)"
        >
          <Ruler size={12} className="mr-1" />
          Measure
        </Button>

        <Button
          size="sm"
          className="h-7 text-xs px-2.5"
          variant="outline"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo last point (U)"
        >
          <Undo2 size={12} className="mr-1" />
          Undo
        </Button>

        <Button
          size="sm"
          className="h-7 text-xs px-2.5"
          variant="outline"
          onClick={() => {
            // Clear only run points — scale is preserved
            setCurrentRuns((prev) => prev.map((r) => r.id === currentActiveRunId ? { ...r, points: [], totalFeet: null } : r));
            setMode("none");
            modeRef.current = "none";
            toast.info("Run points cleared. Scale preserved.");
          }}
          disabled={!pdfFile}
          title="Clear run points (scale preserved)"
        >
          <Trash2 size={12} className="mr-1" />
          Clear
        </Button>

        {scaleRatio && (
          <Button
            size="sm"
            className="h-7 text-xs px-2.5"
            variant="outline"
            onClick={() => {
              setScalePoints([]);
              setScaleRatio(null);
              setMode("none");
              modeRef.current = "none";
              toast.info("Scale reset for this page.");
            }}
            disabled={!pdfFile}
            title="Reset scale for this page"
          >
            <Lock size={11} className="mr-1" />
            Reset Scale
          </Button>
        )}

        {/* Zoom */}
        <div className="ml-auto flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomOut} title="Zoom out (-)">
            <ZoomOut size={13} />
          </Button>
          <span className="text-[10px] font-mono w-10 text-center tabular-nums">
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
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/30 shrink-0 overflow-x-auto">
          {currentRuns.map((run, idx) => {
            const isActive = run.id === currentActiveRunId;
            return (
              <div
                key={run.id}
                className={cn(
                  "flex items-center gap-1 rounded border transition-all",
                  isActive
                    ? "bg-[#F5C518]/10 border-[#F5C518]/50 shadow-sm"
                    : "border-transparent opacity-60 hover:opacity-90"
                )}
              >
                <button
                  onClick={() => setCurrentActiveRunId(run.id)}
                  className={cn(
                    "flex items-center gap-1.5 pl-2 pr-1.5 py-0.5 text-[10px] whitespace-nowrap transition-all",
                    isActive ? "font-bold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className={cn("w-2 h-2 rounded-full shrink-0", isActive && "ring-2 ring-offset-1 ring-offset-background")}
                    style={{ background: RUN_COLORS[idx % RUN_COLORS.length] }}
                  />
                  <span
                    onDoubleClick={(e) => {
                      const span = e.currentTarget;
                      span.contentEditable = "true";
                      span.focus();
                      const range = document.createRange();
                      range.selectNodeContents(span);
                      window.getSelection()?.removeAllRanges();
                      window.getSelection()?.addRange(range);
                    }}
                    onBlur={(e) => {
                      const val = e.currentTarget.textContent?.trim();
                      e.currentTarget.contentEditable = "false";
                      if (val) renameRun(run.id, val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLElement).blur(); }
                      if (e.key === "Escape") { (e.target as HTMLElement).contentEditable = "false"; }
                    }}
                    suppressContentEditableWarning
                  >
                    {run.name}
                  </span>
                  {run.totalFeet !== null && (
                    <span className="font-mono" style={{ color: RUN_COLORS[idx % RUN_COLORS.length] }}>
                      {run.totalFeet}'
                    </span>
                  )}
                </button>
                {/* Delete run button (only if more than 1 run) */}
                {currentRuns.length > 1 && isActive && (
                  <button
                    onClick={() => deleteRun(run.id)}
                    className="px-1 py-0.5 text-[9px] text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete this run"
                  >✕</button>
                )}
              </div>
            );
          })}
          <button
            onClick={addRun}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            title="Add new measurement run"
          >
            <Plus size={10} />
            New Run
          </button>
          {/* Hide unselected runs toggle */}
          <button
            onClick={() => setHideUnselected((v) => !v)}
            className={cn(
              "ml-auto flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] transition-all",
              hideUnselected
                ? "border-[#F5C518]/50 bg-[#F5C518]/10 text-[#F5C518]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            title={hideUnselected ? "Show all runs" : "Hide other runs"}
          >
            {hideUnselected ? <EyeOff size={11} /> : <Eye size={11} />}
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
          {mode === "measure" && `Measuring: ${activeRun?.name} · Click to add points · U=undo · Esc=done`}
          {mode === "none" && `Page ${currentPage}/${numPages || "–"} · Scroll=zoom · ←/→=page · M=measure`}
        </span>
        {activeRun?.totalFeet !== null && activeRun.totalFeet !== undefined && activeRun.totalFeet > 0 && (
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
          cursor: isPanning ? "grabbing" : mode !== "none" ? "none" : "grab",
        }}
        onContextMenu={(e) => e.preventDefault()}
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
                    pointerEvents: mode !== "none" ? "auto" : "none",
                    zIndex: 10,
                    cursor: "none",
                  }}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={() => setCrosshair(null)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
