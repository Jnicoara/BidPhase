/**
 * PDF Renderer Web Worker
 *
 * Runs pdfjs page rendering on a dedicated thread so the main thread stays
 * completely responsive during PDF rasterization (which can take 2-13 seconds
 * on complex electrical drawings).
 *
 * Protocol:
 *   Main → Worker:  { type: 'load', pdfData: ArrayBuffer, hash: string }
 *   Main → Worker:  { type: 'render', pageNum: number, scale: number, hash: string, reqId: string }
 *   Worker → Main:  { type: 'rendered', reqId: string, bitmap: ImageBitmap, pageNum: number, hash: string }
 *   Worker → Main:  { type: 'error', reqId: string, message: string }
 */

import * as pdfjs from "pdfjs-dist";

// pdfjs needs a real worker entry, even from inside a worker.
//
// This was `= ""`, which older pdfjs read as "do the work in this thread".
// pdfjs 5 rejects an empty value outright — `getDocument` throws
// `No "GlobalWorkerOptions.workerSrc" specified` — so every load through here
// failed and callers fell back to rendering on the main thread, which is the
// one thing this worker exists to prevent.
//
// Pointing at the real module spawns a nested worker, which Chrome supports,
// and matches what PlanPanel and PlanViewer already set on the main thread.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

let pdfDoc: import("pdfjs-dist").PDFDocumentProxy | null = null;
let loadedHash: string | null = null;

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === "load") {
    // Load the PDF document from ArrayBuffer
    try {
      const t0 = performance.now();
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(msg.pdfData) });
      pdfDoc = await loadingTask.promise;
      loadedHash = msg.hash;
      const elapsed = (performance.now() - t0).toFixed(0);
      self.postMessage({ type: "loaded", hash: msg.hash, numPages: pdfDoc.numPages, elapsed });
    } catch (err) {
      self.postMessage({ type: "error", reqId: msg.reqId, message: String(err) });
    }
    return;
  }

  if (msg.type === "render") {
    const { pageNum, scale, hash, reqId } = msg;
    if (!pdfDoc || loadedHash !== hash) {
      self.postMessage({ type: "error", reqId, message: "PDF not loaded for this hash" });
      return;
    }
    try {
      const t0 = performance.now();
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const offscreen = new OffscreenCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height)
      );
      const ctx = offscreen.getContext("2d")!;
      await page.render({
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        canvas: null as unknown as HTMLCanvasElement,
        viewport,
      }).promise;
      const bitmap = await createImageBitmap(offscreen);
      const elapsed = (performance.now() - t0).toFixed(0);
      // Transfer the bitmap to the main thread (zero-copy)
      // Use structured transfer options for worker context
      (self as unknown as Worker).postMessage(
        { type: "rendered", reqId, pageNum, hash, bitmap, elapsed },
        { transfer: [bitmap] }
      );
    } catch (err) {
      self.postMessage({ type: "error", reqId, message: String(err) });
    }
  }
};
