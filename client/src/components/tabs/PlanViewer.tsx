/**
 * HelixBid — Tab 1: Digital Plan Viewer (Takeoff Tool) — v6
 *
 * Zoom architecture (Native re-render):
 * ───────────────────────────────────────
 * The PDF is rendered at exactly (BASE_DPI * zoom) scale via react-pdf's
 * `scale` prop. No CSS transform is used for zoom — the browser lays out
 * the content at the correct size naturally, so scroll always works correctly.
 *
 * To avoid re-rendering on every wheel tick, zoom changes are debounced:
 * - The visual zoom level updates immediately (via a CSS scale on a preview
 *   overlay) so the user sees instant feedback.
 * - The actual PDF re-render fires 300ms after the last zoom event.
 *
 * Coordinate system:
 * ──────────────────
 * Points stored as { pageIndex, nx, ny } where nx,ny ∈ [0,1] are fractions
 * of the page's rendered size at the CURRENT zoom level.
 * scaleRatio = pixels_per_foot at the zoom level when scale was set.
 * When zoom changes, scaleRatio is adjusted proportionally.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useApp } from "@/contexts/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
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
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// ── Types ─────────────────────────────────────────────────────────────────────
type Mode = "none" | "set-scale-p1" | "set-scale-p2" | "measure";

interface NormPoint {
  pageIndex: number;
  nx: number; // fraction of page rendered width at the zoom when point was placed
  ny: number; // fraction of page rendered height at the zoom when point was placed
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_GAP = 16; // px gap between pages
const BASE_DPI = 1.5; // base render scale for quality
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5.0;
const ZOOM_STEPS = [
  0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0,
];
const DEBOUNCE_MS = 350; // ms after last zoom event before PDF re-renders

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
function dist2D(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}

export default function PlanViewer() {
  const { pushDistanceToCivil } = useApp();

  // ── PDF state ──────────────────────────────────────────────────────────────
  const [pdfFile, setPdfFile] = useLocalStorage<string | null>(
    "bp_pdf_file",
    null
  );
  const [numPages, setNumPages] = useState<number>(0);

  // ── Zoom state ─────────────────────────────────────────────────────────────
  // renderZoom: the zoom level the PDF is currently rendered at (triggers re-render)
  const [renderZoom, setRenderZoom] = useLocalStorage<number>(
    "bp_zoom_v6",
    1.0
  );
  // displayZoom: the zoom level shown in the badge (updates instantly on wheel)
  const [displayZoom, setDisplayZoom] = useState<number>(renderZoom);
  const displayZoomRef = useRef(displayZoom);
  const renderZoomRef = useRef(renderZoom);
  useEffect(() => {
    displayZoomRef.current = displayZoom;
  }, [displayZoom]);
  useEffect(() => {
    renderZoomRef.current = renderZoom;
  }, [renderZoom]);

  // Debounce timer for PDF re-render
  const zoomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scale state ────────────────────────────────────────────────────────────
  // scaleRatio: pixels per foot at renderZoom=1.0 (zoom-independent)
  const [scaleRatio, setScaleRatio] = useLocalStorage<number | null>(
    "bp_scale_ratio_v6",
    null
  );
  const [scalePoints, setScalePoints] = useLocalStorage<NormPoint[]>(
    "bp_scale_pts_v6",
    []
  );
  const [knownDistance, setKnownDistance] = useState<string>("");

  // ── Measure state ──────────────────────────────────────────────────────────
  const [measurePoints, setMeasurePoints] = useLocalStorage<NormPoint[]>(
    "bp_measure_pts_v6",
    []
  );
  const [measuredFeet, setMeasuredFeet] = useLocalStorage<number | null>(
    "bp_measured_ft_v6",
    null
  );

  // ── UI state ───────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("none");
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(
    null
  );

  // ── Refs ───────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // pageSizes[i] = { w, h } at current renderZoom
  const pageSizesRef = useRef<{ w: number; h: number }[]>([]);
  const [pageSizesReady, setPageSizesReady] = useState(0);

  // Pinch zoom
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(
    null
  );

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

  // ── Draw overlay canvas ────────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sizes = pageSizesRef.current;
    if (sizes.length === 0) return;

    const tops = getPageTops();
    const lastIdx = sizes.length - 1;
    const totalH = tops[lastIdx] + (sizes[lastIdx]?.h ?? 0);
    const maxW = Math.max(...sizes.map(s => s?.w ?? 0), 1);

    canvas.width = maxW;
    canvas.height = totalH;
    canvas.style.width = `${maxW}px`;
    canvas.style.height = `${totalH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawDot = (x: number, y: number, color: string, r = 5) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    const drawPoly = (
      pts: { x: number; y: number }[],
      color: string,
      dashed = false
    ) => {
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
    const scalePts = scalePoints.map(normToCanvas).filter(Boolean) as {
      x: number;
      y: number;
    }[];
    if (scalePts.length >= 2) drawPoly(scalePts, "#F5C518", true);
    scalePts.forEach((p, i) => {
      drawDot(p.x, p.y, "#F5C518", 6);
      ctx.fillStyle = "#F5C518";
      ctx.font = "bold 11px JetBrains Mono, monospace";
      ctx.fillText(`S${i + 1}`, p.x + 8, p.y - 6);
    });

    // Measure polyline
    const measPts = measurePoints.map(normToCanvas).filter(Boolean) as {
      x: number;
      y: number;
    }[];
    if (measPts.length >= 2) drawPoly(measPts, "#22C55E");
    measPts.forEach(p => drawDot(p.x, p.y, "#22C55E", 5));

    // Crosshair
    if (crosshair) {
      const { x, y } = crosshair;
      ctx.strokeStyle = "rgba(245,197,24,0.55)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#F5C518";
      ctx.fill();
    }
  }, [scalePoints, measurePoints, crosshair, normToCanvas, getPageTops]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, pageSizesReady]);

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
    // scaleRatio is px/ft at zoom=1. At current renderZoom, px/ft = scaleRatio * renderZoom
    const pxPerFt = scaleRatio * renderZoom;
    setMeasuredFeet(parseFloat((totalPx / pxPerFt).toFixed(2)));
  }, [measurePoints, scaleRatio, renderZoom, normDist, pageSizesReady]); // eslint-disable-line

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
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

  // ── Page render callback (via react-pdf onRenderSuccess) ────────────────────
  // Using onRenderSuccess avoids calling setState inside a ref callback
  // (which causes infinite update loops in React 19).
  const onPageRenderSuccess = useCallback(
    (pageIndex: number, page: { width: number; height: number }) => {
      pageSizesRef.current[pageIndex] = { w: page.width, h: page.height };
      setPageSizesReady(n => n + 1);
    },
    []
  );

  // ── Zoom helpers ───────────────────────────────────────────────────────────
  /**
   * Apply a new zoom level.
   * - Updates displayZoom immediately (badge + visual feedback)
   * - Debounces the actual PDF re-render by DEBOUNCE_MS
   * - Adjusts scroll so the focal content point stays under the cursor
   */
  const applyZoom = useCallback(
    (newZoomRaw: number, focalClientX?: number, focalClientY?: number) => {
      const scrollEl = scrollAreaRef.current;
      if (!scrollEl) return;

      const oldZoom = displayZoomRef.current;
      const newZoom = clamp(
        parseFloat(newZoomRaw.toFixed(4)),
        MIN_ZOOM,
        MAX_ZOOM
      );
      if (Math.abs(newZoom - oldZoom) < 0.001) return;

      // Determine focal point in scroll-area-local coords
      const rect = scrollEl.getBoundingClientRect();
      const vpX =
        focalClientX !== undefined ? focalClientX - rect.left : rect.width / 2;
      const vpY =
        focalClientY !== undefined ? focalClientY - rect.top : rect.height / 2;

      // Content coordinate under focal point at OLD zoom
      const contentX = (scrollEl.scrollLeft + vpX) / oldZoom;
      const contentY = (scrollEl.scrollTop + vpY) / oldZoom;

      // Update display zoom immediately
      setDisplayZoom(newZoom);
      displayZoomRef.current = newZoom;

      // Adjust scroll so focal content point stays fixed
      // (content dimensions scale proportionally with zoom)
      scrollEl.scrollLeft = contentX * newZoom - vpX;
      scrollEl.scrollTop = contentY * newZoom - vpY;

      // Debounce the actual PDF re-render
      if (zoomDebounceRef.current) clearTimeout(zoomDebounceRef.current);
      zoomDebounceRef.current = setTimeout(() => {
        pageSizesRef.current = [];
        setPageSizesReady(0);
        setRenderZoom(newZoom);
        renderZoomRef.current = newZoom;
      }, DEBOUNCE_MS);
    },
    [setRenderZoom]
  );

  const zoomIn = useCallback(() => {
    const cur = displayZoomRef.current;
    const next =
      ZOOM_STEPS.find(s => s > cur + 0.01) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
    applyZoom(next);
  }, [applyZoom]);

  const zoomOut = useCallback(() => {
    const cur = displayZoomRef.current;
    const prev =
      [...ZOOM_STEPS].reverse().find(s => s < cur - 0.01) ?? ZOOM_STEPS[0];
    applyZoom(prev);
  }, [applyZoom]);

  const zoomReset = useCallback(() => {
    applyZoom(1.0);
  }, [applyZoom]);

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
        if (abs > 50) {
          delta = e.deltaY > 0 ? -0.15 : 0.15;
        } else {
          delta = e.deltaY * -0.004;
        }
      }
      delta = clamp(delta, -0.3, 0.3);
      applyZoom(displayZoomRef.current + delta, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  // ── Pinch zoom ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const getTouchDist = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]];
      return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          startDist: getTouchDist(e),
          startZoom: displayZoomRef.current,
        };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const ratio = getTouchDist(e) / pinchRef.current.startDist;
        const newZoom = clamp(
          pinchRef.current.startZoom * ratio,
          MIN_ZOOM,
          MAX_ZOOM
        );
        const mid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        applyZoom(newZoom, mid.x, mid.y);
      }
    };
    const onTouchEnd = () => {
      pinchRef.current = null;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [applyZoom]);

  // ── Canvas click handler ───────────────────────────────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // Canvas is rendered at renderZoom; getBoundingClientRect gives display size
      // which equals renderZoom * naturalSize. We need canvas pixel coords.
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;

      const pt = canvasToNorm(cx, cy);
      if (!pt) return;

      const m = modeRef.current;
      if (m === "set-scale-p1") {
        setScalePoints([pt]);
        setMode("set-scale-p2");
        modeRef.current = "set-scale-p2";
      } else if (m === "set-scale-p2") {
        setScalePoints(prev => [...prev.slice(0, 1), pt]);
        setMode("set-scale-p2");
      } else if (m === "measure") {
        setMeasurePoints(prev => [...prev, pt]);
      }
    },
    [canvasToNorm, setScalePoints, setMeasurePoints]
  );

  // ── Canvas mouse move (crosshair) ──────────────────────────────────────────
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (modeRef.current === "none") {
        setCrosshair(null);
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      setCrosshair({
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      });
    },
    []
  );

  // ── Confirm scale ──────────────────────────────────────────────────────────
  const confirmScale = useCallback(() => {
    if (scalePoints.length < 2) {
      toast.error("Place both scale points first.");
      return;
    }
    const d = parseFloat(knownDistance);
    if (!d || d <= 0) {
      toast.error("Enter a valid distance in feet.");
      return;
    }
    const pxDist = normDist(scalePoints[0], scalePoints[1]);
    if (pxDist < 2) {
      toast.error("Points are too close together. Try again.");
      return;
    }
    // Store as px/ft at zoom=1 (zoom-independent)
    const pxPerFtAtCurrentZoom = pxDist / d;
    const pxPerFtAtZoom1 = pxPerFtAtCurrentZoom / renderZoom;
    setScaleRatio(pxPerFtAtZoom1);
    setMode("none");
    modeRef.current = "none";
    toast.success(
      `Scale set: 1 ft = ${(pxDist / d).toFixed(2)} px at current zoom.`
    );
  }, [scalePoints, knownDistance, normDist, renderZoom, setScaleRatio]);

  // ── Undo ───────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    const m = modeRef.current;
    if (m === "set-scale-p2" && scalePoints.length > 0) {
      setScalePoints([]);
      setMode("set-scale-p1");
      modeRef.current = "set-scale-p1";
      toast.info("Scale Point 1 removed. Click again to re-place.");
    } else if (measurePoints.length > 0) {
      const next = measurePoints.slice(0, -1);
      setMeasurePoints(next);
      toast.info(
        next.length > 0
          ? `Removed last point (${next.length} remaining).`
          : "All measure points cleared."
      );
    } else {
      toast.info("Nothing to undo.");
    }
  }, [scalePoints, measurePoints, setScalePoints, setMeasurePoints]);

  const canUndo =
    (mode === "set-scale-p2" && scalePoints.length > 0) ||
    measurePoints.length > 0;

  // ── Push to Civil ──────────────────────────────────────────────────────────
  const handlePushToCivil = () => {
    if (!measuredFeet || measuredFeet <= 0) {
      toast.error("No measurement yet.");
      return;
    }
    pushDistanceToCivil(measuredFeet);
    toast.success(`${measuredFeet} ft pushed to Civil Calculator.`);
  };

  // ── Visual zoom scale on the pages container while debounce is pending ─────
  // When displayZoom !== renderZoom, we apply a CSS scale to give instant
  // visual feedback before the PDF re-renders.
  const visualScale = displayZoom / renderZoom;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
        <label className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
          <Upload size={15} />
          <span>Load PDF</span>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        <div className="w-px h-6 bg-border" />

        {/* Set Scale */}
        <Button
          size="sm"
          variant={
            mode === "set-scale-p1" || mode === "set-scale-p2"
              ? "default"
              : "outline"
          }
          onClick={() => {
            setScalePoints([]);
            setMode("set-scale-p1");
            modeRef.current = "set-scale-p1";
            toast.info(
              "Click the START of your known-distance reference line."
            );
          }}
          disabled={!pdfFile}
        >
          Set Scale
        </Button>

        {/* Scale confirmed badge */}
        {scaleRatio && mode === "none" && (
          <span className="text-xs font-mono text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/30">
            Scale set ✓
          </span>
        )}

        {/* Scale point 2 + confirm */}
        {mode === "set-scale-p2" && scalePoints.length >= 2 && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Distance (ft)"
              value={knownDistance}
              onChange={e => setKnownDistance(e.target.value)}
              className="w-32 h-8 text-sm"
              onKeyDown={e => {
                if (e.key === "Enter") confirmScale();
              }}
            />
            <Button size="sm" onClick={confirmScale}>
              Confirm
            </Button>
          </div>
        )}

        <div className="w-px h-6 bg-border" />

        {/* Measure */}
        <Button
          size="sm"
          variant={mode === "measure" ? "default" : "outline"}
          onClick={() => {
            if (!scaleRatio) {
              toast.error("Set scale first.");
              return;
            }
            setMode("measure");
            modeRef.current = "measure";
            toast.info("Click points along the path to measure.");
          }}
          disabled={!pdfFile || !scaleRatio}
        >
          <Ruler size={14} className="mr-1" />
          Measure
        </Button>

        {/* Undo */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo last point (works anytime)"
        >
          <Undo2 size={14} className="mr-1" />
          Undo
        </Button>

        {/* Clear */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setMeasurePoints([]);
            setMeasuredFeet(null);
            setScalePoints([]);
            setScaleRatio(null);
            setMode("none");
            modeRef.current = "none";
            toast.info("Canvas cleared.");
          }}
          disabled={!pdfFile}
        >
          <Trash2 size={14} className="mr-1" />
          Clear
        </Button>

        {/* Zoom controls */}
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={zoomOut}
            title="Zoom out"
          >
            <ZoomOut size={15} />
          </Button>
          <span className="text-xs font-mono w-12 text-center tabular-nums">
            {Math.round(displayZoom * 100)}%
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={zoomIn}
            title="Zoom in"
          >
            <ZoomIn size={15} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={zoomReset}
            title="Reset zoom"
          >
            <RotateCcw size={14} />
          </Button>
        </div>
      </div>

      {/* ── Hint bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/40 border-b border-border text-xs text-muted-foreground shrink-0">
        <span>
          {mode === "set-scale-p1" &&
            "Click the START of your known-distance reference line."}
          {mode === "set-scale-p2" &&
            scalePoints.length < 2 &&
            "Click the END of the reference line."}
          {mode === "set-scale-p2" &&
            scalePoints.length >= 2 &&
            "Enter the real-world distance and click Confirm."}
          {mode === "measure" &&
            "Click along the path. Each click adds a vertex. Undo removes the last."}
          {mode === "none" &&
            `${numPages} page${numPages !== 1 ? "s" : ""}${scaleRatio ? " · Scale ✓" : ""} · Scroll to zoom · Pinch on mobile`}
        </span>
        {measuredFeet !== null && measuredFeet > 0 && (
          <Button
            size="sm"
            className="h-7 text-xs gap-1 bg-yellow-400 text-black hover:bg-yellow-300"
            onClick={handlePushToCivil}
          >
            <ArrowRight size={12} />
            Push {measuredFeet} ft to Civil
          </Button>
        )}
      </div>

      {/* ── Scroll area ──────────────────────────────────────────────── */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-auto relative"
        style={{ cursor: mode !== "none" ? "crosshair" : "default" }}
      >
        {!pdfFile ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
              <Upload size={32} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">No Plan Loaded</p>
            <p className="text-sm">Upload a PDF to begin your takeoff</p>
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-black font-semibold cursor-pointer hover:bg-yellow-300 transition-colors">
              <Upload size={16} />
              Load PDF Plan
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          /* Pages + canvas wrapper — visual scale applied here for instant feedback */
          <div
            ref={pagesContainerRef}
            style={{
              display: "inline-block",
              transformOrigin: "top left",
              transform:
                Math.abs(visualScale - 1) > 0.001
                  ? `scale(${visualScale})`
                  : "none",
              // When visual scale != 1, expand the wrapper so scroll area doesn't shrink
              ...(Math.abs(visualScale - 1) > 0.001
                ? {
                    width: `${100 / visualScale}%`,
                    height: `${100 / visualScale}%`,
                  }
                : {}),
            }}
          >
            <div className="relative" style={{ padding: `${PAGE_GAP}px` }}>
              <Document
                file={pdfFile}
                onLoadSuccess={({ numPages: n }) => {
                  setNumPages(n);
                  pageSizesRef.current = [];
                  setPageSizesReady(0);
                }}
                onLoadError={err =>
                  toast.error(`PDF load error: ${err.message}`)
                }
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
                      onRenderSuccess={page =>
                        onPageRenderSuccess(i, {
                          width: page.width,
                          height: page.height,
                        })
                      }
                    />
                  </div>
                ))}
              </Document>

              {/* Overlay canvas — absolutely positioned over all pages */}
              {numPages > 0 && pageSizesReady > 0 && (
                <canvas
                  ref={canvasRef}
                  style={{
                    position: "absolute",
                    top: PAGE_GAP,
                    left: PAGE_GAP,
                    pointerEvents: mode !== "none" ? "auto" : "none",
                    zIndex: 10,
                    cursor: mode !== "none" ? "crosshair" : "default",
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
