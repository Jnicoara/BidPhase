/**
 * BidPhase — PlanPanel (Reusable Embedded Plan Viewer)
 *
 * Embeds inside each calculator tab as a resizable left panel.
 * Features:
 *  - IndexedDB PDF storage (no 5MB limit)
 *  - Named measurement runs (multiple polylines per plan)
 *  - Thin precision crosshair (1px hairlines)
 *  - Per-segment footage labels above each line segment
 *  - Running total footage badge
 *  - Keyboard shortcuts: +/- zoom, U undo, M measure, Escape cancel mode
 *  - Scroll-to-zoom (desktop), pinch-to-zoom (mobile)
 *  - Zoom-to-cursor on scroll wheel
 *
 * Props:
 *  - tabKey: unique string per tab (e.g. "civil") for isolated localStorage keys
 *  - onPushDistance: called when user pushes total footage to the calculator
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
} from "lucide-react";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// ── Types ─────────────────────────────────────────────────────────────────────
type Mode = "none" | "set-scale-p1" | "set-scale-p2" | "measure";

interface NormPoint {
  pageIndex: number;
  nx: number;
  ny: number;
}

interface MeasureRun {
  id: string;
  name: string;
  points: NormPoint[];
  totalFeet: number | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_GAP = 16;
const BASE_DPI = 1.5;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5.0;
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0];
const DEBOUNCE_MS = 300;

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

interface PlanPanelProps {
  tabKey: string;
  onPushDistance?: (ft: number, runName: string) => void;
}

export default function PlanPanel({ tabKey, onPushDistance }: PlanPanelProps) {
  // ── PDF state (IndexedDB for large files) ──────────────────────────────────
  const { value: pdfFile, setValue: setPdfFile, loading: pdfLoading } = useIndexedDB<string | null>(`bp_pdf_${tabKey}`, null);
  const [numPages, setNumPages] = useState<number>(0);

  // ── Zoom state ─────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useLocalStorage<number>(`bp_zoom_${tabKey}`, 1.0);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  // Aliases for backward compat with normDist/drawCanvas which reference renderZoom
  const renderZoom = zoom;
  const renderZoomRef = zoomRef;
  const displayZoom = zoom;
  const displayZoomRef = zoomRef;

  // ── Scale state ────────────────────────────────────────────────────────────
  const [scaleRatio, setScaleRatio] = useLocalStorage<number | null>(`bp_scale_${tabKey}`, null);
  const [scalePoints, setScalePoints] = useLocalStorage<NormPoint[]>(`bp_scalepts_${tabKey}`, []);
  const [knownDistance, setKnownDistance] = useState<string>("");

  // ── Named measurement runs ─────────────────────────────────────────────────
  const [runs, setRuns] = useLocalStorage<MeasureRun[]>(`bp_runs_${tabKey}`, [
    { id: "default", name: "Run 1", points: [], totalFeet: null },
  ]);
  const [activeRunId, setActiveRunId] = useLocalStorage<string>(`bp_activerun_${tabKey}`, "default");

  const activeRun = runs.find((r) => r.id === activeRunId) ?? runs[0];
  const activeRunColor = RUN_COLORS[runs.findIndex((r) => r.id === activeRunId) % RUN_COLORS.length];

  // ── UI state ───────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("none");
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const pageSizesRef = useRef<{ w: number; h: number }[]>([]);
  const [pageSizesReady, setPageSizesReady] = useState(0);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);

  // ── Page top offsets ───────────────────────────────────────────────────────
  const getPageTops = useCallback((): number[] => {
    const sizes = pageSizesRef.current;
    const tops: number[] = [];
    let top = 0;
    for (let i = 0; i < sizes.length; i++) {
      tops.push(top);
      top += (sizes[i]?.h ?? 0) + PAGE_GAP;
    }
    return tops;
  }, []);

  // ── NormPoint → canvas pixel coords ───────────────────────────────────────
  const normToCanvas = useCallback(
    (pt: NormPoint): { x: number; y: number } | null => {
      const s = pageSizesRef.current[pt.pageIndex];
      if (!s || s.w === 0) return null;
      const tops = getPageTops();
      return { x: pt.nx * s.w, y: tops[pt.pageIndex] + pt.ny * s.h };
    },
    [getPageTops]
  );

  // ── Canvas pixel → NormPoint ───────────────────────────────────────────────
  const canvasToNorm = useCallback(
    (cx: number, cy: number): NormPoint | null => {
      const sizes = pageSizesRef.current;
      if (sizes.length === 0) return null;
      const tops = getPageTops();
      for (let i = sizes.length - 1; i >= 0; i--) {
        const s = sizes[i];
        if (!s || s.w === 0) continue;
        if (cy >= tops[i] && cy <= tops[i] + s.h) {
          return { pageIndex: i, nx: cx / s.w, ny: (cy - tops[i]) / s.h };
        }
      }
      return null;
    },
    [getPageTops]
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
    if (!scaleRatio || pageSizesReady === 0) return;
    const pxPerFt = scaleRatio * renderZoom;
    setRuns((prev) =>
      prev.map((run) => {
        if (run.points.length < 2) return { ...run, totalFeet: null };
        let totalPx = 0;
        for (let i = 1; i < run.points.length; i++) {
          totalPx += normDist(run.points[i - 1], run.points[i]);
        }
        return { ...run, totalFeet: parseFloat((totalPx / pxPerFt).toFixed(2)) };
      })
    );
  }, [runs.map(r => r.points.length).join(","), scaleRatio, renderZoom, pageSizesReady]); // eslint-disable-line

  // ── Draw overlay canvas ────────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sizes = pageSizesRef.current;
    if (sizes.length === 0) return;

    const tops = getPageTops();
    const lastIdx = sizes.length - 1;
    const totalH = tops[lastIdx] + (sizes[lastIdx]?.h ?? 0);
    const maxW = Math.max(...sizes.map((s) => s?.w ?? 0), 1);

    canvas.width = maxW;
    canvas.height = totalH;
    canvas.style.width = `${maxW}px`;
    canvas.style.height = `${totalH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Draw a run (polyline + dots + per-segment labels) ──────────────────
    const drawRun = (run: MeasureRun, color: string, isActive: boolean) => {
      const pts = run.points.map(normToCanvas).filter(Boolean) as { x: number; y: number }[];
      if (pts.length === 0) return;

      // Polyline
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = color;
        ctx.lineWidth = isActive ? 2 : 1.5;
        ctx.setLineDash([]);
        ctx.globalAlpha = isActive ? 1 : 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Per-segment labels
      if (scaleRatio && pageSizesReady > 0) {
        const pxPerFt = scaleRatio * renderZoom;
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
          // Keep label readable (flip if line goes right-to-left)
          const flip = Math.abs(angle) > Math.PI / 2;
          ctx.rotate(flip ? angle + Math.PI : angle);

          // Background pill for readability
          const tw = ctx.measureText(label).width + 8;
          const th = 14;
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.beginPath();
          ctx.roundRect(-tw / 2, -th - 4, tw, th, 3);
          ctx.fill();

          ctx.fillStyle = color;
          ctx.font = `bold 10px 'JetBrains Mono', monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(label, 0, -4);
          ctx.restore();
        }
      }

      // Dots
      pts.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, isActive ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = isActive ? 1 : 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
        // Start/end labels for active run
        if (isActive && (i === 0 || i === pts.length - 1)) {
          ctx.fillStyle = color;
          ctx.font = "bold 10px 'JetBrains Mono', monospace";
          ctx.fillText(i === 0 ? "▶" : "■", p.x + 6, p.y - 5);
        }
      });

      // Run name label near first point
      if (pts.length > 0 && runs.length > 1) {
        ctx.fillStyle = color;
        ctx.font = `bold 10px 'Space Grotesk', sans-serif`;
        ctx.globalAlpha = isActive ? 1 : 0.5;
        ctx.fillText(run.name, pts[0].x + 8, pts[0].y + 12);
        ctx.globalAlpha = 1;
      }
    };

    // Draw all inactive runs first, then active on top
    runs.forEach((run, idx) => {
      if (run.id !== activeRunId) {
        drawRun(run, RUN_COLORS[idx % RUN_COLORS.length], false);
      }
    });
    const activeIdx = runs.findIndex((r) => r.id === activeRunId);
    if (activeIdx >= 0) drawRun(runs[activeIdx], RUN_COLORS[activeIdx % RUN_COLORS.length], true);

    // ── Scale reference line ───────────────────────────────────────────────
    const scalePts = scalePoints.map(normToCanvas).filter(Boolean) as { x: number; y: number }[];
    if (scalePts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(scalePts[0].x, scalePts[0].y);
      ctx.lineTo(scalePts[1].x, scalePts[1].y);
      ctx.strokeStyle = "#F5C518";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    scalePts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#F5C518";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#F5C518";
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.fillText(`S${i + 1}`, p.x + 7, p.y - 5);
    });

    // ── Thin precision crosshair ───────────────────────────────────────────
    if (crosshair && modeRef.current !== "none") {
      const { x, y } = crosshair;
      // Full-canvas hairlines — 1px, semi-transparent
      ctx.strokeStyle = "rgba(245,197,24,0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      // Center dot
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#F5C518"; ctx.fill();
    }
  }, [runs, activeRunId, scalePoints, crosshair, normToCanvas, getPageTops, scaleRatio, renderZoom, pageSizesReady]);

  useEffect(() => { drawCanvas(); }, [drawCanvas, pageSizesReady]);

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Please upload a PDF file."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPdfFile(ev.target?.result as string);
      setScaleRatio(null);
      setScalePoints([]);
      setRuns([{ id: "default", name: "Run 1", points: [], totalFeet: null }]);
      setActiveRunId("default");
      setMode("none");
      modeRef.current = "none";
      pageSizesRef.current = [];
      setPageSizesReady(0);
    };
    reader.readAsDataURL(file);
  };

  // ── Page render callback ───────────────────────────────────────────────────
  const onPageRenderSuccess = useCallback((pageIndex: number, page: { width: number; height: number }) => {
    pageSizesRef.current[pageIndex] = { w: page.width, h: page.height };
    setPageSizesReady((n) => n + 1);
  }, []);

  // ── Zoom helpers — native re-render only, no CSS transform ───────────────
  const applyZoom = useCallback((
    newZoomRaw: number,
    focalClientX?: number,
    focalClientY?: number
  ) => {
    const scrollEl = scrollAreaRef.current;
    if (!scrollEl) return;

    const oldZoom = zoomRef.current;
    const newZoom = clamp(parseFloat(newZoomRaw.toFixed(4)), MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(newZoom - oldZoom) < 0.001) return;

    // Preserve focal point in scroll position
    // The PDF renders at BASE_DPI * zoom scale, so scroll coords scale linearly with zoom
    const rect = scrollEl.getBoundingClientRect();
    const vpX = focalClientX !== undefined ? focalClientX - rect.left : rect.width / 2;
    const vpY = focalClientY !== undefined ? focalClientY - rect.top  : rect.height / 2;
    // Content coordinates in "zoom=1" space
    const contentX = (scrollEl.scrollLeft + vpX) / oldZoom;
    const contentY = (scrollEl.scrollTop  + vpY) / oldZoom;

    // Update zoom state — triggers PDF re-render at new scale
    setZoom(newZoom);
    zoomRef.current = newZoom;
    pageSizesRef.current = [];
    setPageSizesReady(0);

    // Restore scroll after React re-renders the PDF at new size
    // Use two rAF frames to ensure layout is complete before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollEl) {
          scrollEl.scrollLeft = contentX * newZoom - vpX;
          scrollEl.scrollTop  = contentY * newZoom - vpY;
        }
      });
    });
  }, [setZoom]);

  const zoomIn = useCallback(() => {
    const cur = zoomRef.current;
    const next = ZOOM_STEPS.find(s => s > cur + 0.01) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
    applyZoom(next);
  }, [applyZoom]);

  const zoomOut = useCallback(() => {
    const cur = zoomRef.current;
    const prev = [...ZOOM_STEPS].reverse().find(s => s < cur - 0.01) ?? ZOOM_STEPS[0];
    applyZoom(prev);
  }, [applyZoom]);

  const zoomReset = useCallback(() => applyZoom(1.0), [applyZoom]);

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      let delta: number;
      if (e.deltaMode === 1) {
        delta = e.deltaY > 0 ? -0.15 : 0.15;
      } else {
        const abs = Math.abs(e.deltaY);
        delta = abs > 50 ? (e.deltaY > 0 ? -0.15 : 0.15) : e.deltaY * -0.004;
      }
      applyZoom(zoomRef.current + clamp(delta, -0.3, 0.3), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  // ── Pinch zoom ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
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
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [applyZoom]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only fire if focus is not in an input/textarea
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, zoomReset, scaleRatio]); // eslint-disable-line

  // ── Canvas click handler ───────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
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
      setRuns((prev) =>
        prev.map((r) =>
          r.id === activeRunId ? { ...r, points: [...r.points, pt] } : r
        )
      );
    }
  }, [canvasToNorm, setScalePoints, setRuns, activeRunId]);

  // ── Canvas mouse move (thin crosshair) ────────────────────────────────────
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (modeRef.current === "none") { setCrosshair(null); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    setCrosshair({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    });
  }, []);

  // ── Confirm scale ──────────────────────────────────────────────────────────
  const confirmScale = useCallback(() => {
    if (scalePoints.length < 2) { toast.error("Place both scale points first."); return; }
    const d = parseFloat(knownDistance);
    if (!d || d <= 0) { toast.error("Enter a valid distance in feet."); return; }
    const pxDist = normDist(scalePoints[0], scalePoints[1]);
    if (pxDist < 2) { toast.error("Points too close. Try again."); return; }
    const pxPerFtAtZoom1 = (pxDist / d) / renderZoom;
    setScaleRatio(pxPerFtAtZoom1);
    setMode("none");
    modeRef.current = "none";
    toast.success(`Scale set ✓  1 ft = ${(pxDist / d).toFixed(2)} px at current zoom.`);
  }, [scalePoints, knownDistance, normDist, renderZoom, setScaleRatio]);

  // ── Undo ───────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    const m = modeRef.current;
    if (m === "set-scale-p2" && scalePoints.length > 0) {
      setScalePoints([]);
      setMode("set-scale-p1");
      modeRef.current = "set-scale-p1";
      toast.info("Scale point removed. Re-click to place.");
    } else if (activeRun && activeRun.points.length > 0) {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === activeRunId
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
  }, [scalePoints, activeRun, activeRunId, setScalePoints, setRuns]);

  const canUndo =
    (mode === "set-scale-p2" && scalePoints.length > 0) ||
    (activeRun?.points?.length ?? 0) > 0;

  // ── Add new run ────────────────────────────────────────────────────────────
  const addRun = useCallback(() => {
    const id = nanoid6();
    const name = `Run ${runs.length + 1}`;
    setRuns((prev) => [...prev, { id, name, points: [], totalFeet: null }]);
    setActiveRunId(id);
    toast.info(`New run "${name}" created.`);
  }, [runs.length, setRuns, setActiveRunId]);

  // ── Push to calculator ─────────────────────────────────────────────────────
  const handlePush = () => {
    const ft = activeRun?.totalFeet;
    if (!ft || ft <= 0) { toast.error("No measurement on active run."); return; }
    onPushDistance?.(ft, activeRun.name);
    toast.success(`${ft} ft pushed from "${activeRun.name}".`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
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
            setRuns((prev) => prev.map((r) => r.id === activeRunId ? { ...r, points: [], totalFeet: null } : r));
            setScalePoints([]);
            setScaleRatio(null);
            setMode("none");
            modeRef.current = "none";
            toast.info("Cleared.");
          }}
          disabled={!pdfFile}
          title="Clear canvas"
        >
          <Trash2 size={12} className="mr-1" />
          Clear
        </Button>

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

      {/* ── Named Runs Bar ────────────────────────────────────────────── */}
      {pdfFile && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/30 shrink-0 overflow-x-auto">
          {runs.map((run, idx) => (
            <button
              key={run.id}
              onClick={() => setActiveRunId(run.id)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-all",
                run.id === activeRunId
                  ? "bg-card border border-border text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: RUN_COLORS[idx % RUN_COLORS.length] }}
              />
              {run.name}
              {run.totalFeet !== null && (
                <span className="font-mono" style={{ color: RUN_COLORS[idx % RUN_COLORS.length] }}>
                  {run.totalFeet}'
                </span>
              )}
            </button>
          ))}
          <button
            onClick={addRun}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            title="Add new measurement run"
          >
            <Plus size={10} />
            New Run
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
          {mode === "none" && `${numPages} page${numPages !== 1 ? "s" : ""} · Scroll=zoom · M=measure · U=undo`}
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

      {/* ── Scroll area ──────────────────────────────────────────────── */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-auto relative"
        style={{ cursor: mode !== "none" ? "none" : "default" }}
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
          <div
            ref={pagesContainerRef}
            style={{
              display: "inline-block",
              position: "relative",
            }}
          >
            <Document
              file={pdfFile}
              onLoadSuccess={({ numPages: n }) => {
                setNumPages(n);
                pageSizesRef.current = [];
                setPageSizesReady(0);
              }}
              loading={
                <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
                  Loading PDF…
                </div>
              }
            >
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={i}
                  style={{ marginBottom: i < numPages - 1 ? PAGE_GAP : 0 }}
                >
                  <Page
                    pageNumber={i + 1}
                    scale={BASE_DPI * renderZoom}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    onRenderSuccess={(page) =>
                      onPageRenderSuccess(i, { width: page.width, height: page.height })
                    }
                  />
                </div>
              ))}
            </Document>

            {/* Overlay canvas */}
            {numPages > 0 && pageSizesReady > 0 && (
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
        )}
      </div>
    </div>
  );
}
