/**
 * BidPhase — Tab 1: Digital Plan Viewer (Takeoff Tool)
 * - PDF viewer via react-pdf
 * - HTML5 Canvas overlay for scale-set and polyline measurement
 * - "Set Scale": click 2 points → input known distance → compute px/ft ratio
 * - "Measure": click multiple points → compute real-world distance
 * - "Push to Civil Calculator" sends measured distance to Tab 2
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useApp } from "@/contexts/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// Configure PDF.js worker — must match pdfjs-dist version used by react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type Mode = "none" | "set-scale-p1" | "set-scale-p2" | "measure";

interface Point {
  x: number;
  y: number;
}

export default function PlanViewer() {
  const { pushDistanceToCivil } = useApp();

  // PDF state
  const [pdfFile, setPdfFile] = useLocalStorage<string | null>("bp_pdf_file", null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useLocalStorage<number>("bp_pdf_page", 1);
  const [zoom, setZoom] = useLocalStorage<number>("bp_pdf_zoom", 1.0);

  // Scale state
  const [scaleRatio, setScaleRatio] = useLocalStorage<number | null>("bp_scale_ratio", null); // px per foot
  const [scalePoints, setScalePoints] = useState<Point[]>([]);
  const [knownDistance, setKnownDistance] = useState<string>("");

  // Measure state
  const [measurePoints, setMeasurePoints] = useLocalStorage<Point[]>("bp_measure_pts", []);
  const [measuredFeet, setMeasuredFeet] = useLocalStorage<number | null>("bp_measured_ft", null);

  // UI mode
  const [mode, setMode] = useState<Mode>("none");

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // ── File upload ──────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPdfFile(dataUrl);
      setCurrentPage(1);
      setScaleRatio(null);
      setMeasurePoints([]);
      setMeasuredFeet(null);
      setScalePoints([]);
      setMode("none");
    };
    reader.readAsDataURL(file);
  };

  // ── Canvas drawing ───────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const page = pageRef.current;
    if (!canvas || !page) return;

    const rect = page.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawPoint = (p: Point, color: string, radius = 5) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#0F1117";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    const drawLine = (pts: Point[], color: string, dashed = false) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (dashed) ctx.setLineDash([6, 4]);
      else ctx.setLineDash([]);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // Scale points
    if (scalePoints.length > 0) {
      scalePoints.forEach((p) => drawPoint(p, "#F5C518", 6));
      if (scalePoints.length === 2) drawLine(scalePoints, "#F5C518", true);
    }

    // Measure polyline
    if (measurePoints.length > 0) {
      drawLine(measurePoints, "#22C55E");
      measurePoints.forEach((p, i) =>
        drawPoint(p, i === 0 ? "#22C55E" : "#86efac", 5)
      );
    }
  }, [scalePoints, measurePoints]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, zoom, currentPage]);

  // ── Canvas click handler ─────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pt: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (mode === "set-scale-p1") {
      setScalePoints([pt]);
      setMode("set-scale-p2");
      toast.info("Click the second reference point.");
    } else if (mode === "set-scale-p2") {
      setScalePoints((prev) => [...prev, pt]);
      setMode("none");
      toast.success("Both points set. Enter the known distance below.");
    } else if (mode === "measure") {
      setMeasurePoints((prev) => {
        const next = [...prev, pt];
        if (scaleRatio && next.length >= 2) {
          let totalPx = 0;
          for (let i = 1; i < next.length; i++) {
            const dx = next[i].x - next[i - 1].x;
            const dy = next[i].y - next[i - 1].y;
            totalPx += Math.sqrt(dx * dx + dy * dy);
          }
          setMeasuredFeet(parseFloat((totalPx / scaleRatio).toFixed(2)));
        }
        return next;
      });
    }
  };

  // ── Confirm scale ────────────────────────────────────────────
  const confirmScale = () => {
    if (scalePoints.length < 2) {
      toast.error("Click two reference points on the plan first.");
      return;
    }
    const dist = parseFloat(knownDistance);
    if (isNaN(dist) || dist <= 0) {
      toast.error("Enter a valid real-world distance in feet.");
      return;
    }
    const dx = scalePoints[1].x - scalePoints[0].x;
    const dy = scalePoints[1].y - scalePoints[0].y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    const ratio = pixelDist / dist;
    setScaleRatio(ratio);
    toast.success(`Scale set: 1 ft = ${ratio.toFixed(2)} px`);
    setScalePoints([]);
    setKnownDistance("");
  };

  // ── Push to Civil ────────────────────────────────────────────
  const handlePushToCivil = () => {
    if (!measuredFeet || measuredFeet <= 0) {
      toast.error("No measurement to push. Use Measure mode first.");
      return;
    }
    pushDistanceToCivil(measuredFeet);
    toast.success(`${measuredFeet} ft pushed to Civil Calculator.`);
  };

  const clearMeasure = () => {
    setMeasurePoints([]);
    setMeasuredFeet(null);
    drawCanvas();
  };

  const cursorClass =
    mode === "set-scale-p1" || mode === "set-scale-p2"
      ? "cursor-crosshair"
      : mode === "measure"
      ? "cursor-cell"
      : "cursor-default";

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
        {/* Upload */}
        <label className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
          <Upload size={15} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Load PDF</span>
          <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
        </label>

        <div className="w-px h-6 bg-border" />

        {/* Scale tools */}
        <Button
          size="sm"
          variant={mode === "set-scale-p1" || mode === "set-scale-p2" ? "default" : "outline"}
          onClick={() => {
            setScalePoints([]);
            setMode("set-scale-p1");
            toast.info("Click the first reference point on the plan.");
          }}
          className={cn(
            "gap-1.5",
            (mode === "set-scale-p1" || mode === "set-scale-p2") &&
              "bg-[#F5C518] text-black hover:bg-[#e0b315]"
          )}
        >
          <Ruler size={14} />
          Set Scale
        </Button>

        {scalePoints.length === 2 && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Known ft"
              value={knownDistance}
              onChange={(e) => setKnownDistance(e.target.value)}
              className="w-24 h-8 text-sm font-mono bg-input border-border"
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
          className={cn(
            "gap-1.5",
            mode === "measure" && "bg-[#22C55E] text-black hover:bg-[#16a34a]"
          )}
        >
          <Move size={14} />
          Measure
        </Button>

        {measurePoints.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearMeasure} className="gap-1 text-muted-foreground h-8">
            <Trash2 size={13} />
            Clear
          </Button>
        )}

        {measuredFeet !== null && (
          <Badge className="font-mono bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30 text-xs">
            {measuredFeet} ft
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* Zoom */}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}>
            <ZoomIn size={14} />
          </Button>
          <span className="text-xs font-mono text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}>
            <ZoomOut size={14} />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom(1)}>
            <RotateCcw size={14} />
          </Button>
        </div>
      </div>

      {/* ── PDF Viewer + Canvas ──────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex justify-center items-start p-4"
      >
        {!pdfFile ? (
          <div className="flex flex-col items-center justify-center gap-4 mt-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center">
              <Upload size={32} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                No Plan Loaded
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a PDF to begin your takeoff
              </p>
            </div>
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#F5C518] text-black font-semibold text-sm cursor-pointer hover:bg-[#e0b315] transition-colors">
              <Upload size={16} />
              Load PDF Plan
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        ) : (
          <div className="relative inline-block" ref={pageRef}>
            <Document
              file={pdfFile}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div className="flex items-center justify-center w-64 h-96 text-muted-foreground text-sm">
                  Loading PDF…
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={zoom}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onRenderSuccess={drawCanvas}
              />
            </Document>

            {/* Canvas overlay */}
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={cn("absolute inset-0 w-full h-full", cursorClass)}
              style={{ pointerEvents: mode !== "none" ? "auto" : "none" }}
            />
          </div>
        )}
      </div>

      {/* ── Bottom bar: page nav + push button ──────────────────── */}
      {pdfFile && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card shrink-0 flex-wrap gap-3">
          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="h-8"
            >
              ‹ Prev
            </Button>
            <span className="text-xs font-mono text-muted-foreground">
              Page {currentPage} / {numPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-8"
            >
              Next ›
            </Button>
          </div>

          {/* Mode hint */}
          {mode !== "none" && (
            <p className="text-xs text-[#F5C518] font-mono animate-pulse">
              {mode === "set-scale-p1" && "→ Click Point 1 on the plan"}
              {mode === "set-scale-p2" && "→ Click Point 2 on the plan"}
              {mode === "measure" && "→ Click points to trace path · Click Measure again to stop"}
            </p>
          )}

          {/* Push to Civil */}
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
