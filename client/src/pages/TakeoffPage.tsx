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
  ArrowLeft, ChevronLeft, ChevronRight, FileText, ListChecks, Loader2, Plus,
  Trash2, Upload,
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

/** Mirrors MAX_PDF_BYTES in bidPdfsRouter — refuse locally before uploading. */
const MAX_PDF_BYTES = 30 * 1024 * 1024;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function PlanPane({ doc, page, onPageCount, onPage, onDocumentReady, onSheetVisible }: {
  doc: Document;
  page: number;
  onPageCount: (pageCount: number) => void;
  onPage: (page: number) => void;
  /** Fires once per document, with the page count and outline. */
  onDocumentReady: (info: { pageCount: number; outline: { pageNumber: number; title: string }[] }) => void;
  /** Fires when a page is shown, with its extracted text, for scale detection. */
  onSheetVisible: (pageNumber: number, text: string) => void;
}) {
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

    render(page, 1.5, hash)
      .then(bitmap => {
        if (cancelled) return bitmap.close();
        const canvas = canvasRef.current;
        if (!canvas) return bitmap.close();
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
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
          <canvas
            ref={canvasRef}
            className="mx-auto max-w-full h-auto rounded-lg shadow-lg bg-white"
          />
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
  const [uploading, setUploading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Document | null>(null);
  /**
   * Which sheets state NOT TO SCALE, by sheet id.
   *
   * Per sheet rather than one flag: a single shared value carries the last
   * detection's answer onto whatever sheet is opened next, so a diagram marked
   * N.T.S. makes the plan after it claim the same thing.
   */
  const [notToScaleBySheet, setNotToScaleBySheet] = useState<Record<number, boolean>>({});
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

  const attach = trpc.bidPdfs.attach.useMutation({
    onSuccess: attached => {
      toast.success(`${attached.filename} attached.`);
      setSelectedDocId(attached.id);
      setPage(1);
      void utils.bidPdfs.list.invalidate({ bidId });
    },
    onError: error => toast.error(error.message),
  });

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

  const handleSheetVisible = useCallback((pageNumber: number, text: string) => {
    const sheet = sheets.find(s => s.pageNumber === pageNumber);
    // Nothing to attach a reading to yet; ensureSheets is still in flight and
    // this page's text will be re-read the next time it is shown.
    if (!sheet) return;
    if (sheet.scaleSource !== "none") return;
    detectScale.mutate({ id: sheet.id, sheetText: text });
  }, [sheets]);

  const acceptFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
          toast.error(`${file.name} is not a PDF. Plans must be PDFs.`);
          continue;
        }
        if (file.size > MAX_PDF_BYTES) {
          toast.error(
            `${file.name} is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_PDF_BYTES)}.`
          );
          continue;
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
          reader.readAsDataURL(file);
        });
        await attach.mutateAsync({ bidId, dataUrl, filename: file.name });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That file could not be attached.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }, [attach, bidId]);

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
                  />
                  {/* Rendered under the pager rather than inside PlanPane so
                      the sheet row (and its mutations) stay owned here. */}
                  {activeSheet && (
                    <div className="border-t border-border bg-card px-3 py-1.5 shrink-0 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground truncate max-w-[14rem]">
                        {activeSheet.name}
                      </span>
                      <div className="w-px h-4 bg-border" />
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
              <div className="h-full flex flex-col bg-card border-l border-border">
                <div className="px-3 py-2 border-b border-border shrink-0">
                  <div className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    <ListChecks className="w-3 h-3" /> Counted items
                  </div>
                </div>
                {/* Says what is coming, so an empty half-screen reads as
                    reserved rather than as something failing to render. */}
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center max-w-[15rem]">
                    <ListChecks className="w-7 h-7 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-muted-foreground">Nothing counted yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1.5">
                      Items you stamp on the plan will appear here as you go, with a running
                      total. Set each sheet's scale first — measuring depends on it.
                    </p>
                  </div>
                </div>
              </div>
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
