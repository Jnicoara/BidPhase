/**
 * BidPhase — Tab 1: Digital Plan Viewer (Takeoff Tool) — v3
 *
 * Coordinate system design:
 * ─────────────────────────
 * All points are stored as NORMALIZED coordinates:
 *   { pageIndex, nx, ny }  where nx,ny ∈ [0,1] are fractions of the page's
 *   rendered pixel size AT ZOOM=1 (the "base" size).
 *
 * Scale ratio is stored as:  scaleRatio = (pixelDist at zoom=1) / feet
 *   → zoom-independent: to get feet from a measurement at any zoom level,
 *     compute pixelDist at zoom=1 and divide by scaleRatio.
 *
 * The canvas overlay is sized to match the total rendered height of all pages
 * at the current zoom. Points are projected to screen by multiplying by zoom.
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

/**
 * Normalized point: stored in page-fraction space at zoom=1.
 * nx = canvasX_at_zoom1 / pageWidth_at_zoom1
 * ny = canvasY_at_zoom1 / pageHeight_at_zoom1
 */
interface NormPoint {
  pageIndex: number;
  nx: number;
  ny: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_GAP = 16; // px gap between pages (at zoom=1)
const BASE_PAGE_WIDTH = 595; // A4 width in PDF points ≈ px at zoom=1 for react-pdf

// ── Helpers ───────────────────────────────────────────────────────────────────
function dist2D(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}

export default function PlanViewer() {
  const { pushDistanceToCivil } = useApp();

  // ── PDF state ──────────────────────────────────────────────────────────────
  const [pdfFile, setPdfFile] = useLocalStorage<string | null>("bp_pdf_file", null);
  const [numPages, setNumPages] = useState<number>(0);
  const [zoom, setZoom] = useLocalStorage<number>("bp_pdf_zoom", 1.0);

  /**
   * pageSizes[i] = { w, h } — the rendered size of page i AT ZOOM=1.
   * Populated once pages render. Used as the reference for all coordinate math.
   */
  const pageSizesRef = useRef<{ w: number; h: number }[]>([]);
  const [pageSizesReady, setPageSizesReady] = useState(0);

  // ── Scale state ────────────────────────────────────────────────────────────
  /**
   * scaleRatio = pixels_at_zoom1 / foot
   * Stored zoom-independently so measurements stay correct after zooming.
   */
  const [scaleRatio, setScaleRatio] = useLocalStorage<number | null>("bp_scale_ratio_v3", null);
  const [scalePoints, setScalePoints] = useLocalStorage<NormPoint[]>("bp_scale_pts_v3", []);
  const [knownDistance, setKnownDistance] = useState<string>("");

  // ── Measure state ──────────────────────────────────────────────────────────
  const [measurePoints, setMeasurePoints] = useLocalStorage<NormPoint[]>("bp_measure_pts_v3", []);
  const [measuredFeet, setMeasuredFeet] = useLocalStorage<number | null>("bp_measured_ft_v3", null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("none");
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Map from pageIndex → wrapper div element */
  const pageWrappers = useRef<Map<number, HTMLDivElement>>(new Map());

  // ── Compute cumulative top offsets at zoom=1 ───────────────────────────────
  const getPageTops_zoom1 = useCallback((): number[] => {
    const sizes = pageSizesRef.current;
    const tops: number[] = [];
    let top = 0;
    for (let i = 0; i < sizes.length; i++) {
      tops.push(top);
      top += (sizes[i]?.h ?? 0) + PAGE_GAP;
    }
    return tops;
  }, []);

  // ── Project NormPoint → canvas screen coords (at current zoom) ────────────
  const normToScreen = useCallback(
    (pt: NormPoint): { x: number; y: number } | null => {
      const sizes = pageSizesRef.current;
      const s = sizes[pt.pageIndex];
      if (!s || s.w === 0) return null;
      const tops = getPageTops_zoom1();
      const screenX = pt.nx * s.w * zoom;
      const screenY = (tops[pt.pageIndex] + pt.ny * s.h) * zoom;
      return { x: screenX, y: screenY };
    },
    [zoom, getPageTops_zoom1]
  );

  // ── Convert canvas click → NormPoint ──────────────────────────────────────
  const screenToNorm = useCallback(
    (canvasX: number, canvasY: number): NormPoint | null => {
      const sizes = pageSizesRef.current;
      if (sizes.length === 0) return null;
      const tops = getPageTops_zoom1();
      // canvasX/Y are at current zoom — convert to zoom=1 space
      const x1 = canvasX / zoom;
      const y1 = canvasY / zoom;
      for (let i = sizes.length - 1; i >= 0; i--) {
        const s = sizes[i];
        if (!s || s.w === 0) continue;
        const top = tops[i];
        if (y1 >= top && y1 <= top + s.h) {
          return {
            pageIndex: i,
            nx: x1 / s.w,
            ny: (y1 - top) / s.h,
          };
        }
      }
      return null;
    },
    [zoom, getPageTops_zoom1]
  );

  // ── Compute pixel distance at zoom=1 between two NormPoints ───────────────
  const normDist_zoom1 = useCallback(
    (a: NormPoint, b: NormPoint): number => {
      const sizes = pageSizesRef.current;
      const sa = sizes[a.pageIndex];
      const sb = sizes[b.pageIndex];
      if (!sa || !sb) return 0;
      const tops = getPageTops_zoom1();
      const ax = a.nx * sa.w;
      const ay = tops[a.pageIndex] + a.ny * sa.h;
      const bx = b.nx * sb.w;
      const by = tops[b.pageIndex] + b.ny * sb.h;
      return dist2D(ax, ay, bx, by);
    },
    [getPageTops_zoom1]
  );

  // ── Draw canvas overlay ────────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sizes = pageSizesRef.current;
    if (sizes.length === 0) return;

    // Size canvas to cover all pages at current zoom
    const tops = getPageTops_zoom1();
    const lastIdx = sizes.length - 1;
    const totalH = (tops[lastIdx] + (sizes[lastIdx]?.h ?? 0)) * zoom;
    const maxW = Math.max(...sizes.map((s) => (s?.w ?? 0) * zoom), 1);

    canvas.width = maxW;
    canvas.height = totalH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawDot = (sx: number, sy: number, color: string, r = 5) => {
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
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

    // Scale points
    const scaleSc = scalePoints.map(normToScreen).filter(Boolean) as { x: number; y: number }[];
    if (scaleSc.length >= 2) drawPoly(scaleSc, "#F5C518", true);
    scaleSc.forEach((p, i) => {
      drawDot(p.x, p.y, "#F5C518", 6);
      ctx.fillStyle = "#F5C518";
      ctx.font = `bold ${Math.max(10, 11 * zoom)}px JetBrains Mono, monospace`;
      ctx.fillText(`S${i + 1}`, p.x + 8, p.y - 6);
    });

    // Measure polyline
    const measSc = measurePoints.map(normToScreen).filter(Boolean) as { x: number; y: number }[];
    if (measSc.length >= 2) drawPoly(measSc, "#22C55E");
    measSc.forEach((p, i) => {
      drawDot(p.x, p.y, i === 0 ? "#22C55E" : "#86efac", 5);
    });

    // Crosshair
    if (crosshair && mode !== "none") {
      const { x, y } = crosshair;
      ctx.strokeStyle = "rgba(245,197,24,0.55)";
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
  }, [scalePoints, measurePoints, crosshair, mode, normToScreen, getPageTops_zoom1, zoom]);

  useEffect(() => { drawCanvas(); }, [drawCanvas, pageSizesReady]);

  // ── Recompute measurement ──────────────────────────────────────────────────
  useEffect(() => {
    if (measurePoints.length < 2 || !scaleRatio) {
      if (measurePoints.length < 2) setMeasuredFeet(null);
      return;
    }
    let totalPx = 0;
    for (let i = 1; i < measurePoints.length; i++) {
      totalPx += normDist_zoom1(measurePoints[i - 1], measurePoints[i]);
    }
    setMeasuredFeet(parseFloat((totalPx / scaleRatio).toFixed(2)));
  }, [measurePoints, scaleRatio, normDist_zoom1, pageSizesReady]); // eslint-disable-line react-hooks/exhaustive-deps

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
      pageWrappers.current.clear();
      setPageSizesReady(0);
    };
    reader.readAsDataURL(file);
  };

