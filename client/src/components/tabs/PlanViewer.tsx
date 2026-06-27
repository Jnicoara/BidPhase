/**
 * BidPhase — Tab 1: Digital Plan Viewer (Takeoff Tool) — v5
 *
 * Zoom architecture (Google Maps style):
 * ───────────────────────────────────────
 * The PDF is rendered ONCE at BASE_RENDER_SCALE (2×) for crisp quality.
 * Zoom is applied via CSS `transform: scale(zoom)` on the entire container.
 * This means:
 *   - Zoom is instant, GPU-accelerated, no PDF re-render
 *   - Smooth continuous zoom via wheel or pinch
 *   - The canvas overlay scales with the pages automatically
 *
 * Coordinate system:
 * ──────────────────
 * Points stored as { pageIndex, nx, ny } where nx,ny ∈ [0,1] are fractions
 * of the page's BASE rendered size (at BASE_RENDER_SCALE, before CSS zoom).
 *
 * scaleRatio = (base_pixels) / foot — zoom-independent.
 *
 * Undo: always available whenever there are scale or measure points,
 * regardless of current mode.
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
import { useApp } from "@/contexts/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload,
  Ruler,
  Move,
  Trash2,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
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
  nx: number; // fraction of page base width
  ny: number; // fraction of page base height
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_GAP = 16;          // px gap between pages at base scale
const BASE_RENDER_SCALE = 2;  // PDF rendered at 2× for crisp quality
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;

function dist2D(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}

function clampZoom(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

export default function PlanViewer() {
  const { pushDistanceToCivil } = useApp();

  // ── PDF state ──────────────────────────────────────────────────────────────
  const [pdfFile, setPdfFile] = useLocalStorage<string | null>("bp_pdf_file", null);
  const [numPages, setNumPages] = useState<number>(0);

  /**
   * CSS zoom level — applied as transform: scale(zoom) on the pages container.
   * Does NOT trigger PDF re-render.
   */
  const [zoom, setZoom] = useLocalStorage<number>("bp_pdf_zoom_v5", 1.0);
  // Ref for use inside event handlers without stale closure
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  /**
   * pageSizes[i] = { w, h } — rendered size of page i at BASE_RENDER_SCALE.
   * This is the coordinate reference for all point math.
   */
  const pageSizesRef = useRef<{ w: number; h: number }[]>([]);
  const [pageSizesReady, setPageSizesReady] = useState(0);

  // ── Scale state ────────────────────────────────────────────────────────────
  const [scaleRatio, setScaleRatio] = useLocalStorage<number | null>("bp_scale_ratio_v5", null);
  const [scalePoints, setScalePoints] = useLocalStorage<NormPoint[]>("bp_scale_pts_v5", []);
  const [knownDistance, setKnownDistance] = useState<string>("");

  // ── Measure state ──────────────────────────────────────────────────────────
  const [measurePoints, setMeasurePoints] = useLocalStorage<NormPoint[]>("bp_measure_pts_v5", []);
  const [measuredFeet, setMeasuredFeet] = useLocalStorage<number | null>("bp_measured_ft_v5", null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("none");
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  /** The inner container that gets CSS transform: scale(zoom) */
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  /** Pinch zoom state */
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── Cumulative page tops at base scale ────────────────────────────────────
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

  // ── NormPoint → canvas coords (base scale, before CSS zoom) ───────────────
  const normToBase = useCallback(
    (pt: NormPoint): { x: number; y: number } | null => {
      const sizes = pageSizesRef.current;
      const s = sizes[pt.pageIndex];
      if (!s || s.w === 0) return null;
      const tops = getPageTops();
      return {
        x: pt.nx * s.w,
        y: tops[pt.pageIndex] + pt.ny * s.h,
      };
    },
    [getPageTops]
  );

  // ── Canvas click → NormPoint ───────────────────────────────────────────────
  // canvasX/Y are in base-scale canvas pixels (canvas is NOT zoomed — it's
  // drawn at base scale and the CSS zoom scales it visually).
  const canvasToNorm = useCallback(
    (canvasX: number, canvasY: number): NormPoint | null => {
      const sizes = pageSizesRef.current;
      if (sizes.length === 0) return null;
      const tops = getPageTops();
      for (let i = sizes.length - 1; i >= 0; i--) {
        const s = sizes[i];
        if (!s || s.w === 0) continue;
        const top = tops[i];
        if (canvasY >= top && canvasY <= top + s.h) {
          return {
            pageIndex: i,
            nx: canvasX / s.w,
            ny: (canvasY - top) / s.h,
          };
        }
      }
      return null;
    },
    [getPageTops]
  );

  // ── Pixel distance at base scale ───────────────────────────────────────────
  const normDist = useCallback(
    (a: NormPoint, b: NormPoint): number => {
      const ba = normToBase(a);
      const bb = normToBase(b);
      if (!ba || !bb) return 0;
      return dist2D(ba.x, ba.y, bb.x, bb.y);
    },
    [normToBase]
  );

  // ── Draw canvas overlay ────────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sizes = pageSizesRef.current;
    if (sizes.length === 0) return;

    const tops = getPageTops();
    const lastIdx = sizes.length - 1;
    const totalH = tops[lastIdx] + (sizes[lastIdx]?.h ?? 0);
    const maxW = Math.max(...sizes.map((s) => s?.w ?? 0), 1);

    // Canvas is drawn at BASE scale — CSS zoom handles the visual scaling
    canvas.width = maxW;
    canvas.height = totalH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawDot = (x: number, y: number, color: string, r = 5) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    const drawPoly = (pts: { x: number; y: number }[], color: string, dashed = false) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(dashed ? [8, 5] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // Scale reference line
    const scalePts = scalePoints.map(normToBase).filter(Boolean) as { x: number; y: number }[];
    if (scalePts.length >= 2) drawPoly(scalePts, "#F5C518", true);
    scalePts.forEach((p, i) => {
      drawDot(p.x, p.y, "#F5C518", 6);
      ctx.fillStyle = "#F5C518";
      ctx.font = "bold 11px JetBrains Mono, monospace";
      ctx.fillText(`S${i + 1}`, p.x + 8, p.y - 6);
    });

    // Measure polyline
    const measPts = measurePoints.map(normToBase).filter(Boolean) as { x: number; y: number }[];
    if (measPts.length >= 2) drawPoly(measPts, "#22C55E");
    measPts.forEach((p, i) => {
      drawDot(p.x, p.y, i === 0 ? "#22C55E" : "#86efac", 5);
    });

    // Crosshair (drawn at base scale coords)
    if (crosshair) {
      const { x, y } = crosshair;
      ctx.strokeStyle = "rgba(245,197,24,0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#F5C518";
      ctx.fill();
    }
  }, [scalePoints, measurePoints, crosshair, normToBase, getPageTops]);

  useEffect(() => { drawCanvas(); }, [drawCanvas, pageSizesReady]);

  // ── Recompute measurement ──────────────────────────────────────────────────
  useEffect(() => {
    if (measurePoints.length < 2 || !scaleRatio) {
      if (measurePoints.length < 2) setMeasuredFeet(null);
      return;
    }
    let totalPx = 0;
    for (let i = 1; i < measurePoints.length; i++) {
      totalPx += normDist(measurePoints[i - 1], measurePoints[i]);
    }
    setMeasuredFeet(parseFloat((totalPx / scaleRatio).toFixed(2)));
  }, [measurePoints, scaleRatio, normDist, pageSizesReady]); // eslint-disable-line

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
      setMeasurePoints([]);
      setMeasuredFeet(null);
      setMode("none");
      pageSizesRef.current = [];
      setPageSizesReady(0);
    };
    reader.readAsDataURL(file);
  };

  // ── Page render ────────────────────────────────────────────────────────────
  const onPageRender = useCallback((pageIndex: number, wrapper: HTMLDivElement | null) => {
    if (!wrapper) return;
    const pageCanvas = wrapper.querySelector("canvas");
    if (pageCanvas && !pageSizesRef.current[pageIndex]) {
      pageSizesRef.current[pageIndex] = {
        w: pageCanvas.offsetWidth,
        h: pageCanvas.offsetHeight,
      };
    }
    setPageSizesReady((n) => n + 1);
  }, []);

  // ── Smooth zoom engine ─────────────────────────────────────────────────────
  /**
   * Apply a zoom delta. Uses CSS transform — no PDF re-render, instant.
   * focalViewportX/Y: viewport coords of the zoom focal point (cursor/pinch center).
   * When provided, the content under that point stays stationary.
   */
  const applyZoomDelta = useCallback((
    delta: number,
    focalViewportX?: number,
    focalViewportY?: number
  ) => {
    const scrollEl = scrollAreaRef.current;
    const container = pagesContainerRef.current;
    if (!scrollEl || !container) return;

    const oldZoom = zoomRef.current;
    const newZoom = clampZoom(parseFloat((oldZoom + delta).toFixed(3)));
    if (Math.abs(newZoom - oldZoom) < 0.001) return;

    if (focalViewportX !== undefined && focalViewportY !== undefined) {
      const rect = scrollEl.getBoundingClientRect();
      // Content position under cursor (in unscaled content pixels)
      const contentX = (scrollEl.scrollLeft + focalViewportX - rect.left) / oldZoom;
      const contentY = (scrollEl.scrollTop + focalViewportY - rect.top) / oldZoom;
      setZoom(newZoom);
      requestAnimationFrame(() => {
        // Scroll so the same content point stays under cursor
        scrollEl.scrollLeft = contentX * newZoom - (focalViewportX - rect.left);
        scrollEl.scrollTop = contentY * newZoom - (focalViewportY - rect.top);
      });
    } else {
      setZoom(newZoom);
    }
  }, [setZoom]);

  // ── Wheel zoom (desktop) ──────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Normalize delta: trackpad sends small pixel deltas, mouse wheel sends large line deltas
      let delta: number;
      if (e.deltaMode === 1) {
        // Line mode (Firefox mouse wheel) — each notch = 1 line
        delta = e.deltaY > 0 ? -0.15 : 0.15;
      } else {
        // Pixel mode (Chrome/Safari trackpad or mouse)
        // Trackpad: deltaY ~3-10px per frame; mouse wheel: ~100-120px per notch
        const absDelta = Math.abs(e.deltaY);
        if (absDelta > 50) {
          // Mouse wheel — step zoom
          delta = e.deltaY > 0 ? -0.2 : 0.2;
        } else {
          // Trackpad — proportional smooth zoom
          delta = e.deltaY * -0.005;
        }
      }
      // Hard clamp per event so no single event jumps more than 30%
      delta = Math.max(-0.3, Math.min(0.3, delta));
      applyZoomDelta(delta, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoomDelta]);

  // ── Pinch zoom (touch) ────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const getTouchDist = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]];
      return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    };
    const getTouchMid = (e: TouchEvent) => ({
      x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
    });
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = { startDist: getTouchDist(e), startZoom: zoomRef.current };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const ratio = getTouchDist(e) / pinchRef.current.startDist;
        const newZoom = clampZoom(pinchRef.current.startZoom * ratio);
        const mid = getTouchMid(e);
        // Update zoom without focal-point scroll for simplicity on touch
        // (focal-point scroll on touch is complex and often feels wrong)
        setZoom(newZoom);
        void mid; // suppress unused warning
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
  }, [setZoom]);

  // ── Canvas mouse events ────────────────────────────────────────────────────
  /**
   * Convert a mouse event on the canvas to base-scale canvas coordinates.
   * The canvas element is CSS-scaled by `zoom`, so we divide by zoom to get
   * the actual canvas pixel position.
   */
  const getBaseCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    // rect.width = canvas.width * zoom (CSS transform scales the element)
    const scaleX = (canvasRef.current?.width ?? 1) / rect.width;
    const scaleY = (canvasRef.current?.height ?? 1) / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getBaseCanvasCoords(e);
    if (coords) setCrosshair(coords);
  };

  const handleMouseLeave = () => setCrosshair(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === "none") return;
    const coords = getBaseCanvasCoords(e);
    if (!coords) return;
    const pt = canvasToNorm(coords.x, coords.y);
    if (!pt) { toast.error("Click on the plan area."); return; }

    if (mode === "set-scale-p1") {
      setScalePoints([pt]);
      setMode("set-scale-p2");
      toast.info("Point 1 set — click the end of the reference line.");
    } else if (mode === "set-scale-p2") {
      setScalePoints((prev) => [...prev, pt]);
      setMode("none");
      toast.success("Both points set — enter the known distance and click Confirm.");
    } else if (mode === "measure") {
      setMeasurePoints((prev) => [...prev, pt]);
    }
  };

  // ── Undo — always available when there are points ─────────────────────────
  const canUndo = useMemo(() =>
    scalePoints.length > 0 || measurePoints.length > 0,
    [scalePoints, measurePoints]
  );

  const handleUndo = useCallback(() => {
    // Scale points take priority
    if (scalePoints.length > 0) {
      if (mode === "set-scale-p2" || mode === "none") {
        // Remove last scale point and step mode back
        const newPts = scalePoints.slice(0, -1);
        setScalePoints(newPts);
        if (newPts.length === 0) {
          setMode("set-scale-p1");
          toast.info("Scale point cleared — click Point 1 again.");
        } else {
          setMode("set-scale-p2");
          toast.info("Point 2 cleared — click the end of the reference line.");
        }
        return;
      }
    }
    // Otherwise undo last measure point
    if (measurePoints.length > 0) {
      setMeasurePoints((prev) => prev.slice(0, -1));
      toast.info(`Removed last point (${measurePoints.length - 1} remaining).`);
    }
  }, [mode, scalePoints, measurePoints, setScalePoints, setMeasurePoints]);

  // ── Confirm scale ──────────────────────────────────────────────────────────
  const confirmScale = () => {
    if (scalePoints.length < 2) { toast.error("Click two reference points first."); return; }
    const dist = parseFloat(knownDistance);
    if (isNaN(dist) || dist <= 0) { toast.error("Enter a valid distance in feet."); return; }
    const px = normDist(scalePoints[0], scalePoints[1]);
    if (px === 0) { toast.error("The two points are at the same location — try again."); return; }
    const ratio = px / dist;
    setScaleRatio(ratio);
    toast.success(`Scale set: ${dist} ft = ${px.toFixed(1)} px → 1 ft = ${(ratio / BASE_RENDER_SCALE).toFixed(2)} screen-px`);
    setScalePoints([]);
    setKnownDistance("");
    setMode("none");
  };

  // ── Push to Civil ──────────────────────────────────────────────────────────
  const handlePushToCivil = () => {
    if (!measuredFeet || measuredFeet <= 0) { toast.error("No measurement yet."); return; }
    pushDistanceToCivil(measuredFeet);
    toast.success(`${measuredFeet} ft pushed to Civil Calculator.`);
  };

  // ── Toolbar zoom step buttons ──────────────────────────────────────────────
  const zoomIn = () => applyZoomDelta(0.25);
  const zoomOut = () => applyZoomDelta(-0.25);
  const zoomReset = () => setZoom(1);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
        <label className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
          <Upload size={15} />
          <span>Load PDF</span>
          <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
        </label>

        <div className="w-px h-6 bg-border" />

        {/* Set Scale */}
        <Button
          size="sm"
          variant={mode === "set-scale-p1" || mode === "set-scale-p2" ? "default" : "outline"}
          onClick={() => { setScalePoints([]); setMode("set-scale-p1"); toast.info("Click Point 1 on the scale reference line."); }}
          className={cn("gap-1.5", (mode === "set-scale-p1" || mode === "set-scale-p2") && "bg-[#F5C518] text-black hover:bg-[#e0b315]")}
        >
          <Ruler size={14} />
          Set Scale
        </Button>

        {/* Scale confirm row — shown after both points placed */}
        {scalePoints.length === 2 && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Known ft"
              value={knownDistance}
              onChange={(e) => setKnownDistance(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmScale()}
              className="w-24 h-8 text-sm font-mono bg-input border-border"
              autoFocus
            />
            <Button size="sm" onClick={confirmScale} className="bg-[#F5C518] text-black hover:bg-[#e0b315] h-8">
              Confirm
            </Button>
          </div>
        )}

        {scaleRatio && (
          <Badge variant="outline" className="font-mono text-[#F5C518] border-[#F5C518]/40 text-xs">
            Scale set ✓
          </Badge>
        )}

        <div className="w-px h-6 bg-border" />

        {/* Measure */}
        <Button
          size="sm"
          variant={mode === "measure" ? "default" : "outline"}
          onClick={() => setMode(mode === "measure" ? "none" : "measure")}
          disabled={!scaleRatio}
          title={!scaleRatio ? "Set scale first" : undefined}
          className={cn("gap-1.5", mode === "measure" && "bg-[#22C55E] text-black hover:bg-[#16a34a]")}
        >
          <Move size={14} />
          Measure
        </Button>

        {/* Undo — always enabled when there are points */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo last point (works anytime)"
          className="gap-1 h-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <Undo2 size={14} />
          Undo
        </Button>

        {/* Clear measure */}
        {measurePoints.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setMeasurePoints([]); setMeasuredFeet(null); }}
            className="gap-1 text-muted-foreground h-8"
          >
            <Trash2 size={13} />
            Clear
          </Button>
        )}

        {measuredFeet !== null && (
          <Badge className="font-mono bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30 text-xs">
            {measuredFeet} ft
          </Badge>
        )}

        {/* Zoom controls */}
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Zoom in" onClick={zoomIn}>
            <ZoomIn size={14} />
          </Button>
          <span className="text-xs font-mono text-muted-foreground w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Zoom out" onClick={zoomOut}>
            <ZoomOut size={14} />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Reset zoom" onClick={zoomReset}>
            <RotateCcw size={14} />
          </Button>
        </div>
      </div>

      {/* ── Mode hint bar ─────────────────────────────────────────────── */}
      {mode !== "none" && (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-[#F5C518]/10 border-b border-[#F5C518]/20 shrink-0">
          <span className="text-xs text-[#F5C518] font-mono">
            {mode === "set-scale-p1" && "→ Click the START of your known-distance reference line"}
            {mode === "set-scale-p2" && "→ Click the END of your known-distance reference line"}
            {mode === "measure" && "→ Click points along the path · Undo removes last point · Click Measure again to stop"}
          </span>
          {canUndo && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleUndo}
              className="h-6 px-2 text-[#F5C518] hover:text-[#F5C518] hover:bg-[#F5C518]/10 ml-auto text-xs gap-1"
            >
              <Undo2 size={12} /> Undo last point
            </Button>
          )}
        </div>
      )}

      {/* ── Scroll area ───────────────────────────────────────────────── */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-auto"
        style={{ touchAction: "pan-x pan-y" }}
      >
        {!pdfFile ? (
          <div className="flex flex-col items-center justify-center gap-4 mt-20 text-center px-4">
            <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center">
              <Upload size={32} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold">No Plan Loaded</p>
              <p className="text-sm text-muted-foreground mt-1">Upload a PDF to begin your takeoff</p>
            </div>
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#F5C518] text-black font-semibold text-sm cursor-pointer hover:bg-[#e0b315] transition-colors">
              <Upload size={16} />
              Load PDF Plan
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        ) : (
          /* Outer centering wrapper */
          <div className="flex justify-center py-4">
            {/*
              pagesContainerRef: this div gets CSS transform: scale(zoom).
              transform-origin: top left so scroll position math is predictable.
              The div's natural (unscaled) size determines scroll area.
              We set explicit width/height via inline style after pages load.
            */}
            <div
              ref={pagesContainerRef}
              style={{
                transformOrigin: "top left",
                transform: `scale(${zoom})`,
                // CSS transform doesn't affect layout — we must manually push the
                // scroll container's content size to match the scaled visual size.
                // marginBottom/Right = naturalSize * (zoom - 1)
                marginBottom: `${Math.max(0, pageSizesRef.current.reduce((acc, s) => acc + (s?.h ?? 0) + PAGE_GAP, 0) * (zoom - 1))}px`,
                marginRight: `${Math.max(0, Math.max(...pageSizesRef.current.map(s => s?.w ?? 0), 0) * (zoom - 1))}px`,
                position: "relative",
                display: "inline-block",
                // Smooth zoom transition — GPU composited, no layout
                transition: "transform 0.08s ease-out",
              }}
            >
              {/* PDF Pages */}
              <div className="flex flex-col" style={{ gap: PAGE_GAP }}>
                <Document
                  file={pdfFile}
                  onLoadSuccess={({ numPages: n }) => {
                    setNumPages(n);
                    pageSizesRef.current = [];
                    setPageSizesReady(0);
                  }}
                  loading={
                    <div className="flex items-center justify-center w-[595px] h-[841px] text-muted-foreground text-sm bg-card rounded border border-border">
                      Loading PDF…
                    </div>
                  }
                >
                  {Array.from({ length: numPages }, (_, i) => {
                    let wrapperEl: HTMLDivElement | null = null;
                    return (
                      <div
                        key={i}
                        ref={(el) => { wrapperEl = el; }}
                        style={{ display: "block", lineHeight: 0 }}
                      >
                        <Page
                          pageNumber={i + 1}
                          scale={BASE_RENDER_SCALE}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onRenderSuccess={() => onPageRender(i, wrapperEl)}
                        />
                      </div>
                    );
                  })}
                </Document>
              </div>

              {/* Canvas overlay — same size as pages at base scale, CSS-scaled with them */}
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className={cn(
                  "absolute inset-0",
                  mode !== "none" ? "cursor-crosshair" : "cursor-default"
                )}
                style={{
                  top: 0,
                  left: 0,
                  zIndex: 10,
                  pointerEvents: mode !== "none" ? "auto" : "none",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────── */}
      {pdfFile && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card shrink-0 flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <span>{numPages} page{numPages !== 1 ? "s" : ""}</span>
            {scaleRatio && <span className="text-[#F5C518]">Scale ✓</span>}
            {measurePoints.length > 0 && (
              <span className="text-[#22C55E]">{measurePoints.length} pt{measurePoints.length !== 1 ? "s" : ""}</span>
            )}
            <span className="text-muted-foreground">Scroll to zoom · Pinch on mobile</span>
          </div>
          <Button
            onClick={handlePushToCivil}
            disabled={!measuredFeet}
            className="gap-2 bg-[#F5C518] text-black hover:bg-[#e0b315] font-semibold"
          >
            <ArrowRight size={15} />
            Push {measuredFeet ? `${measuredFeet} ft` : ""} to Civil
          </Button>
        </div>
      )}
    </div>
  );
}
