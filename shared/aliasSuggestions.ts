/**
 * Cleaning up suggested search aliases before a human sees them.
 *
 * ── The two-layer design, stated once ────────────────────────────────────────
 * Search reliability comes from two places:
 *
 *   1. The shared dictionary — ALIAS_MAP in client/src/lib/smartSearch.ts. A
 *      query-side synonym table every search box uses: "romex" finds NM-B for
 *      every material, forever, without anything being stored per row.
 *   2. Per-item aliases — `materials.searchAliases`. Facts about ONE material
 *      that no general dictionary could know: that a single-gang box is a "gem
 *      box", that a strut nut is a "spring nut".
 *
 * A material with only layer 1 is findable by generic trade words and invisible
 * to the specific ones. That is the gap this module serves: it takes suggested
 * layer-2 terms and makes them safe to show, so a user adding one material by
 * hand ends up with the same quality of aliases a curated starter row has.
 *
 * ── Why the filtering is here and not in the prompt ──────────────────────────
 * The rules below are the ones CLAUDE.md § Materials lays down, and a model
 * asked to follow them in prose will mostly follow them. "Mostly" is not good
 * enough for the rule that matters — aliasing one material to a DIFFERENT
 * material is what made searching "recep" rank "Wall plate" first, and it is
 * invisible until someone notices their search is wrong. So the rules are
 * enforced in code on whatever comes back, and the prompt is a courtesy.
 */

/** Words too generic to earn their place, whatever suggested them. */
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "for",
  "with",
  "to",
  "in",
  "on",
  "electrical",
  "electric",
  "material",
  "item",
  "part",
  "supply",
  "supplies",
  "product",
  "standard",
  "generic",
  "misc",
  "miscellaneous",
  "other",
  "type",
]);

/** Normalise for comparison: lower case, no punctuation noise. */
function normalise(term: string): string {
  return term.toLowerCase().trim().replace(/\s+/g, " ");
}

