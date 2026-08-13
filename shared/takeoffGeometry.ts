/**
 * Turning clicks on a drawing into a real-world length.
 *
 * This is the highest-stakes arithmetic in the app. Every figure it produces
 * becomes conduit and wire on a bid, and a systematic error here is invisible:
 * a run measured 15% long looks exactly like a run measured correctly. So the
 * whole calculation lives here as pure functions over explicit units, with no
 * DOM, no React and no database — and it is tested far past the point that
 * feels necessary.
 *
 * ── Units, stated once so nothing has to guess ───────────────────────────────
 * Three different lengths are in play and conflating any two is how a bill of
 * materials goes wrong:
 *
 *   PAGE POINTS   what a PDF is measured in. 72 to the inch, always, by the
 *                 PDF specification. A point here is a point ON THE PAPER, not
 *                 a pixel on screen.
 *   PAPER INCHES  page points ÷ 72. What you would measure with a ruler held
 *                 against a printed sheet.
 *   REAL INCHES   paper inches × the sheet's scale ratio. The building.
 *
 * Screen pixels are deliberately NOT one of these. The viewer renders at some
 * zoom factor, and a length measured in rendered pixels is meaningless until
 * that factor is divided out — so callers convert at the boundary
 * (`screenToPagePoints`) and everything downstream works in page points.
 *
 * ── Why nothing here defaults ────────────────────────────────────────────────
 * Every function refuses rather than assumes. A missing scale returns null, not
 * zero; a one-point path returns zero length, not an error; a negative or
 * non-finite ratio is rejected outright. The brief for this phase is explicit
 * that ambiguity means asking the user, and a function that quietly picks a
 * plausible number is the opposite of that.
 */

/** A point on the PDF page, in page points (72 per inch). */
export type PagePoint = { x: number; y: number };

/** PDF page points per inch of paper. Fixed by the PDF specification. */
export const POINTS_PER_INCH = 72;

const INCHES_PER_FOOT = 12;

/**
 * Convert a point measured on the rendered canvas into page points.
 *
 * `renderScale` is the factor the page was rasterised at — the viewer uses
 * 1.5, meaning one page point became 1.5 device pixels. Dividing it out first
 * is what makes a measurement independent of how zoomed in the user happened
 * to be, which is not optional: the same run traced at two zoom levels has to
 * produce the same footage.
 */
export function screenToPagePoints(
  point: { x: number; y: number },
  renderScale: number
): PagePoint | null {
  if (!Number.isFinite(renderScale) || renderScale <= 0) return null;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  return { x: point.x / renderScale, y: point.y / renderScale };
}

/** Straight-line distance between two points, in whatever unit they are in. */
export function segmentLength(a: PagePoint, b: PagePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Total length along a traced path, in page points.
 *
 * A path of fewer than two points has no length — zero, not an error. A user
 * mid-trace with one point down has genuinely measured nothing yet, and that
 * is a normal state rather than a fault.
 *
 * Returns null if any point is unusable, rather than skipping it: silently
 * dropping a bad vertex would shorten the run and nothing would say so.
 */
export function pathLengthInPoints(points: PagePoint[]): number | null {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y)) return null;
    if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) return null;
    total += segmentLength(a, b);
  }
  return Number.isFinite(total) ? total : null;
}

/** Whether a scale ratio can be measured against at all. */
export function isUsableScaleRatio(
  ratio: number | null | undefined
): ratio is number {
  return typeof ratio === "number" && Number.isFinite(ratio) && ratio > 0;
}

/**
 * Paper points → real-world inches, through a sheet's scale ratio.
 *
 * `ratio` is real distance per unit of paper, exactly as Phase 2a stores it:
 * `1/4" = 1'-0"` is 48, because a quarter inch of paper is 48 quarter-inches
 * of building… no — because one INCH of paper is 48 inches of building. The
 * ratio is unit-free, which is why it can be applied to inches directly.
 *
 * Returns null when the ratio is unusable. Callers must treat that as "cannot
 * measure yet", never as zero.
 */
export function pointsToRealInches(
  lengthInPoints: number,
  ratio: number | null | undefined
): number | null {
  if (!isUsableScaleRatio(ratio)) return null;
  if (!Number.isFinite(lengthInPoints) || lengthInPoints < 0) return null;
  return (lengthInPoints / POINTS_PER_INCH) * ratio;
}

/**
 * The whole measurement, end to end: traced points → real-world inches.
 *
 * The single entry point the app should use. Returns null if the path is
 * unusable OR the scale is unusable — the two failures are indistinguishable
 * to a caller on purpose, because the correct response to either is the same:
 * do not show a number.
 */
export function pathRealInches(
  points: PagePoint[],
  ratio: number | null | undefined
): number | null {
  const paper = pathLengthInPoints(points);
  if (paper === null) return null;
  return pointsToRealInches(paper, ratio);
}

/** Real inches as decimal feet — the unit material is bought and priced in. */
export function inchesToFeet(inches: number): number {
  return inches / INCHES_PER_FOOT;
}

/**
 * How a measured run reads on screen: `142'-7"`.
 *
 * Rounded to the nearest inch, because a plan traced by hand does not support
 * finer than that and printing 142.583333 feet would imply a precision the
 * measurement does not have.
 */
export function formatFeetInches(realInches: number): string {
  if (!Number.isFinite(realInches)) return "—";
  const rounded = Math.round(realInches);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const feet = Math.floor(abs / INCHES_PER_FOOT);
  const inches = abs % INCHES_PER_FOOT;
  return `${sign}${feet}'-${inches}"`;
}

/**
 * Footage as it goes onto a bid: decimal feet, two places.
 *
 * Deliberately NOT rounded up to a whole foot here. Waste and rounding are a
 * pricing decision, and inventing them inside a measuring function would make
 * the same run price differently depending on where it was rounded.
 */
export function toBillableFeet(realInches: number): number {
  if (!Number.isFinite(realInches)) return 0;
  return Math.round(inchesToFeet(realInches) * 100) / 100;
}
