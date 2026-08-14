/**
 * The contract between the marketing page and a trade.
 *
 * ── The seam ────────────────────────────────────────────────────────────────
 * HelixBid is electrical-first by sequencing, not electrical-only by design
 * (CLAUDE.md § Project): a plumbing or HVAC launch is meant to be content plus
 * an unlock, not a refactor. The landing page has to be able to make the same
 * promise, and a page with "electrician" typed into its headline cannot.
 *
 * So everything a plumber would say differently lives here, and everything
 * structural — section order, layout, the brand, the signup mechanics — lives
 * in the components and is identical across trades. Adding a trade is a file
 * next to electrical.ts and a line in index.ts. It is never a component edit,
 * and client/src/lib/tradeContent.test.ts fails if that stops being true.
 *
 * ── Deliberately small ──────────────────────────────────────────────────────
 * This type used to carry a problem section, a differentiator grid and a
 * credibility block. They are gone. The page is a headline, three steps and a
 * signup, because that is what the rest of HelixBid looks like — dense screens
 * with restrained chrome — and a marketing page with six sections of cards did
 * not look like the product it was selling.
 *
 * The one survivor of what was cut is `closingLine`: a single sentence at the
 * end of the steps carrying the thing the differentiator grid existed to say.
 * If a future trade has nothing worth saying there, leave it out.
 */

/**
 * A product screenshot.
 *
 * `src` points at a real capture of the running app. There is no stock-photo
 * fallback and there should not be: it is the only image on the page, and a
 * hard-hat-and-clipboard photo tells a contractor the opposite of what the
 * screenshot does.
 */
export type TradeShot = {
  src: string;
  /** Alt text describing what the screen actually shows. */
  alt: string;
  /** Intrinsic size, so the browser reserves space and nothing jumps. */
  width: number;
  height: number;
};

/** One step of the three. Title plus a single sentence — no icon, no card. */
export type TradeStep = {
  title: string;
  body: string;
};

export type TradeContent = {
  /** Stable id. Matches the `trade` value on assemblies in drizzle/schema.ts. */
  id: string;
  /** What this trade is called, capitalised — "Electrical". */
  label: string;

  /** Search and link-preview text. */
  meta: {
    /** The <title>. Leads with what the product does; the name does not explain itself. */
    title: string;
    /** ~155 characters, written for a person scanning results. */
    description: string;
    /** Absolute-from-root path to the sharing preview image. */
    ogImage: string;
    ogImageAlt: string;
  };

  hero: {
    /**
     * One line saying what the app does.
     *
     * Not the product name on its own — "HelixBid" tells a first-time visitor
     * nothing, and someone who bounces off this line never learns what was on
     * offer.
     */
    headline: string;
    /** ONE sentence on the mechanics. Not a paragraph. */
    subhead: string;
    /** The single button. There is no second call to action on this page. */
    ctaLabel: string;
    shot: TradeShot;
  };

  howItWorks: {
    heading: string;
    /** Exactly three. The test enforces it — four steps is the old page creeping back. */
    steps: [TradeStep, TradeStep, TradeStep];
    /**
     * One closing sentence, or omitted.
     *
     * All that is kept of the differentiator and credibility sections. It earns
     * its place only if it says something the three steps do not.
     */
    closingLine?: string;
  };

  cta: {
    heading: string;
    /** One short line. */
    body: string;
    buttonLabel: string;
    placeholder: string;
    /** What the address will and will not be used for. Sits with the field. */
    privacy: string;
    /** Shown after a successful signup. */
    success: string;
    /** Shown when the address is already on the list — not an error. */
    alreadyOn: string;
  };

  /**
   * The words this trade uses for its own people.
   *
   * Kept apart from the prose so the shared footer can say "electricians"
   * without any component knowing that word.
   */
  vocabulary: {
    /** "electricians" — plural, lower case. */
    tradespeople: string;
  };
};