  // ── Page render success ────────────────────────────────────────────────────
  const onPageRender = useCallback((pageIndex: number) => {
    const wrapper = pageWrappers.current.get(pageIndex);
    if (!wrapper) return;
    // Find the react-pdf canvas inside the wrapper
    const pageCanvas = wrapper.querySelector("canvas");
    if (pageCanvas) {
      // Store the base size (at zoom=1 equivalent — react-pdf renders at scale=zoom,
      // so divide back to get zoom=1 size)
      if (!pageSizesRef.current[pageIndex]) {
        pageSizesRef.current[pageIndex] = {
          w: pageCanvas.offsetWidth,
          h: pageCanvas.offsetHeight,
        };
      }
    }
    setPageSizesReady((n) => n + 1);
  }, []);

  // ── Canvas events ──────────────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCrosshair({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => setCrosshair(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === "none") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const pt = screenToNorm(cx, cy);
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

  // ── Undo ───────────────────────────────────────────────────────────────────
  const handleUndo = () => {
    if (mode === "set-scale-p2") {
      setScalePoints([]);
      setMode("set-scale-p1");
      toast.info("Point 1 cleared — click it again.");
    } else if (measurePoints.length > 0) {
      setMeasurePoints((prev) => prev.slice(0, -1));
    }
  };

