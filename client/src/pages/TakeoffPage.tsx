/**
 * TakeoffPage — plans attached to a bid. Redesign phase 1: attach and read.
 *
 * A fresh build, not a reworking of the legacy takeoff screen. Phase 1 covers
 * exactly two things — get PDFs onto a bid, and page through them — so that the
 * later phases (split view, sheet index, scale detection, legend, stamps) land
 * on a foundation rather than beside one. No measuring tools here yet.
 *
 * ── Designed to be worked out, not learned ───────────────────────────────────
 * The reader is an estimator opening this for the first time with a job to
 * price, so every affordance is stated rather than implied:
 *
 *   • With nothing attached, the empty state IS the drop target — one large
 *     labelled area that also takes a click, instead of a small button beside
 *     an explanation of what the button does.
 *   • The whole panel accepts a dragged file at any time, and says so only
 *     while a file is actually over it, so the hint arrives exactly when it is
 *     true and never as decoration.
 *   • Paging shows "3 / 18" next to the arrows rather than arrows alone, so the
 *     size of the set is visible before you start clicking through it.
 *   • Arrow keys, Page Up/Down, Home and End all page. Someone who tries the
 *     keyboard should not have to discover that only one of those works.
 *
 * ── Rendering ────────────────────────────────────────────────────────────────
 * Page rasterisation goes through the shared pdfRenderer worker, the same one
 * the legacy viewer uses, because a dense electrical sheet takes 0.5–13s to
 * render and doing that on the main thread freezes the app. The worker owns
 * pdfjs; this file only asks for bitmaps and paints them. Per the standing
 * rules, that genuinely slow work gets an honest indicator — everything else
 * here shows nothing.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ChevronLeft, ChevronRight, FileText, Loader2, Plus, Trash2, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Mirrors MAX_PDF_BYTES in bidPdfsRouter — refuse locally before the upload. */
const MAX_PDF_BYTES = 30 * 1024 * 1024;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

type Sheet = {
  id: number;
  filename: string;
  byteSize: number;
  pageCount: number | null;
  url: string;
};

// ── Worker plumbing ──────────────────────────────────────────────────────────

type RenderRequest = { reqId: string; resolve: (b: ImageBitmap) => void; reject: (e: Error) => void };

/**
 * One worker for this screen, torn down with it.
 *
 * Deliberately not the module-level singleton the legacy viewer keeps: this
 * page owns its document, and leaving a loaded PDF resident after the user
 * navigates away holds its decoded pages in memory for no one.
 */
function usePdfWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef(new Map<string, RenderRequest>());
  const loadWaiters = useRef<((pages: number) => void)[]>([]);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/pdfRenderer.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "loaded") {
        loadWaiters.current.splice(0).forEach(resolve => resolve(msg.numPages));
        return;
      }
      if (msg.type === "rendered") {
        pending.current.get(msg.reqId)?.resolve(msg.bitmap);
        pending.current.delete(msg.reqId);
        return;
      }
      if (msg.type === "error") {
        pending.current.get(msg.reqId)?.reject(new Error(msg.message));
        pending.current.delete(msg.reqId);
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

  const load = useCallback((pdfData: ArrayBuffer, hash: string) => {
    return new Promise<number>((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) return reject(new Error("Viewer not ready"));
      loadWaiters.current.push(resolve);
      worker.postMessage({ type: "load", pdfData, hash }, [pdfData]);
    });
  }, []);

  const render = useCallback((pageNum: number, scale: number, hash: string) => {
    return new Promise<ImageBitmap>((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) return reject(new Error("Viewer not ready"));
      const reqId = `${hash}:${pageNum}:${scale}:${Math.random()}`;
      pending.current.set(reqId, { reqId, resolve, reject });
      worker.postMessage({ type: "render", pageNum, scale, hash, reqId });
    });
  }, []);

  return { load, render };
}

// ── The viewer ───────────────────────────────────────────────────────────────

