/**
 * Turning the page the viewer already drew into something the plan reader can
 * be sent.
 *
 * ── Reuse the raster, do not make a second one ───────────────────────────────
 * The worker has already spent 0.5–13 seconds rasterising this page. Rendering
 * it again at a different scale to feed the reader would pay that twice and put
 * a second decode on the main thread, so the canvas on screen IS the source.
 *
 * ── Why it is downscaled ────────────────────────────────────────────────────
 * A full-size E-sheet at 1.5× is several thousand pixels on the long edge and a
 * multi-megabyte PNG. The upload is the slow part of a read, and past roughly
 * 1600px the extra pixels stop telling a vision model anything it did not
 * already have — a symbol that is illegible at 1600px is usually illegible on
 * the drawing too, and it is supposed to come back flagged rather than guessed.
 *
 * JPEG rather than PNG for the same reason: line art compresses badly as JPEG
 * in theory and still lands far smaller in practice, and the quality here is
 * chosen to stay above the point where compression artefacts start inventing
 * marks.
 */

/** Longest edge, in pixels, of the image the reader is sent. */
export const SNAPSHOT_MAX_EDGE = 1600;

/** JPEG quality. High enough that compression does not create device symbols. */
export const SNAPSHOT_QUALITY = 0.82;

export type PlanSnapshot = {
  /** A data URL, ready to hand to the server. */
  image: string;
  /** The page's real size in PDF points, so 0–1 positions become page points. */
  pageWidthPoints: number;
  pageHeightPoints: number;
};

/**
 * Snapshot the drawn page.
 *
 * Returns null rather than throwing when the canvas is not ready or the browser
 * refuses to export it: a page that cannot be snapshotted simply cannot be read
 * yet, and the panel says so. Nothing else on the screen depends on this.
 */
export function snapshotPage(
  canvas: HTMLCanvasElement | null,
  renderScale: number
): PlanSnapshot | null {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
  if (!Number.isFinite(renderScale) || renderScale <= 0) return null;

  const scale = Math.min(
    1,
    SNAPSHOT_MAX_EDGE / Math.max(canvas.width, canvas.height)
  );
  const width = Math.max(1, Math.round(canvas.width * scale));
  const height = Math.max(1, Math.round(canvas.height * scale));

  try {
    const target = document.createElement("canvas");
    target.width = width;
    target.height = height;
    const context = target.getContext("2d");
    if (!context) return null;
    // White underneath: a JPEG has no alpha, and an unpainted background
    // exports as black, which turns a plan into a negative.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(canvas, 0, 0, width, height);

    return {
      image: target.toDataURL("image/jpeg", SNAPSHOT_QUALITY),
      pageWidthPoints: canvas.width / renderScale,
      pageHeightPoints: canvas.height / renderScale,
    };
  } catch {
    return null;
  }
}
