/**
 * Who drew these plans — as much of it as the app can honestly know today.
 *
 * ── What this is for ────────────────────────────────────────────────────────
 * A correction the user makes on one sheet should improve reading of the NEXT
 * sheet from the same drawing set, and of the next job from the same firm. Both
 * need a key to file the correction under. The symbol_links table already
 * anticipated this ("legend memory per architect ... needs a notion of who drew
 * the plans, which nothing captures yet") — this is that notion, at the widest
 * accuracy the available data supports and no wider.
 *
 * ── It is a heuristic, and it is allowed to be ──────────────────────────────
 * The firm name is read off the title block's text when it is there, and falls
 * back to the document's own filename when it is not. Both are wrong sometimes:
 * two firms can share a filename convention, one firm can issue under two
 * names. That is survivable HERE and would not be elsewhere, because of what
 * the key controls: it decides which past corrections are consulted as a hint.
 * A wrong key means a correction is not reused — the reading falls back to the
 * legend links, which is exactly where it started. Nothing is mispriced by a
 * missed hint.
 *
 * That tolerance is why the key is derived rather than asked for. Asking the
 * user to name the architect on every plan set would be a form to fill in
 * before the feature does anything, to buy accuracy in a place that does not
 * need it.
 *
 * ── Scope ───────────────────────────────────────────────────────────────────
 * The key is always used together with a userId. Corrections are one
 * contractor's, the same way their materials, labor rates and assemblies are —
 * never pooled. See server/routers/planCopilotRouter.ts.
 */

/**
 * Lines in a title block that name the firm that issued the drawings.
 *
 * Ordered: an explicit "ARCHITECT:" label beats a firm-shaped name found loose
 * in the text, because the loose match will happily find the general
 * contractor's name three lines further down.
 */
const LABELLED_ISSUER =
  /(?:^|\n)\s*(?:architect|engineer|engineering firm|design firm|prepared by|issued by)\s*[:\-]\s*([^\n]{3,80})/i;

/**
 * A firm-shaped name standing on its own line, for sheets with no label.
 *
 * Deliberately narrow: it wants the suffix that firms actually put on a title
 * block. A broader pattern turns every capitalised line on an electrical sheet
 * — panel schedules, room names, general notes — into an architect.
 */
const FIRM_SHAPED =
  /(?:^|\n)\s*([A-Z0-9][A-Za-z0-9&.,'’\- ]{2,60}\s(?:architects?|architecture|engineers?|engineering|design group|design associates|associates|consultants?|partnership|studio)(?:,?\s(?:inc\.?|llc|llp|ltd\.?|pc|p\.c\.))?)\s*(?:\n|$)/i;

/** Trim the noise a title block puts around a name. */
function tidy(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^[\s.,:;\-–—|]+|[\s.,:;\-–—|]+$/g, "")
    .trim();
}

/**
 * Pull the issuing firm out of a sheet's extracted text, or null.
 *
 * Null is the ordinary case, not a failure — plenty of sheets extract no
 * usable text at all, and the caller falls back to the filename.
 */
export function extractPlanIssuer(
  pageText: string | null | undefined
): string | null {
  if (!pageText) return null;
  const text = pageText.slice(0, 20_000);

  const labelled = LABELLED_ISSUER.exec(text);
  if (labelled) {
    const name = tidy(labelled[1]);
    // A label with nothing after it, or with only a number after it, is a form
    // field nobody filled in.
    if (name.length >= 3 && /[A-Za-z]{3}/.test(name)) return name.slice(0, 120);
  }

  const shaped = FIRM_SHAPED.exec(text);
  if (shaped) {
    const name = tidy(shaped[1]);
    if (name.length >= 3) return name.slice(0, 120);
  }

  return null;
}

/**
 * Strip a plan filename down to something two sheets of one set share.
 *
 * `A-101 Rev3 (2).pdf` and `A-102 Rev4.pdf` should not be two different
 * sources, so sheet numbers, revisions, dates and copy markers come off. What
 * is left is usually the job or firm prefix, which is the part that repeats.
 */
function filenameStem(filename: string): string {
  return (
    filename
      .replace(/\.[a-z0-9]{1,5}$/i, "")
      // Copy markers and revisions.
      .replace(/[\s_-]*\(\d+\)\s*$/, "")
      .replace(/[\s_-]*(?:rev|revision|r)[\s._-]*\d+[a-z]?\s*$/i, "")
      // Dates in any of the shapes a plan set uses.
      .replace(/[\s_-]*\d{4}[-._]\d{2}[-._]\d{2}\s*$/, "")
      .replace(/[\s_-]*\d{2}[-._]\d{2}[-._]\d{2,4}\s*$/, "")
      // A trailing sheet number: E-101, A2.3, M 201.
      .replace(/[\s_-]*[A-Za-z]{1,3}[\s._-]?\d{1,3}(?:\.\d{1,2})?\s*$/, "")
      .trim()
  );
}

/**
 * The key corrections are filed under.
 *
 * Lower-cased and collapsed, the same normalisation symbolLookupKey uses, so
 * `Smith & Jones Architects` and `SMITH  &  JONES  ARCHITECTS` are one source.
 * Returns `unknown` rather than an empty string when neither input yields
 * anything — a blank key would silently pool every unidentifiable plan set
 * together, which is the one behaviour worse than not matching at all.
 */
export function planSourceKey(input: {
  issuer?: string | null;
  filename?: string | null;
}): string {
  const issuer = input.issuer ? tidy(input.issuer) : "";
  if (issuer.length >= 3) {
    return `firm:${issuer.toLowerCase().replace(/\s+/g, " ")}`.slice(0, 190);
  }

  const stem = input.filename ? tidy(filenameStem(input.filename)) : "";
  if (stem.length >= 3) {
    return `file:${stem.toLowerCase().replace(/\s+/g, " ")}`.slice(0, 190);
  }

  return "unknown";
}

/** What the panel shows when it says where a remembered correction came from. */
export function planSourceLabel(key: string): string {
  if (key === "unknown") return "this drawing set";
  const [kind, ...rest] = key.split(":");
  const name = rest.join(":");
  if (kind === "firm") return name;
  return `plans named “${name}”`;
}