function SheetViewer({ sheet, onPageCount }: {
  sheet: Sheet;
  onPageCount: (pageCount: number) => void;
}) {
  const { load, render } = usePdfWorker();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pageCount, setPageCount] = useState(sheet.pageCount ?? 0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch + hand to the worker whenever the chosen sheet changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(1);

    (async () => {
      try {
        const resp = await fetch(sheet.url);
        if (!resp.ok) throw new Error(`Could not fetch the plan (${resp.status})`);
        const buffer = await resp.arrayBuffer();
        if (cancelled) return;
        const pages = await load(buffer, String(sheet.id));
        if (cancelled) return;
        setPageCount(pages);
        setLoading(false);
        // Record it once, so the sheet list can show "18 pages" without
        // anyone having to open the file again.
        if (sheet.pageCount !== pages) onPageCount(pages);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "That plan could not be opened.");
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sheet.id, sheet.url, load]);

  // Paint the current page.
  useEffect(() => {
    if (loading || error || pageCount === 0) return;
    let cancelled = false;
    setRendering(true);

    render(page, 1.5, String(sheet.id))
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
  }, [page, pageCount, loading, error, render, sheet.id]);

  const go = useCallback((to: number) => {
    setPage(current => {
      const next = Math.min(Math.max(to, 1), pageCount || 1);
      return next === current ? current : next;
    });
  }, [pageCount]);

  // Every key someone might reasonably try, not just the one we thought of.
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
          <p className="text-sm font-medium">{sheet.filename} could not be opened</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Paging bar. Position and total together, so the size of the set is
          visible before you start clicking through it. */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card shrink-0">
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

        <span className="text-xs text-muted-foreground truncate ml-2">{sheet.filename}</span>

        {rendering && !loading && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Drawing…
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-muted/20 p-4">
        {loading ? (
          // An honest indicator: opening a dense sheet set is genuinely slow.
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">Opening {sheet.filename}…</p>
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
  const { data: sheets = [], isLoading } = trpc.bidPdfs.list.useQuery({ bidId });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Sheet | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  // Open the first sheet by default: an attached plan you still have to click
  // to see is a plan the user has to be told about.
  const selected = sheets.find(s => s.id === selectedId) ?? sheets[0] ?? null;

  const attach = trpc.bidPdfs.attach.useMutation({
    onSuccess: sheet => {
      toast.success(`${sheet.filename} attached.`);
      setSelectedId(sheet.id);
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
      setSelectedId(null);
      void utils.bidPdfs.list.invalidate({ bidId });
    },
    onError: error => toast.error(error.message),
  });

  const acceptFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Checked here as well as on the server so the user hears about it
        // before waiting through an upload that was always going to fail.
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
      onDragLeave={e => {
        // Only when the pointer actually leaves the page, not on every child.
        if (e.currentTarget === e.target) setDragging(false);
      }}
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

      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={onBack}>
            <ArrowLeft className="w-3.5 h-3.5" /> Bid
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">
              Plans{bid?.bid?.name ? ` — ${bid.bid.name}` : ""}
            </h1>
            <p className="text-xs text-muted-foreground">
              Attach the PDFs for this job and read through them here. Measuring tools come next.
            </p>
          </div>
          {sheets.length > 0 && (
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
      ) : sheets.length === 0 ? (
        // The empty state IS the target — one large labelled area that takes a
        // drop or a click, rather than a small button next to a paragraph.
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
          {/* Sheet list. Narrow, always visible, so switching sheets is one
              click and the size of the set is never hidden behind a menu. */}
          <aside className="w-64 shrink-0 border-r border-border bg-card overflow-y-auto">
            <div className="px-3 py-2 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              {sheets.length} {sheets.length === 1 ? "plan" : "plans"}
            </div>
            {sheets.map(sheet => {
              const isSelected = selected?.id === sheet.id;
              return (
                <div
                  key={sheet.id}
                  className={cn(
                    "group flex items-start gap-2 px-3 py-2.5 cursor-pointer border-l-2 transition-colors",
                    isSelected
                      ? "border-l-[#F5C518] bg-[#F5C518]/5"
                      : "border-l-transparent hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedId(sheet.id)}
                >
                  <FileText className={cn(
                    "w-4 h-4 mt-0.5 shrink-0",
                    isSelected ? "text-[#F5C518]" : "text-muted-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" title={sheet.filename}>{sheet.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {/* A blank rather than "0 pages" until it has been
                          opened — an unread file and an empty one must not
                          look alike. */}
                      {sheet.pageCount ? `${sheet.pageCount} pages · ` : ""}
                      {formatBytes(sheet.byteSize)}
                    </p>
                  </div>
                  <Button
                    size="sm" variant="ghost"
                    className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={e => { e.stopPropagation(); setConfirmRemove(sheet); }}
                    aria-label={`Remove ${sheet.filename}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </aside>

          {selected && (
            <SheetViewer
              key={selected.id}
              sheet={selected}
              onPageCount={pageCount => setPageCount.mutate({ id: selected.id, pageCount })}
            />
          )}
        </div>
      )}

      {/* Only while a file is genuinely over the window, so the hint is never
          decoration sitting there when it does not apply. */}
      {dragging && sheets.length > 0 && (
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
              {confirmRemove?.filename} will be detached from this bid straight away. The bid
              itself, and everything priced on it, is untouched. You can attach the file again.
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
