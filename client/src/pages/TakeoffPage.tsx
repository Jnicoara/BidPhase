/**
 * TakeoffPage — the plan workspace for a bid.
 *
 * Phase 1 attached PDFs and let you page through one. Phase 2a puts the
 * workspace structure around that: the split screen, the sheet index, and the
 * per-sheet scale. Still no measuring — 2b traces, 2c stamps and the legend,
 * 2d layers.
 *
 * A fresh build rather than a reworking of the legacy takeoff screen. The PDF
 * rendering engine underneath is unchanged, as ASSEMBLIES_PLAN.md § TAKEOFF
 * PAGE REDESIGN intends: this is the surrounding workflow.
 *
 * ── Layout, and why this shape ───────────────────────────────────────────────
 *   documents + sheet index │ the drawing │ work pane
 *
 * The index is permanently docked rather than a drawer, because choosing the
 * sheet is the single most frequent action on this screen and a drawer would
 * put a click in front of every one of them. The work pane is a resizable
 * split: it holds nothing yet, but the counted-items list (2b/2c) and legend
 * (2c) land there, and building the two-pane structure now means neither
 * arrives as a bolted-on drawer later. Its empty state says what is coming so
 * the space does not read as a rendering fault.
 *
 * ── What happens when a document opens ───────────────────────────────────────
 * 1. Bytes are fetched and handed to the worker (phase 1).
 * 2. The outline is read and posted to `ensureSheets`, which creates the sheet
 *    rows once. Renames survive this — see the router.
 * 3. The visible page's text is extracted and posted to `detectSheetScale`,
 *    which applies a reading only when it is certain. Everything else becomes a
 *    suggestion on the scale control.
 *
 * Steps 2 and 3 are best-effort: a document with no outline and no legible
 * scale still opens, still lists every sheet, and still measures once the user
 * sets a scale by hand.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Cable, ChevronLeft, ChevronRight, FileText, Loader2, Plus,
  MapPin, Trash2, Upload, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SheetIndex } from "@/components/takeoff/SheetIndex";
import { ScaleControl } from "@/components/takeoff/ScaleControl";
import { UploadProgress } from "@/components/takeoff/UploadProgress";
import { MAX_PDF_BYTES, checkPdfUpload, formatBytes, looksLikePdf } from "@shared/uploadLimits";
import { TraceLayer } from "@/components/takeoff/TraceLayer";
import { RunsPanel } from "@/components/takeoff/RunsPanel";
import {
  clearDraft, clearStampQueue, hasUnsavedWork, loadDraft, loadStampQueue, saveDraft,
  saveStampQueue, type QueuedStamp,
} from "@/lib/traceDraft";
import { LegendPanel } from "@/components/takeoff/LegendPanel";
import { groupStamps } from "@shared/takeoffCounts";
import { LayersPanel } from "@/components/takeoff/LayersPanel";
import {
  SymbolCaptureForm, SymbolCaptureLayer, cropToThumbnail, type CaptureRegion,
} from "@/components/takeoff/SymbolCapture";
import {
  allLayersOn, filterByLayers, layersPresent, locationKeyOf, systemKeyForRun,
  systemKeyForStamp, type LayerState,
} from "@shared/takeoffLayers";
import type { PagePoint } from "@shared/takeoffGeometry";
import type { RunPathType } from "@shared/takeoffQuantities";

/** One in-flight (or failed) upload, as the progress list shows it. */
type UploadJob = {
  filename: string;
  byteSize: number;
  /** Bytes the browser has confirmed sent. */
  sent: number;
  state: "waiting" | "uploading" | "finishing" | "done" | "failed";
  error?: string;
};

type Document = {
  id: number;
  filename: string;
  byteSize: number;
  pageCount: number | null;
  url: string;
};

// ── Worker plumbing ──────────────────────────────────────────────────────────

type Pending = { resolve: (value: any) => void; reject: (e: Error) => void };

/**
 * One worker for this screen, torn down with it.
 *
 * Not the module-level singleton the legacy viewer keeps: this page owns its
 * document, and leaving a parsed PDF resident after the user navigates away
 * holds its decoded pages in memory for nobody.
 */
function usePdfWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef(new Map<string, Pending>());
  const loadWaiters = useRef<{ resolve: (pages: number) => void; reject: (e: Error) => void }[]>([]);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/pdfRenderer.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      // pdfjs runs its own worker entry inside ours and posts a handshake that
      // arrives here first. Anything without a known type is not ours.
      if (!msg || typeof msg.type !== "string") return;

      if (msg.type === "loaded") {
        loadWaiters.current.splice(0).forEach(w => w.resolve(msg.numPages));
        return;
      }
      if (msg.type === "rendered") {
        pending.current.get(msg.reqId)?.resolve(msg.bitmap);
        pending.current.delete(msg.reqId);
        return;
      }
      if (msg.type === "outline") {
        pending.current.get(msg.reqId)?.resolve(msg.entries);
        pending.current.delete(msg.reqId);
        return;
      }
      if (msg.type === "text") {
        pending.current.get(msg.reqId)?.resolve(msg.text);
        pending.current.delete(msg.reqId);
        return;
      }
      if (msg.type === "error") {
        const waiter = pending.current.get(msg.reqId);
        if (waiter) {
          waiter.reject(new Error(msg.message));
          pending.current.delete(msg.reqId);
          return;
        }
        // An error with no request to attach it to can only be the load, which
        // would otherwise hang on a spinner forever.
        loadWaiters.current.splice(0).forEach(w => w.reject(new Error(msg.message)));
      }
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
      pending.current.clear();
      loadWaiters.current = [];
    };
  }, []);

  const ask = useCallback(<T,>(message: Record<string, unknown>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) return reject(new Error("Viewer not ready"));
      const reqId = `${Date.now()}:${Math.random()}`;
      pending.current.set(reqId, { resolve, reject });
      worker.postMessage({ ...message, reqId });
    });
  }, []);

  const load = useCallback((pdfData: ArrayBuffer, hash: string) => {
    return new Promise<number>((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) return reject(new Error("Viewer not ready"));
      loadWaiters.current.push({ resolve, reject });
      worker.postMessage({ type: "load", pdfData, hash }, [pdfData]);
    });
  }, []);

  // Memoised as a whole. These go into effect dependency arrays, and a fresh
  // function identity per render restarts the document load on every render —
  // which cancels the one in flight, so the viewer spins forever and never
  // finishes opening anything.
  return useMemo(() => ({
    load,
    render: (pageNum: number, scale: number, hash: string) =>
      ask<ImageBitmap>({ type: "render", pageNum, scale, hash }),
    outline: (hash: string) =>
      ask<{ pageNumber: number; title: string }[]>({ type: "outline", hash }),
    pageText: (pageNum: number, hash: string) =>
      ask<string>({ type: "text", pageNum, hash }),
  }), [load, ask]);
}