/** The distinct words already in a material's own name. */
export function wordsInName(name: string): Set<string> {
  return new Set(
    normalise(name)
      // The inch mark is dropped so 3/4" and 3/4 compare as the same size —
      // otherwise a suggested "3/4" looks new against a name containing 3/4".
      .split(/[^a-z0-9/\-.']+/)
      .filter(Boolean)
  );
}

export type AliasFilterOptions = {
  /** The material these aliases are for. Terms already in it are dropped. */
  name: string;
  /**
   * Names of OTHER materials in the catalog.
   *
   * Any suggestion matching one of these is refused outright. This is the rule
   * that protects search: aliasing "wall plate" onto a receptacle makes the
   * plate outrank the thing the user actually named, and nothing on screen
   * says why.
   */
  otherMaterialNames?: string[];
  /** Aliases the material already carries, so nothing is offered twice. */
  existing?: string | null;
  /** Ceiling on how many to return. Keeps the review a glance, not a chore. */
  limit?: number;
};

export type AliasSuggestion = {
  term: string;
  /** Why it was kept — shown so a user can judge rather than just trust. */
  reason: "trade-name" | "spelling" | "size" | "other";
};

/**
 * Reduce raw suggestions to the ones worth showing.
 *
 * Deliberately conservative: it is far better to drop a decent alias than to
 * offer a harmful one, because the user reviewing them cannot be expected to
 * know that "wall plate" on a receptacle will quietly break their searches.
 */
export function filterAliasSuggestions(
  raw: string[],
  options: AliasFilterOptions
): string[] {
  const {
    name,
    otherMaterialNames = [],
    existing = null,
    limit = 12,
  } = options;

  const nameWords = wordsInName(name);
  const wholeName = normalise(name);
  const existingTerms = new Set(
    (existing ?? "").toLowerCase().split(/\s+/).filter(Boolean)
  );

  // Other materials, by full name and by their distinctive words. Both are
  // needed: "wall plate" is a phrase, "plate" alone is the word that does the
  // damage when it lands on a receptacle.
  const otherNames = new Set(otherMaterialNames.map(normalise));
  const otherWords = new Set<string>();
  for (const other of otherMaterialNames) {
    if (normalise(other) === wholeName) continue;
    for (const word of Array.from(wordsInName(other))) {
      // A word this material's own name also uses is not evidence of anything.
      if (!nameWords.has(word)) otherWords.add(word);
    }
  }

  const kept: string[] = [];
  const seen = new Set<string>();

  for (const candidate of raw) {
    const term = normalise(candidate);
    if (!term) continue;
    if (term.length < 2 || term.length > 40) continue;
    if (seen.has(term)) continue;

    // Already in the name — "Dimmer" needs no "dimmer".
    if (term === wholeName) continue;
    const termWords = term.split(" ");
    if (termWords.every(word => nameWords.has(word))) continue;

    // Already carried.
    if (termWords.every(word => existingTerms.has(word))) continue;

    // Generic filler.
    if (termWords.every(word => STOP_WORDS.has(word))) continue;

    // The rule that protects search: never point at a different material.
    if (otherNames.has(term)) continue;
    if (termWords.some(word => otherWords.has(word))) continue;

    seen.add(term);
    kept.push(term);
    if (kept.length >= limit) break;
  }

  return kept;
}

/**
 * Merge accepted suggestions into a material's alias string.
 *
 * Space-separated and de-duplicated, matching how the seeded rows are written
 * and how smartSearch reads them. Existing terms are kept and lead, because a
 * user who typed their own words should see them stay where they put them.
 */
export function mergeAliases(
  existing: string | null,
  accepted: string[]
): string {
  // Deduped by PHRASE, not by word. The seeded rows settle this: an EMT strap
  // carries "one hole 1 hole two hole 2 hole", repeating "hole" on purpose,
  // because each phrase is a distinct way someone types the thing. Word-level
  // dedupe would turn "gem box" + "switch box" into "gem box switch" and throw
  // away a phrase a user would actually search for.
  const out: string[] = [];
  const seenPhrases = new Set<string>();

  const existingText = (existing ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (existingText) {
    out.push(existingText);
    seenPhrases.add(existingText);
  }

  for (const phrase of accepted) {
    const value = phrase.toLowerCase().trim().replace(/\s+/g, " ");
    if (!value || seenPhrases.has(value)) continue;
    // Already present as a run of words inside what we have — "gem box" when
    // the text already reads "gem box switch box".
    if (` ${out.join(" ")} `.includes(` ${value} `)) continue;
    seenPhrases.add(value);
    out.push(value);
  }

  return out.join(" ");
}

/**
 * The instruction given to the model.
 *
 * Exported so the exact wording is reviewable and testable rather than buried
 * in a request body. It restates the CLAUDE.md rules, but nothing depends on
 * the model obeying them — `filterAliasSuggestions` enforces them afterwards.
 */
export function aliasPromptFor(name: string, category: string | null): string {
  return [
    "You name electrical materials the way an electrician on a job site does.",
    "",
    `Material: ${name}`,
    category ? `Category: ${category}` : "Category: not given",
    "",
    "List the terms an estimator would actually TYPE into a search box to find",
    "this exact item. Rules:",
    "- Only terms that are NOT already words in the material's name.",
    "- Include job-site and counter names, and brand names used generically.",
    "- Include the spellings and abbreviations people type, including sizes",
    "  written different ways.",
    "- NEVER list the name of a different material. A wall plate is not a term",
    "  for a receptacle. If unsure, leave it out.",
    "- No sentences, no explanations, no punctuation.",
    "",
    "Reply with a JSON array of lowercase strings and nothing else.",
  ].join("\n");
}

/**
 * Pull an array of terms out of whatever the model replied with.
 *
 * Tolerant on purpose — a model that wraps its JSON in a code fence or adds a
 * sentence should not cost the user their suggestions — but it never invents
 * anything: unparseable input yields an empty list, and the caller shows the
 * manual field instead.
 */
export function parseAliasResponse(reply: string): string[] {
  if (!reply) return [];

  const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : reply;
  const arrayText = body.match(/\[[\s\S]*\]/);
  if (!arrayText) return [];

  try {
    const parsed = JSON.parse(arrayText[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}