  // ── Confirm scale ──────────────────────────────────────────────────────────
  const confirmScale = () => {
    if (scalePoints.length < 2) { toast.error("Click two reference points first."); return; }
    const dist = parseFloat(knownDistance);
    if (isNaN(dist) || dist <= 0) { toast.error("Enter a valid distance in feet."); return; }
    const px = normDist_zoom1(scalePoints[0], scalePoints[1]);
    if (px === 0) { toast.error("The two points are at the same location — try again."); return; }
    const ratio = px / dist;
    setScaleRatio(ratio);
    toast.success(`Scale set: ${dist} ft = ${px.toFixed(1)} px → 1 ft = ${ratio.toFixed(2)} px`);
    setScalePoints([]);
    setKnownDistance("");
  };

  // ── Push to Civil ──────────────────────────────────────────────────────────
  const handlePushToCivil = () => {
    if (!measuredFeet || measuredFeet <= 0) { toast.error("No measurement yet."); return; }
    pushDistanceToCivil(measuredFeet);
    toast.success(`${measuredFeet} ft pushed to Civil Calculator.`);
  };

  const canUndo =
    mode === "set-scale-p2" ||
    measurePoints.length > 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Toolbar ────────────────────────────────────────────────── */}
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

        {/* Scale confirm row */}
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
            1 ft = {scaleRatio.toFixed(2)} px
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

        {/* Undo */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo last point"
          className="gap-1 h-8 text-muted-foreground hover:text-foreground"
        >
          <Undo2 size={14} />
          Undo
        </Button>

        {/* Clear measure */}
        {measurePoints.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => { setMeasurePoints([]); setMeasuredFeet(null); }} className="gap-1 text-muted-foreground h-8">
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
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(+(z + 0.25).toFixed(2), 4))}>
            <ZoomIn size={14} />
          </Button>
          <span className="text-xs font-mono text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(+(z - 0.25).toFixed(2), 0.25))}>
            <ZoomOut size={14} />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Reset zoom" onClick={() => setZoom(1)}>
            <RotateCcw size={14} />
          </Button>
        </div>
      </div>

      {/* ── Mode hint bar ──────────────────────────────────────────── */}
      {mode !== "none" && (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-[#F5C518]/10 border-b border-[#F5C518]/20 shrink-0">
          <span className="text-xs text-[#F5C518] font-mono">
            {mode === "set-scale-p1" && "→ Click the START of your known-distance reference line"}
            {mode === "set-scale-p2" && "→ Click the END of your known-distance reference line"}
            {mode === "measure" && "→ Click points along the path · Undo removes last point · Click Measure again to stop"}
          </span>
          {canUndo && (
            <Button size="sm" variant="ghost" onClick={handleUndo}
              className="h-6 px-2 text-[#F5C518] hover:text-[#F5C518] hover:bg-[#F5C518]/10 ml-auto text-xs gap-1">
              <Undo2 size={12} /> Undo last point
            </Button>
          )}
        </div>
      )}

      {/* ── Scroll area ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto" style={{ scrollBehavior: "smooth" }}>
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
          <div className="flex justify-center py-4">
            {/* Outer wrapper: pages + canvas overlay */}
            <div className="relative" style={{ display: "inline-block" }}>
              {/* Pages */}
              <div className="flex flex-col" style={{ gap: PAGE_GAP }}>
                <Document
                  file={pdfFile}
                  onLoadSuccess={({ numPages: n }) => {
                    setNumPages(n);
                    pageSizesRef.current = [];
                    pageWrappers.current.clear();
                    setPageSizesReady(0);
                  }}
                  loading={
                    <div className="flex items-center justify-center w-[595px] h-[841px] text-muted-foreground text-sm bg-card rounded border border-border">
                      Loading PDF…
                    </div>
                  }
                >
                  {Array.from({ length: numPages }, (_, i) => (
                    <div
                      key={i}
                      ref={(el) => { if (el) pageWrappers.current.set(i, el); }}
                      style={{ display: "block", lineHeight: 0 }}
                    >
                      <Page
                        pageNumber={i + 1}
                        scale={zoom}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        onRenderSuccess={() => onPageRender(i)}
                      />
                    </div>
                  ))}
                </Document>
              </div>

              {/* Canvas overlay */}
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className={cn("absolute inset-0", mode !== "none" ? "cursor-none" : "cursor-default")}
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

      {/* ── Bottom bar ────────────────────────────────────────────── */}
      {pdfFile && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card shrink-0 flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <span>{numPages} page{numPages !== 1 ? "s" : ""}</span>
            {scaleRatio && <span className="text-[#F5C518]">Scale: {scaleRatio.toFixed(2)} px/ft</span>}
            {measurePoints.length > 0 && <span className="text-[#22C55E]">{measurePoints.length} pt{measurePoints.length !== 1 ? "s" : ""}</span>}
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