// ── The drawing pane ─────────────────────────────────────────────────────────

const RENDER_SCALE = 1.5;

function PlanPane({ doc, page, onPageCount, onPage, onDocumentReady, onSheetVisible, overlay }: {
  doc: Document;
  page: number;
  onPageCount: (pageCount: number) => void;
  onPage: (page: number) => void;
  /** Fires once per document, with the page count and outline. */
  onDocumentReady: (info: { pageCount: number; outline: { pageNumber: number; title: string }[] }) => void;
  /** Fires when a page is shown, with its extracted text, for scale detection. */
  onSheetVisible: (pageNumber: number, text: string) => void;
  /**
   * The tracing layer, drawn over the page at the same size. Given the canvas
   * dimensions so its coordinate space matches the rasterised page exactly —
   * a mismatch here would put every measurement out by a constant factor.
   */
  overlay?: (size: {
    width: number; height: number; renderScale: number;
    canvas: HTMLCanvasElement | null;
  }) => React.ReactNode;
}) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const { load, render, outline, pageText } = usePdfWorker();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pageCount, setPageCount] = useState(doc.pageCount ?? 0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Pages already sent for scale detection, so it runs once each. */
  const detected = useRef(new Set<number>());

  const hash = String(doc.id);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    detected.current.clear();

    (async () => {
      try {
        const resp = await fetch(doc.url);
        if (!resp.ok) throw new Error(`Could not fetch the plan (${resp.status})`);
        const buffer = await resp.arrayBuffer();
        if (cancelled) return;

        const pages = await load(buffer, hash);
        if (cancelled) return;
        setPageCount(pages);
        setLoading(false);
        if (doc.pageCount !== pages) onPageCount(pages);

        // Best-effort: no outline is normal, and must not fail the open.
        const entries = await outline(hash).catch(() => []);
        if (cancelled) return;
        onDocumentReady({ pageCount: pages, outline: entries });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "That plan could not be opened.");
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [doc.id, doc.url, hash, load, outline]);

  // Paint the current page.
  useEffect(() => {
    if (loading || error || pageCount === 0) return;
    let cancelled = false;
    setRendering(true);

    render(page, RENDER_SCALE, hash)
      .then(bitmap => {
        if (cancelled) return bitmap.close();
        const canvas = canvasRef.current;
        if (!canvas) return bitmap.close();
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
        setCanvasSize({ width: bitmap.width, height: bitmap.height });
        bitmap.close();
        setRendering(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "That page could not be drawn.");
        setRendering(false);
      });

    return () => { cancelled = true; };
  }, [page, pageCount, loading, error, render, hash]);

  // Pull the page's text once, for scale detection.
  useEffect(() => {
    if (loading || error || pageCount === 0) return;
    if (detected.current.has(page)) return;
    detected.current.add(page);
    let cancelled = false;

    pageText(page, hash)
      .then(text => { if (!cancelled) onSheetVisible(page, text); })
      // Detection is a convenience. A page whose text will not extract simply
      // stays unscaled until someone sets it.
      .catch(() => {});

    return () => { cancelled = true; };
  }, [page, pageCount, loading, error, pageText, hash, onSheetVisible]);

  const go = useCallback((to: number) => {
    onPage(Math.min(Math.max(to, 1), pageCount || 1));
  }, [pageCount, onPage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault(); go(page + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault(); go(page - 1);
      } else if (e.key === "Home") {
        e.preventDefault(); go(1);
      } else if (e.key === "End") {
        e.preventDefault(); go(pageCount);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, page, pageCount]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <FileText className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">{doc.filename} could not be opened</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        <Button
          size="sm" variant="ghost" className="h-7 w-7 p-0"
          onClick={() => go(page - 1)}
          disabled={loading || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-mono text-xs tabular-nums min-w-[4.5rem] text-center">
          {loading ? "—" : `${page} / ${pageCount}`}
        </span>
        <Button
          size="sm" variant="ghost" className="h-7 w-7 p-0"
          onClick={() => go(page + 1)}
          disabled={loading || page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {rendering && !loading && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Drawing…
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-muted/20 p-4 min-h-0">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">Opening {doc.filename}…</p>
            <p className="text-xs">Large drawings can take a few seconds.</p>
          </div>
        ) : (
          <div className="relative mx-auto w-fit">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto rounded-lg shadow-lg bg-white block"
            />
            {canvasSize.width > 0 && overlay?.({
              ...canvasSize, renderScale: RENDER_SCALE, canvas: canvasRef.current,
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── The page ─────────────────────────────────────────────────────────────────

export default function TakeoffPage({ bidId, onBack }: {
  bidId: number;
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: bid } = trpc.bids.get.useQuery({ id: bidId });
  const { data: docs = [], isLoading } = trpc.bidPdfs.list.useQuery({ bidId });

  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadJob[]>([]);
  /** The transfer in flight, so it can be cancelled. */
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const uploading = uploads.some(u => u.state === "uploading" || u.state === "finishing" || u.state === "waiting");
  const [confirmRemove, setConfirmRemove] = useState<Document | null>(null);
  /**
   * Which sheets state NOT TO SCALE, by sheet id.
   *
   * Per sheet rather than one flag: a single shared value carries the last
   * detection's answer onto whatever sheet is opened next, so a diagram marked
   * N.T.S. makes the plan after it claim the same thing.
   */
  const [notToScaleBySheet, setNotToScaleBySheet] = useState<Record<number, boolean>>({});

  // ── Tracing (phase 2b) ────────────────────────────────────────────────────
  const [tracing, setTracing] = useState(false);
  const [tracePathType, setTracePathType] = useState<RunPathType>("conduit");
  const [tracePoints, setTracePoints] = useState<PagePoint[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  /** The server row this trace is autosaving into, once one exists. */
  const draftRunId = useRef<number | null>(null);
  /** How many points the server has. Drives the unsaved-work warning. */
  const savedPointCount = useRef(0);
  const [recoverable, setRecoverable] = useState<ReturnType<typeof loadDraft>>(null);

  // ── Stamping (phase 2c) ───────────────────────────────────────────────────
  /** The assembly the stamp tool holds. Chosen once, then click, click, click. */
  const [stampAssembly, setStampAssembly] = useState<{ id: number | null; name: string } | null>(null);
  const [selectedStampId, setSelectedStampId] = useState<number | null>(null);
  /** Where a click in the counted-items list sent the viewer. */
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [capturingSymbol, setCapturingSymbol] = useState(false);
  /** The crop taken from the page, awaiting a name. */
  const [pendingCapture, setPendingCapture] = useState<{ thumbnail: string | null } | null>(null);
  /** Clicks not yet confirmed by the server. Mirrored locally; see traceDraft. */
  const pendingStamps = useRef<QueuedStamp[]>([]);
  /** Which layers are showing. Null until a sheet's contents are known. */
  const [layerState, setLayerState] = useState<LayerState | null>(null);
  const hadSystem = useRef<Set<string>>(new Set());
  const hadLocation = useRef<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement | null>(null);

  const doc = docs.find(d => d.id === selectedDocId) ?? docs[0] ?? null;

  const { data: sheets = [], isLoading: sheetsLoading } = trpc.bidPdfs.sheets.useQuery(
    { bidPdfId: doc?.id ?? 0 },
    { enabled: Boolean(doc) }
  );
  const activeSheet = sheets.find(s => s.pageNumber === page) ?? null;

  const refreshSheets = () => {
    if (doc) void utils.bidPdfs.sheets.invalidate({ bidPdfId: doc.id });
  };

  const createTicket = trpc.bidPdfs.createUploadTicket.useMutation();
  const confirmAttach = trpc.bidPdfs.confirmAttach.useMutation();

  const setPageCount = trpc.bidPdfs.setPageCount.useMutation({
    onSuccess: () => void utils.bidPdfs.list.invalidate({ bidId }),
  });

  const remove = trpc.bidPdfs.remove.useMutation({
    onSuccess: () => {
      toast.success("Plan removed from this bid.");
      setSelectedDocId(null);
      setPage(1);
      void utils.bidPdfs.list.invalidate({ bidId });
    },
    onError: error => toast.error(error.message),
  });

  const ensureSheets = trpc.bidPdfs.ensureSheets.useMutation({ onSuccess: refreshSheets });

  const detectScale = trpc.bidPdfs.detectSheetScale.useMutation({
    onSuccess: (result, { id }) => {
      setNotToScaleBySheet(prev => ({ ...prev, [id]: Boolean(result.notToScale) }));
      refreshSheets();
    },
  });

  const renameSheet = trpc.bidPdfs.renameSheet.useMutation({
    // Optimistic: a rename is a one-field edit and must land instantly.
    onMutate: async ({ id, name }) => {
      if (!doc) return {};
      await utils.bidPdfs.sheets.cancel({ bidPdfId: doc.id });
      const snapshot = utils.bidPdfs.sheets.getData({ bidPdfId: doc.id });
      utils.bidPdfs.sheets.setData({ bidPdfId: doc.id }, old =>
        old?.map(s => (s.id === id ? { ...s, name, nameSource: "user" as const } : s))
      );
      return { snapshot };
    },
    onError: (error, _vars, context) => {
      if (context?.snapshot && doc) {
        utils.bidPdfs.sheets.setData({ bidPdfId: doc.id }, context.snapshot);
      }
      toast.error(error.message);
    },
    onSettled: refreshSheets,
  });

  const setSheetScale = trpc.bidPdfs.setSheetScale.useMutation({
    onSuccess: sheet => { toast.success(`Scale set to ${sheet.scaleText}.`); refreshSheets(); },
    onError: error => toast.error(error.message),
  });

  const clearSheetScale = trpc.bidPdfs.clearSheetScale.useMutation({
    onSuccess: refreshSheets,
    onError: error => toast.error(error.message),
  });

  const handleDocumentReady = useCallback(
    (info: { pageCount: number; outline: { pageNumber: number; title: string }[] }) => {
      if (!doc) return;
      ensureSheets.mutate({
        bidPdfId: doc.id,
        pageCount: info.pageCount,
        outline: info.outline,
      });
    },
    [doc?.id]
  );

  // ── Tracing: queries, autosave, recovery ──────────────────────────────────

  const { data: measurability } = trpc.takeoffRuns.measurability.useQuery(
    { sheetId: activeSheet?.id ?? 0 },
    { enabled: Boolean(activeSheet) }
  );
  const { data: runs = [] } = trpc.takeoffRuns.listForSheet.useQuery(
    { sheetId: activeSheet?.id ?? 0 },
    { enabled: Boolean(activeSheet) }
  );
  const { data: totals } = trpc.takeoffRuns.totals.useQuery({ bidId });

  const refreshRuns = useCallback(() => {
    if (activeSheet) void utils.takeoffRuns.listForSheet.invalidate({ sheetId: activeSheet.id });
    void utils.takeoffRuns.totals.invalidate({ bidId });
  }, [utils, activeSheet?.id, bidId]);

  const { data: stamps = [] } = trpc.takeoffStamps.listForSheet.useQuery(
    { sheetId: activeSheet?.id ?? 0 },
    { enabled: Boolean(activeSheet) }
  );
  const { data: symbols = [] } = trpc.takeoffStamps.symbols.useQuery();
  const { data: allAssemblies = [] } = trpc.assemblies.list.useQuery();

  const refreshStamps = useCallback(() => {
    if (activeSheet) {
      void utils.takeoffStamps.listForSheet.invalidate({ sheetId: activeSheet.id });
      void utils.takeoffStamps.countedItems.invalidate({ sheetId: activeSheet.id });
    }
  }, [utils, activeSheet?.id]);

  const dropStamps = trpc.takeoffStamps.drop.useMutation({
    onError: e => toast.error(e.message),
    onSettled: refreshStamps,
  });
  const removeStamp = trpc.takeoffStamps.remove.useMutation({
    onError: e => toast.error(e.message), onSettled: refreshStamps,
  });
  const captureSymbol = trpc.takeoffStamps.captureSymbol.useMutation({
    onError: e => toast.error(e.message),
    onSettled: () => void utils.takeoffStamps.symbols.invalidate(),
  });
  const linkSymbol = trpc.takeoffStamps.linkSymbol.useMutation({
    onError: e => toast.error(e.message),
    onSuccess: r => toast.success(`Linked to ${r.assemblyName} — one click from now on.`),
    onSettled: () => void utils.takeoffStamps.symbols.invalidate(),
  });
  const unlinkSymbol = trpc.takeoffStamps.unlinkSymbol.useMutation({
    onError: e => toast.error(e.message),
    onSettled: () => void utils.takeoffStamps.symbols.invalidate(),
  });
  const removeSymbol = trpc.takeoffStamps.removeSymbol.useMutation({
    onError: e => toast.error(e.message),
    onSettled: () => void utils.takeoffStamps.symbols.invalidate(),
  });

  /**
   * Queue a click and flush shortly after.
   *
   * Queued rather than sent per click: an estimator drops markers faster than a
   * round trip, and a request per click would put the drawing behind the
   * network. The local mirror covers the window where the clicks exist only
   * here.
   */
  const flushTimer = useRef<number | null>(null);
  const queueStamp = useCallback((at: { x: number; y: number }) => {
    if (!activeSheet || !stampAssembly) return;
    pendingStamps.current = [...pendingStamps.current, {
      assemblyId: stampAssembly.id, assemblyName: stampAssembly.name, x: at.x, y: at.y,
    }];
    saveStampQueue(activeSheet.id, bidId, pendingStamps.current);

    if (flushTimer.current !== null) window.clearTimeout(flushTimer.current);
    flushTimer.current = window.setTimeout(() => {
      const batch = pendingStamps.current;
      if (batch.length === 0 || !activeSheet) return;
      pendingStamps.current = [];
      dropStamps.mutate({
        bidId,
        sheetId: activeSheet.id,
        assemblyId: batch[0].assemblyId,
        assemblyName: batch[0].assemblyName,
        at: batch.map(b => ({ x: b.x, y: b.y })),
      }, {
        onSuccess: () => clearStampQueue(activeSheet.id),
        // Put the batch back so it is retried and stays mirrored, rather than
        // vanishing because one request failed.
        onError: () => {
          pendingStamps.current = [...batch, ...pendingStamps.current];
          saveStampQueue(activeSheet.id, bidId, pendingStamps.current);
        },
      });
    }, 700);
  }, [activeSheet?.id, stampAssembly, bidId, dropStamps]);

  /** Recover stamps clicked but never sent, after a crash or reload. */
  useEffect(() => {
    if (!activeSheet) return;
    const queued = loadStampQueue(activeSheet.id);
    if (!queued || queued.stamps.length === 0) return;
    dropStamps.mutate({
      bidId: queued.bidId,
      sheetId: activeSheet.id,
      assemblyId: queued.stamps[0].assemblyId,
      assemblyName: queued.stamps[0].assemblyName,
      at: queued.stamps.map(st => ({ x: st.x, y: st.y })),
    }, {
      onSuccess: () => {
        clearStampQueue(activeSheet.id);
        toast.success(`Recovered ${queued.stamps.length} stamp${queued.stamps.length === 1 ? "" : "s"} from your last session.`);
      },
    });
  }, [activeSheet?.id]);

  /** Escape puts the stamp tool down. */
  useEffect(() => {
    if (!stampAssembly) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setStampAssembly(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stampAssembly]);

  /**
   * Everything on the sheet, expressed on the two layer axes.
   *
   * Stamps carry their assembly's Category (snapshotted at drop time); runs
   * have no assembly and so get their own System keys. One checklist covers
   * the sheet — see shared/takeoffLayers.ts.
   */
  const layeredStamps = useMemo(
    () => stamps.map(st => ({
      ...st,
      systemKey: systemKeyForStamp(st.assemblyCategory),
      location: st.location ?? null,
    })),
    [stamps]
  );
  const layeredRuns = useMemo(
    () => runs.map(run => ({
      ...run,
      systemKey: systemKeyForRun(run.pathType as "conduit" | "cable"),
      location: run.location ?? null,
    })),
    [runs]
  );

  const present = useMemo(
    () => layersPresent([...layeredStamps, ...layeredRuns]),
    [layeredStamps, layeredRuns]
  );

  /**
   * Default every layer on when a sheet's contents change shape.
   *
   * Keyed on the set of layer keys rather than the items: adding a stamp to a
   * system already showing must not reset a filter the user set, but a system
   * appearing for the first time should arrive visible rather than silently
   * hidden.
   */
  const presentKey = useMemo(
    () => [...present.systems.map(s => s.key), "|", ...present.locations.map(l => l.key)].join(","),
    [present]
  );
  useEffect(() => {
    // Snapshot what was present BEFORE updating the refs. The state updater
    // below runs later, and reading a ref that has already been reassigned
    // makes every key look like one we had seen — so nothing gets switched on
    // and a sheet opens with everything hidden.
    const seenSystems = hadSystem.current;
    const seenLocations = hadLocation.current;
    hadSystem.current = new Set(present.systems.map(entry => entry.key));
    hadLocation.current = new Set(present.locations.map(entry => entry.key));

    setLayerState(current => {
      // First sight of this sheet's contents: everything on, per the plan's
      // "Default: all layers on when a sheet is first opened".
      if (!current) return allLayersOn([...layeredStamps, ...layeredRuns]);

      // Otherwise keep the user's choices and switch on anything that has
      // appeared since — a new system arriving hidden would be invisible work.
      const systems = new Set(current.systems);
      const locations = new Set(current.locations);
      for (const entry of present.systems) {
        if (!seenSystems.has(entry.key)) systems.add(entry.key);
      }
      for (const entry of present.locations) {
        if (!seenLocations.has(entry.key)) locations.add(entry.key);
      }
      return { systems, locations };
    });
  }, [presentKey]);

  const effectiveLayers = layerState ?? allLayersOn([...layeredStamps, ...layeredRuns]);

  const visibleStamps = useMemo(
    () => filterByLayers(layeredStamps, effectiveLayers),
    [layeredStamps, effectiveLayers]
  );
  const visibleRuns = useMemo(
    () => filterByLayers(layeredRuns, effectiveLayers),
    [layeredRuns, effectiveLayers]
  );
  const hiddenCount =
    (layeredStamps.length - visibleStamps.length) + (layeredRuns.length - visibleRuns.length);

  const stampGroups = useMemo(
    () => groupStamps(visibleStamps.map(st => ({
      id: st.id, sheetId: st.sheetId, assemblyId: st.assemblyId,
      assemblyName: st.assemblyName, x: st.x, y: st.y,
    }))),
    [visibleStamps]
  );

  const saveRun = trpc.takeoffRuns.save.useMutation({ onError: e => toast.error(e.message) });
  const commitRun = trpc.takeoffRuns.commit.useMutation({
    onError: e => toast.error(e.message),
    onSuccess: result => toast.success(`Run finished — ${result.lengthFeet} ft.`),
    onSettled: refreshRuns,
  });
  const removeRun = trpc.takeoffRuns.remove.useMutation({
    onError: e => toast.error(e.message), onSettled: refreshRuns,
  });
  const acceptSuggestion = trpc.takeoffRuns.acceptSuggestion.useMutation({
    onError: e => toast.error(e.message),
    onSuccess: () => toast.success("Route accepted — finish it to count it."),
    onSettled: refreshRuns,
  });
  const addCircuit = trpc.takeoffRuns.addCircuit.useMutation({
    onError: e => toast.error(e.message), onSettled: refreshRuns,
  });
  const updateCircuit = trpc.takeoffRuns.updateCircuit.useMutation({
    onError: e => toast.error(e.message), onSettled: refreshRuns,
  });
  const removeCircuit = trpc.takeoffRuns.removeCircuit.useMutation({
    onError: e => toast.error(e.message), onSettled: refreshRuns,
  });

  /**
   * Autosave, on a timer while tracing.
   *
   * Every 4 seconds rather than on every click: a click is cheap locally but a
   * round trip per vertex would put a request behind every point of a
   * forty-point run. The localStorage mirror below covers the gap between
   * timer ticks, which is the window a crash would otherwise fall into.
   */
  useEffect(() => {
    if (!tracing || !activeSheet || tracePoints.length < 2) return;
    const timer = window.setInterval(() => {
      if (tracePoints.length === savedPointCount.current) return;
      saveRun.mutate({
        bidId,
        sheetId: activeSheet.id,
        id: draftRunId.current ?? undefined,
        name: draftRunId.current ? `Run ${draftRunId.current}` : `Run on ${activeSheet.name}`,
        pathType: tracePathType,
        points: tracePoints,
        status: "draft",
      }, {
        onSuccess: result => {
          draftRunId.current = result.id;
          savedPointCount.current = tracePoints.length;
          refreshRuns();
        },
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [tracing, activeSheet?.id, tracePoints, tracePathType, bidId]);

  /** The crash mat: mirrored locally on every change, which is nearly free. */
  useEffect(() => {
    if (!tracing || !activeSheet || tracePoints.length < 2) return;
    saveDraft({
      sheetId: activeSheet.id,
      bidId,
      runId: draftRunId.current,
      name: `Run on ${activeSheet.name}`,
      pathType: tracePathType,
      points: tracePoints,
    });
  }, [tracing, activeSheet?.id, tracePoints, tracePathType, bidId]);

  /** Offer to restore a stranded local draft when a sheet opens. */
  useEffect(() => {
    if (!activeSheet || tracing) return;
    setRecoverable(loadDraft(activeSheet.id));
  }, [activeSheet?.id, tracing]);

  /**
   * Warn on the way out with work in the gap between autosaves.
   *
   * The browser shows its own generic wording; what matters is that the prompt
   * appears at all, and only when something would genuinely be lost.
   */
  useEffect(() => {
    if (!tracing) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedWork(tracePoints, savedPointCount.current)) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [tracing, tracePoints]);

  const startTracing = useCallback((pathType: RunPathType) => {
    setTracePathType(pathType);
    setTracePoints([]);
    draftRunId.current = null;
    savedPointCount.current = 0;
    setTracing(true);
    setSelectedRunId(null);
  }, []);

  const finishTrace = useCallback(() => {
    if (!activeSheet || tracePoints.length < 2) return;
    saveRun.mutate({
      bidId,
      sheetId: activeSheet.id,
      id: draftRunId.current ?? undefined,
      name: `Run on ${activeSheet.name}`,
      pathType: tracePathType,
      points: tracePoints,
      status: "draft",
    }, {
      onSuccess: result => {
        commitRun.mutate({ id: result.id });
        clearDraft(activeSheet.id);
        setTracing(false);
        setTracePoints([]);
        draftRunId.current = null;
        savedPointCount.current = 0;
        setRecoverable(null);
      },
    });
  }, [activeSheet, tracePoints, tracePathType, bidId, saveRun, commitRun]);

  const cancelTrace = useCallback(() => {
    if (activeSheet) clearDraft(activeSheet.id);
    setTracing(false);
    setTracePoints([]);
    draftRunId.current = null;
    savedPointCount.current = 0;
  }, [activeSheet?.id]);

  const handleSheetVisible = useCallback((pageNumber: number, text: string) => {
    const sheet = sheets.find(s => s.pageNumber === pageNumber);
    // Nothing to attach a reading to yet; ensureSheets is still in flight and
    // this page's text will be re-read the next time it is shown.
    if (!sheet) return;
    if (sheet.scaleSource !== "none") return;
    detectScale.mutate({ id: sheet.id, sheetText: text });
  }, [sheets]);

  /**
   * Attach files: check, ticket, upload straight to storage, confirm.
   *
   * One at a time rather than in parallel. A 150MB set uploading alongside two
   * others gives three progress bars all crawling and a saturated connection;
   * sequential means the first sheet is usable while the rest arrive.
   */
  const acceptFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const queue = Array.from(files);
    setUploads(queue.map(f => ({ filename: f.name, byteSize: f.size, sent: 0, state: "waiting" })));

    for (let i = 0; i < queue.length; i++) {
      const file = queue[i];
      const setState = (patch: Partial<UploadJob>) =>
        setUploads(prev => prev.map((u, n) => (n === i ? { ...u, ...patch } : u)));

      // Cheap checks first, so an obviously wrong file fails instantly rather
      // than after a long upload.
      const check = checkPdfUpload({ filename: file.name, byteSize: file.size });
      if (!check.ok) {
        setState({ state: "failed", error: check.message });
        toast.error(check.message);
        continue;
      }

      // The magic bytes, read from the first few bytes of the file rather than
      // the whole thing. Catches a document renamed to .pdf, which otherwise
      // uploads perfectly and then fails to open with nothing explaining why.
      const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (!looksLikePdf(head)) {
        const message = `${file.name} is not a PDF inside, whatever it is named. Export a real PDF and try again.`;
        setState({ state: "failed", error: message });
        toast.error(message);
        continue;
      }

      try {
        setState({ state: "uploading" });
        const ticket = await createTicket.mutateAsync({
          bidId, filename: file.name, byteSize: file.size,
        });

        // XHR rather than fetch: fetch cannot report upload progress, and a
        // 150MB transfer with no feedback is indistinguishable from a hang.
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;
          xhr.open("PUT", ticket.uploadUrl, true);
          xhr.setRequestHeader("Content-Type", "application/pdf");
          xhr.upload.onprogress = e => {
            if (e.lengthComputable) setState({ sent: e.loaded });
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Storage refused the upload (${xhr.status}).`));
          };
          xhr.onerror = () => reject(new Error("The connection dropped during upload."));
          xhr.onabort = () => reject(new Error("Upload cancelled."));
          xhr.send(file);
        });
        xhrRef.current = null;

        setState({ state: "finishing", sent: file.size });
        const attached = await confirmAttach.mutateAsync({
          bidId,
          filename: file.name,
          storageKey: ticket.storageKey,
          byteSize: file.size,
        });

        setState({ state: "done" });
        setSelectedDocId(attached.id);
        setPage(1);
        void utils.bidPdfs.list.invalidate({ bidId });
        toast.success(`${attached.filename} attached.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "That file could not be attached.";
        setState({ state: "failed", error: message });
        toast.error(message);
      }
    }

    // Clear only what succeeded; a failure stays on screen with its reason.
    setUploads(prev => prev.filter(u => u.state === "failed"));
    if (fileInput.current) fileInput.current.value = "";
  }, [bidId, createTicket, confirmAttach, utils]);

  const cancelUpload = useCallback(() => {
    xhrRef.current?.abort();
    xhrRef.current = null;
  }, []);

  return (
    <div
      className="flex flex-col h-full bg-background"
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={e => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        void acceptFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={e => void acceptFiles(e.target.files)}
      />

      <div className="border-b border-border px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={onBack}>
            <ArrowLeft className="w-3.5 h-3.5" /> Bid
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">
              Plans{bid?.bid?.name ? ` — ${bid.bid.name}` : ""}
            </h1>
            <p className="text-xs text-muted-foreground">
              Pick a sheet, set its scale. Measuring and counting come next.
            </p>
          </div>
          {docs.length > 0 && (
            <Button
              size="sm" className="h-8 gap-1.5 text-xs"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                : <><Plus className="w-3.5 h-3.5" /> Add PDF</>}
            </Button>
          )}
        </div>
      </div>

      {/* Above the workspace rather than inside the empty state, so it is in
          the same place whether this is the first plan or the tenth. */}
      <UploadProgress
        jobs={uploads}
        onCancel={cancelUpload}
        onDismiss={index => setUploads(prev => prev.filter((_, n) => n !== index))}
      />

      {isLoading ? (
        <div className="flex-1 p-6">
          <div className="h-full rounded-xl border border-border bg-card animate-pulse" />
        </div>
      ) : docs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className={cn(
              "w-full max-w-lg rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
              "hover:border-[#F5C518] hover:bg-[#F5C518]/5 focus-visible:outline-none",
              "focus-visible:border-[#F5C518] focus-visible:bg-[#F5C518]/5",
              dragging ? "border-[#F5C518] bg-[#F5C518]/10" : "border-border bg-card"
            )}
          >
            {uploading ? (
              <Loader2 className="w-9 h-9 mx-auto mb-4 animate-spin text-[#F5C518]" />
            ) : (
              <Upload className="w-9 h-9 mx-auto mb-4 text-muted-foreground" />
            )}
            <p className="text-base font-medium">
              {dragging ? "Drop to attach" : "Drop plan PDFs here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1.5">
              or click to choose files from this computer
            </p>
            <p className="text-xs text-muted-foreground/70 mt-4">
              PDFs only, up to {formatBytes(MAX_PDF_BYTES)} each. Attach as many sheets as the job has.
            </p>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Documents, then the sheets within the chosen one. Docked rather
              than a drawer: choosing a sheet is the most frequent action here
              and a drawer would put a click in front of every one. */}
          <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col min-h-0">
            <div className="border-b border-border shrink-0 max-h-44 overflow-y-auto">
              <div className="px-3 py-2 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                {docs.length} {docs.length === 1 ? "document" : "documents"}
              </div>
              {docs.map(d => (
                <div
                  key={d.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setSelectedDocId(d.id); setPage(1); }}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault(); setSelectedDocId(d.id); setPage(1);
                    }
                  }}
                  className={cn(
                    "group flex items-start gap-2 px-3 py-2 cursor-pointer border-l-2 transition-colors",
                    doc?.id === d.id
                      ? "border-l-[#F5C518] bg-[#F5C518]/5"
                      : "border-l-transparent hover:bg-muted/50"
                  )}
                >
                  <FileText className={cn(
                    "w-3.5 h-3.5 mt-0.5 shrink-0",
                    doc?.id === d.id ? "text-[#F5C518]" : "text-muted-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" title={d.filename}>{d.filename}</p>
                    <p className="text-[0.7rem] text-muted-foreground">
                      {d.pageCount ? `${d.pageCount} pages · ` : ""}{formatBytes(d.byteSize)}
                    </p>
                  </div>
                  <Button
                    size="sm" variant="ghost"
                    className="h-5 w-5 p-0 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={e => { e.stopPropagation(); setConfirmRemove(d); }}
                    aria-label={`Remove ${d.filename}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex-1 min-h-0">
              <SheetIndex
                sheets={sheets}
                activePage={page}
                loading={sheetsLoading}
                onOpenPage={setPage}
                onRename={(sheetId, name) => renameSheet.mutate({ id: sheetId, name })}
              />
            </div>
          </aside>

          {/* The split: drawing on the left, work pane on the right. Built now
              so the counted-items list and legend land in a structure that
              exists, rather than as a drawer bolted on later. */}
          <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
            <ResizablePanel defaultSize={68} minSize={35} className="flex flex-col min-w-0">
              {doc && (
                <>
                  <PlanPane
                    key={doc.id}
                    doc={doc}
                    page={page}
                    onPage={setPage}
                    onPageCount={pageCount => setPageCount.mutate({ id: doc.id, pageCount })}
                    onDocumentReady={handleDocumentReady}
                    onSheetVisible={handleSheetVisible}
                    overlay={size => measurability ? (
                      <>
                      {capturingSymbol && (
                        <SymbolCaptureLayer
                          width={size.width}
                          height={size.height}
                          renderScale={size.renderScale}
                          onCancel={() => setCapturingSymbol(false)}
                          onRegion={(region: CaptureRegion) => {
                            const thumbnail = size.canvas
                              ? cropToThumbnail(size.canvas, region, size.renderScale)
                              : null;
                            setCapturingSymbol(false);
                            setPendingCapture({ thumbnail });
                          }}
                        />
                      )}
                      {pendingCapture && (
                        <SymbolCaptureForm
                          thumbnail={pendingCapture.thumbnail}
                          onCancel={() => setPendingCapture(null)}
                          onSave={label => {
                            captureSymbol.mutate({
                              label,
                              thumbnail: pendingCapture.thumbnail,
                              capturedFromSheetId: activeSheet?.id,
                            }, {
                              onSuccess: r => toast.success(r.alreadyKnown
                                ? "Already in your legend."
                                : "Captured — click it to choose an assembly."),
                            });
                            setPendingCapture(null);
                          }}
                        />
                      )}
                      <TraceLayer
                        width={size.width}
                        height={size.height}
                        renderScale={size.renderScale}
                        measurability={measurability}
                        tracing={tracing}
                        pathType={tracePathType}
                        points={tracePoints}
                        onPointsChange={setTracePoints}
                        existingRuns={visibleRuns}
                        onFinish={finishTrace}
                        onCancel={cancelTrace}
                        selectedRunId={selectedRunId}
                        onSelectRun={setSelectedRunId}
                        stamping={Boolean(stampAssembly) && !tracing}
                        stampAssemblyName={stampAssembly?.name ?? null}
                        stamps={visibleStamps.map(st => ({
                          id: st.id, assemblyName: st.assemblyName, x: st.x, y: st.y,
                        }))}
                        onDropStamp={queueStamp}
                        selectedStampId={selectedStampId}
                        onSelectStamp={setSelectedStampId}
                        focusPoint={focusPoint}
                      />
                      </>
                    ) : null}
                  />
                  {/* Rendered under the pager rather than inside PlanPane so
                      the sheet row (and its mutations) stay owned here. */}
                  {activeSheet && (
                    <div className="border-t border-border bg-card px-3 py-1.5 shrink-0 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground truncate max-w-[14rem]">
                        {activeSheet.name}
                      </span>
                      <div className="w-px h-4 bg-border" />
                      {/* Tracing is offered only when the sheet can actually
                          be measured — an enabled tool that produces no number
                          teaches people the app is broken. */}
                      {measurability?.ok && !tracing && (
                        <>
                          <Button
                            size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                            onClick={() => startTracing("conduit")}
                          >
                            <Zap className="w-3.5 h-3.5 text-[#F5C518]" /> Trace conduit
                          </Button>
                          <Button
                            size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                            onClick={() => startTracing("cable")}
                          >
                            <Cable className="w-3.5 h-3.5 text-emerald-400" /> Trace cable
                          </Button>
                          {stampAssembly ? (
                            <Button
                              size="sm" className="h-7 gap-1.5 text-xs"
                              onClick={() => setStampAssembly(null)}
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              Stamping {stampAssembly.name}
                              <X className="w-3 h-3" />
                            </Button>
                          ) : null}
                          <div className="w-px h-4 bg-border" />
                        </>
                      )}

                      <ScaleControl
                        sheet={activeSheet}
                        notToScale={notToScaleBySheet[activeSheet.id] ?? false}
                        onSet={scaleText => setSheetScale.mutate({ id: activeSheet.id, scaleText })}
                        onClear={() => clearSheetScale.mutate({ id: activeSheet.id })}
                      />
                    </div>
                  )}
                </>
              )}
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={32} minSize={18} className="min-w-0">
              <RunsPanel
                runs={visibleRuns.map(r => ({ ...r, firstPoint: r.points[0] ?? null }))}
                stampGroups={stampGroups}
                onJumpTo={at => {
                  setFocusPoint(at);
                  // Clear the highlight after a moment — a marker that stays
                  // ringed forever stops meaning "this is the one".
                  window.setTimeout(() => setFocusPoint(null), 2200);
                }}
                onRemoveStamp={id => removeStamp.mutate({ id })}
                legend={
                  <>
                  <LayersPanel
                    present={present}
                    state={effectiveLayers}
                    onChange={update => setLayerState(previous =>
                      update(previous ?? allLayersOn([...layeredStamps, ...layeredRuns]))
                    )}
                    filtered={hiddenCount > 0}
                    hiddenCount={hiddenCount}
                  />
                  <LegendPanel
                    symbols={symbols}
                    assemblies={allAssemblies.map(a => ({
                      id: a.id, name: a.name, category: a.category,
                    }))}
                    activeAssemblyId={stampAssembly?.id ?? null}
                    capturing={capturingSymbol}
                    onStartCapture={() => setCapturingSymbol(true)}
                    onCancelCapture={() => setCapturingSymbol(false)}
                    onLink={(symbolId, assemblyId) => linkSymbol.mutate({ id: symbolId, assemblyId })}
                    onUnlink={id => unlinkSymbol.mutate({ id })}
                    onRemove={id => removeSymbol.mutate({ id })}
                    onUseSymbol={symbol => {
                      const assembly = allAssemblies.find(a => a.id === symbol.assemblyId);
                      if (!assembly) return;
                      setStampAssembly({ id: assembly.id, name: assembly.name });
                      toast.success(`Stamping ${assembly.name} — click to place.`);
                    }}
                  />
                  </>
                }
                totals={totals}
                selectedRunId={selectedRunId}
                onSelectRun={setSelectedRunId}
                onRemoveRun={id => removeRun.mutate({ id })}
                onCommitRun={id => commitRun.mutate({ id })}
                onAcceptSuggestion={id => acceptSuggestion.mutate({ id })}
                onAddCircuit={(runId, name, conductorCount) =>
                  addCircuit.mutate({ runId, name, conductorCount })}
                onUpdateCircuit={(id, conductorCount) =>
                  updateCircuit.mutate({ id, conductorCount })}
                onRemoveCircuit={id => removeCircuit.mutate({ id })}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {dragging && docs.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 pointer-events-none">
          <div className="rounded-2xl border-2 border-dashed border-[#F5C518] bg-card px-10 py-8 text-center">
            <Upload className="w-9 h-9 mx-auto mb-3 text-[#F5C518]" />
            <p className="text-base font-medium">Drop to attach to this bid</p>
          </div>
        </div>
      )}

      <AlertDialog open={confirmRemove !== null} onOpenChange={open => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove?.filename} will be detached from this bid straight away, along with
              its sheet names and scales. The bid itself, and everything priced on it, is
              untouched. You can attach the file again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmRemove) remove.mutate({ id: confirmRemove.id });
                setConfirmRemove(null);
              }}
            >
              Remove plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
