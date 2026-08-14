/**
 * The contract between the marketing page and a trade.
 *
 * ── The whole point of this file ─────────────────────────────────────────────
 * HelixBid is electrical-first by sequencing, not electrical-only by design
 * (CLAUDE.md § Project). The data model has carried a `trade` on every assembly
 * from the start, and a plumbing or HVAC launch is meant to be content plus an
 * unlock, not a refactor. The landing page has to be able to make the same
 * promise, and a page that hardcodes "electrician" into its headline cannot.
 *
 * So the split is: **this type is the seam.** Everything a plumber would need
 * said differently — the headline, the pain, the words for the work, the
 * screenshot — is in here. Everything structural — section order, layout,
 * spacing, the brand, the signup mechanics — is in the components and is
 * IDENTICAL across trades. Adding a trade means adding one file next to
 * electrical.ts and one line in index.ts. It never means opening a component.
 *
 * client/src/lib/tradeContent.test.ts holds the architecture to that promise by
 * rendering the real page with a synthetic trade and asserting that not one
 * word of electrical content survives.
 *
 * ── Why icons are keys and not imports ───────────────────────────────────────
 * A config entry names an icon from a fixed set (see ICON_KEYS) rather than
 * importing a component. A content file should not be able to break the render
 * — and a closed set is the same instinct the navigation helper and the
 * co-pilot's action list already use in this codebase: choose between options,
 * never construct one.
 */

/**
 * Icons a trade config may name.
 *
 * Deliberately small and generic. If a trade needs a symbol this list cannot
 * express, add it here once — that is a shared-chrome decision, not a content
 * one, and it is the one thing about a new trade that should touch code.
 */
export const ICON_KEYS = [
  "ruler",
  "calculator",
  "sliders",
  "fileText",
  "hardHat",
  "shieldCheck",
  "gauge",
  "trendingUp",
  "clock",
  "receipt",
  "layers",
  "zap",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

/** A step in the "how it works" flow. */
export type TradeStep = {
  /** Short imperative title — "Trace it on the real plans". */
  title: string;
  /** One or two sentences of plain trade language. */
  body: string;
  icon: IconKey;
};

/** One honest differentiator. */
export type TradeCard = {
  title: string;
  body: string;
  icon: IconKey;
};

/**
 * A product screenshot.
 *
 * `src` points at a real capture of the running app. There is no stock-photo
 * fallback and there should not be: a screenshot is the only image on this page
 * that tells a contractor whether the tool is worth their time, and a
 * hard-hat-and-clipboard photo tells them the opposite.
 */
export type TradeShot = {
  src: string;
  /** Alt text describing what the screen actually shows. */
  alt: string;
  /** A short caption naming the screen, shown under the frame. */
  caption: string;
  /** Intrinsic size, so the browser reserves the space and nothing jumps. */
  width: number;
  height: number;
};

export type TradeContent = {
  /** Stable id. Matches the `trade` value on assemblies in drizzle/schema.ts. */
  id: string;
  /** What this trade is called, capitalised — "Electrical". */
  label: string;

  /** Search and link-preview text. */
  meta: {
    /** The <title>. Leads with what the product does; the name alone does not explain itself. */
    title: string;
    /** ~155 characters, written for a person scanning results, not for a crawler. */
    description: string;
    /** Absolute-from-root path to the sharing preview image. */
    ogImage: string;
    ogImageAlt: string;
  };

  hero: {
    /** Small line above the headline. Sets the category in three or four words. */
    eyebrow: string;
    /**
     * The headline. Says what the product DOES.
     *
     * "HelixBid" is not self-explanatory and must never carry this on its own —
     * a visitor who bounces off the hero never finds out what was being sold.
     */
    headline: string;
    /** The mechanics, in plain language: what goes in, what comes out, how fast. */
    subhead: string;
    /** The primary button. */
    ctaLabel: string;
    /** Reassurance directly under the button — cost, commitment, spam. */
    ctaNote: string;
    /** Three short proof chips beside the hero. */
    highlights: string[];
    shot: TradeShot;
  };

  problem: {
    heading: string;
    /** One or two sentences setting up the pains. Trade language, not SaaS-speak. */
    intro: string;
    /** The specific, recognisable pains. Each one should make someone wince. */
    pains: { title: string; body: string }[];
    /** The turn: one line saying what should happen instead. */
    turn: string;
  };

  howItWorks: {
    heading: string;
    subheading: string;
    steps: TradeStep[];
  };

  different: {
    heading: string;
    subheading: string;
    cards: TradeCard[];
  };

  credibility: {
    heading: string;
    /**
     * The honest framing.
     *
     * There is no customer base yet, so there are no testimonials — and inventing
     * them would be the single fastest way to lose the audience this is aimed at.
     * This section says who built it and how it is being tested, and stops there.
     */
    body: string;
    points: { title: string; body: string; icon: IconKey }[];
    /** Attribution line — who is behind it. */
    signature: string;
  };

  cta: {
    heading: string;
    body: string;
    buttonLabel: string;
    placeholder: string;
    /** One short line near the form saying what the address will and will not be used for. */
    privacy: string;
    /** Shown after a successful signup. */
    success: string;
    /** Shown when the address is already on the list — not an error. */
    alreadyOn: string;
  };

  /**
   * The words this trade uses for its own work.
   *
   * Kept apart from the prose above so shared chrome can use them too — the
   * page footer and the form's aria labels say "electricians" without any
   * component knowing that word.
   */
  vocabulary: {
    /** "electricians" — the people. Plural, lower case. */
    tradespeople: string;
    /** "an electrician" — with an article, for mid-sentence use. */
    tradespersonWithArticle: string;
    /** "devices" — the countable thing on a plan. */
    countedThing: string;
  };
};
