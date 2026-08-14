/**
 * Does the trade-config architecture actually hold?
 *
 * ── The claim being tested ──────────────────────────────────────────────────
 * "Adding a trade is adding one config entry; it never means opening a page
 * component." That is easy to say, easy to believe, and decays the first time
 * somebody types a word like "electrician" straight into a section because it
 * was quicker. By then the second trade is a second page, and the promise the
 * data model makes — that a new trade is content plus an unlock, not a refactor
 * (CLAUDE.md § Project) — has quietly stopped being true in the marketing layer.
 *
 * So this renders the REAL landing page against a synthetic trade whose every
 * string is deliberately unlike anything electrical, and fails if a single word
 * of the shipped copy survives. A hardcoded headline cannot pass it.
 *
 * ── Rendered, not inspected ─────────────────────────────────────────────────
 * renderToStaticMarkup rather than a DOM library: the components are written to
 * touch no browser API during render (see the header of sections.tsx), which
 * makes them renderable in the node environment vitest already uses. That keeps
 * the test honest — it exercises the actual JSX rather than a stand-in — and it
 * costs no new dependency.
 */
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LandingPage } from "@/pages/landing/LandingPage";
import {
  DEFAULT_TRADE,
  TRADES,
  resolveTrade,
  ICON_KEYS,
  type TradeContent,
} from "@/content/trades";
import { electrical } from "@/content/trades/electrical";

// ── A trade that could not possibly be electrical ────────────────────────────

/**
 * Plumbing, written with deliberately distinctive strings.
 *
 * The odd words ("ZZTOP", "quokka") are load-bearing: they make it impossible
 * for an assertion to pass by accident on a word the page happens to contain
 * for another reason.
 */
const plumbing: TradeContent = {
  id: "plumbing",
  label: "Plumbing",
  meta: {
    title: "ZZTOP plumbing estimating title",
    description: "ZZTOP plumbing meta description",
    ogImage: "/brand/zztop-og.jpg",
    ogImageAlt: "ZZTOP og alt",
  },
  hero: {
    eyebrow: "ZZTOP eyebrow",
    headline: "ZZTOP headline for pipefitters",
    subhead: "ZZTOP subhead about fixtures and stacks",
    ctaLabel: "ZZTOP cta label",
    ctaNote: "ZZTOP cta note",
    highlights: ["ZZTOP highlight one", "ZZTOP highlight two"],
    shot: {
      src: "/brand/zztop-shot.jpg",
      alt: "ZZTOP screenshot alt",
      caption: "ZZTOP screenshot caption",
      width: 1200,
      height: 800,
    },
  },
  problem: {
    heading: "ZZTOP problem heading",
    intro: "ZZTOP problem intro",
    pains: [
      { title: "ZZTOP pain one", body: "ZZTOP pain one body" },
      { title: "ZZTOP pain two", body: "ZZTOP pain two body" },
    ],
    turn: "ZZTOP turn line",
  },
  howItWorks: {
    heading: "ZZTOP how heading",
    subheading: "ZZTOP how subheading",
    steps: [
      { title: "ZZTOP step one", body: "ZZTOP step one body", icon: "ruler" },
      { title: "ZZTOP step two", body: "ZZTOP step two body", icon: "gauge" },
    ],
  },
  different: {
    heading: "ZZTOP different heading",
    subheading: "ZZTOP different subheading",
    cards: [
      { title: "ZZTOP card one", body: "ZZTOP card one body", icon: "hardHat" },
    ],
  },
  credibility: {
    heading: "ZZTOP credibility heading",
    body: "ZZTOP credibility body",
    points: [
      { title: "ZZTOP point one", body: "ZZTOP point one body", icon: "clock" },
    ],
    signature: "ZZTOP signature",
  },
  cta: {
    heading: "ZZTOP cta heading",
    body: "ZZTOP cta body",
    buttonLabel: "ZZTOP button label",
    placeholder: "ZZTOP placeholder",
    privacy: "ZZTOP privacy line",
    success: "ZZTOP success",
    alreadyOn: "ZZTOP already on",
  },
  vocabulary: {
    tradespeople: "quokkas",
    tradespersonWithArticle: "a quokka",
    countedThing: "quokka fixtures",
  },
};

/** Render the real page with a given trade and nothing else changed. */
function render(
  trade: TradeContent,
  status: Parameters<typeof LandingPage>[0]["status"] = { kind: "idle" }
) {
  return renderToStaticMarkup(
    createElement(LandingPage, {
      trade,
      email: "",
      onEmailChange: () => {},
      onSubmit: () => {},
      status,
      onSignIn: () => {},
    })
  );
}

/** Every visible string a trade config supplies, flattened. */
function allCopy(trade: TradeContent): string[] {
  return [
    trade.hero.eyebrow,
    trade.hero.headline,
    trade.hero.subhead,
    trade.hero.ctaLabel,
    trade.hero.ctaNote,
    ...trade.hero.highlights,
    trade.hero.shot.alt,
    trade.hero.shot.caption,
    trade.problem.heading,
    trade.problem.intro,
    ...trade.problem.pains.flatMap(p => [p.title, p.body]),
    trade.problem.turn,
    trade.howItWorks.heading,
    trade.howItWorks.subheading,
    ...trade.howItWorks.steps.flatMap(s => [s.title, s.body]),
    trade.different.heading,
    trade.different.subheading,
    ...trade.different.cards.flatMap(c => [c.title, c.body]),
    trade.credibility.heading,
    trade.credibility.body,
    ...trade.credibility.points.flatMap(p => [p.title, p.body]),
    trade.credibility.signature,
    trade.cta.heading,
    trade.cta.body,
    trade.cta.buttonLabel,
    trade.cta.placeholder,
    trade.cta.privacy,
    trade.vocabulary.tradespeople,
  ];
}

/**
 * HTML-escape the way React does, so an assertion about an apostrophe does not
 * fail on `&#x27;`. Only the entities React emits in text nodes matter here.
 */
function escapeForHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ── The architecture claim ───────────────────────────────────────────────────

describe("a new trade is a config entry, not page code", () => {
  it("renders a trade the page components have never heard of", () => {
    // The whole test in one assertion: plumbing.ts does not exist in the repo,
    // no component was touched, and the page renders it completely.
    const html = render(plumbing);
    for (const copy of allCopy(plumbing)) {
      expect(html, `missing from the rendered page: "${copy}"`).toContain(
        escapeForHtml(copy)
      );
    }
  });

  it("leaks not one word of the shipped electrical copy", () => {
    // The failure mode this is really guarding: a component that renders the
    // config for most things but keeps one hardcoded headline or footer line.
    const html = render(plumbing);
    for (const copy of allCopy(electrical)) {
      expect(html, `electrical copy leaked through: "${copy}"`).not.toContain(
        escapeForHtml(copy)
      );
    }
    expect(html.toLowerCase()).not.toContain("electric");
  });

  it("points the hero at the trade's own screenshot", () => {
    const html = render(plumbing);
    expect(html).toContain(plumbing.hero.shot.src);
    expect(html).not.toContain(electrical.hero.shot.src);
  });

  it("uses the trade's vocabulary in the shared chrome", () => {
    // The footer is chrome, so it is not in the config — but the words it uses
    // for the people it serves have to be. This is the assertion that catches
    // "Estimating software for electricians." hardcoded into a footer.
    const html = render(plumbing);
    expect(html).toContain("quokkas");
    expect(html).not.toContain("electricians");
  });
});

// ── Shared chrome really is shared ───────────────────────────────────────────

describe("structural chrome is identical across trades", () => {
  const electricalHtml = render(electrical);
  const plumbingHtml = render(plumbing);

  it("renders the same section order for both", () => {
    const order = (html: string) =>
      [...html.matchAll(/<(section|header|footer|main)\b/g)].map(m => m[1]);
    expect(order(plumbingHtml)).toEqual(order(electricalHtml));
  });

  it("keeps the brand and the sign-in path on every trade", () => {
    for (const html of [electricalHtml, plumbingHtml]) {
      expect(html).toContain("Sign in");
      expect(html).toContain("Helix");
      expect(html).toContain("All rights reserved");
      // The signup anchor is chrome: the hero button and the nav button both
      // point at it, and the section answers to it.
      expect(html).toContain('id="early-access"');
      expect(html).toContain('href="#early-access"');
    }
  });

  it("produces the same number of section landmarks", () => {
    const count = (html: string) => (html.match(/<section/g) ?? []).length;
    expect(count(plumbingHtml)).toBe(count(electricalHtml));
    // Hero, problem, how, different, credibility, signup.
    expect(count(electricalHtml)).toBe(6);
  });
});

// ── The icon set is closed ───────────────────────────────────────────────────

describe("icons come from a fixed set", () => {
  it("renders every declared icon key without a hole", () => {
    // A config names an icon; it never imports one. Rendering all of them at
    // once proves the map is complete — a missing entry would be a crash here
    // rather than a blank square on a live page.
    const everyIcon: TradeContent = {
      ...plumbing,
      howItWorks: {
        ...plumbing.howItWorks,
        steps: ICON_KEYS.map(icon => ({
          title: `step ${icon}`,
          body: `body ${icon}`,
          icon,
        })),
      },
    };
    const html = render(everyIcon);
    for (const icon of ICON_KEYS) {
      expect(html).toContain(`step ${icon}`);
    }
    // lucide renders an <svg> per icon; the steps alone account for all of them.
    expect((html.match(/<svg/g) ?? []).length).toBeGreaterThanOrEqual(
      ICON_KEYS.length
    );
  });
});

// ── The signup section's states ──────────────────────────────────────────────

describe("the signup section", () => {
  it("shows the form, the privacy line and the button by default", () => {
    const html = render(plumbing);
    expect(html).toContain(escapeForHtml(plumbing.cta.privacy));
    expect(html).toContain('type="email"');
    expect(html).toContain(escapeForHtml(plumbing.cta.buttonLabel));
  });

  it("always carries a privacy line next to the field", () => {
    // Both shipped and synthetic — a promise about an email address is only
    // worth anything where the address is typed, so it is not optional.
    for (const trade of [electrical, plumbing]) {
      expect(render(trade)).toContain(escapeForHtml(trade.cta.privacy));
    }
  });

  it("replaces the form with a confirmation once joined", () => {
    const html = render(plumbing, { kind: "joined" });
    expect(html).toContain(escapeForHtml(plumbing.cta.success));
    expect(html).not.toContain('type="email"');
  });

  it("says something different when the address is already on the list", () => {
    // A duplicate is good news, not an error, and must not read as one.
    const html = render(plumbing, { kind: "already" });
    expect(html).toContain(escapeForHtml(plumbing.cta.alreadyOn));
    expect(html).not.toContain(escapeForHtml(plumbing.cta.success));
  });

  it("shows an error without losing the form", () => {
    const html = render(plumbing, { kind: "error", message: "ZZTOP boom" });
    expect(html).toContain("ZZTOP boom");
    expect(html).toContain('type="email"');
  });
});

// ── Mobile first ─────────────────────────────────────────────────────────────

describe("the layout is mobile-first", () => {
  const html = render(electrical);

  it("never puts a multi-column grid at the base breakpoint", () => {
    // The bug this catches: `grid-cols-2` written without a breakpoint prefix,
    // which is invisible on the laptop it was written on and unreadable on the
    // phone half of this audience. Columns must be opt-in at `sm:` and up.
    const classes = [...html.matchAll(/class="([^"]*)"/g)].flatMap(m =>
      m[1].split(/\s+/)
    );
    const bareColumns = classes.filter(c => /^grid-cols-[2-9]/.test(c));
    expect(
      bareColumns,
      `unprefixed multi-column grids: ${bareColumns}`
    ).toEqual([]);
    // And the columns really do arrive at a breakpoint, rather than the page
    // simply having no grids.
    expect(classes.some(c => /^(sm|md|lg):grid-cols-[2-9]/.test(c))).toBe(true);
  });

  it("stacks the signup field and button on a narrow screen", () => {
    expect(html).toMatch(/class="[^"]*flex-col[^"]*sm:flex-row/);
  });

  it("carries no fixed pixel widths that could overflow a phone", () => {
    const fixed = [...html.matchAll(/class="([^"]*)"/g)]
      .flatMap(m => m[1].split(/\s+/))
      .filter(c => /^w-\[\d{3,}px\]$/.test(c));
    expect(fixed, `fixed widths on the landing page: ${fixed}`).toEqual([]);
  });

  it("gives the hero image intrinsic dimensions so nothing jumps", () => {
    // Without width/height the browser reserves no space, and the largest image
    // on the page shoves the content below it down when it lands.
    expect(html).toMatch(/<img[^>]*width="\d+"[^>]*height="\d+"/);
  });
});

// ── The registry ─────────────────────────────────────────────────────────────

describe("the trade registry", () => {
  it("ships electrical, and only electrical, today", () => {
    expect(TRADES.map(t => t.id)).toEqual(["electrical"]);
    expect(DEFAULT_TRADE.id).toBe("electrical");
  });

  it("falls back rather than rendering nothing for an unknown trade", () => {
    // A stale link to a trade that was renamed or pulled should land on a page
    // that exists, not on an error.
    expect(resolveTrade("plumbing").id).toBe("electrical");
    expect(resolveTrade(null).id).toBe("electrical");
    expect(resolveTrade("  ELECTRICAL ").id).toBe("electrical");
  });
});

// ── The shipped copy has to hold up too ──────────────────────────────────────

describe("the electrical content itself", () => {
  it("leads the headline with what the product does, not the name", () => {
    // "HelixBid" explains nothing to someone meeting it for the first time. A
    // headline that is only the name is the failure this asserts against.
    expect(electrical.hero.headline.toLowerCase()).not.toContain("helixbid");
    expect(electrical.hero.headline.toLowerCase()).toContain("estimating");
  });

  it("names the product and what it does in the page title", () => {
    expect(electrical.meta.title).toContain("HelixBid");
    expect(electrical.meta.title.toLowerCase()).toContain("estimating");
    // Search results truncate; a title past ~70 characters loses its tail.
    expect(electrical.meta.title.length).toBeLessThanOrEqual(75);
  });

  it("keeps the meta description inside what a result will show", () => {
    expect(electrical.meta.description.length).toBeGreaterThan(80);
    expect(electrical.meta.description.length).toBeLessThanOrEqual(200);
  });

  it("claims no customers, because there are none yet", () => {
    // Invented social proof is the fastest way to lose this audience. The
    // credibility section is allowed to say who built it and nothing more.
    const credibility = JSON.stringify(electrical.credibility).toLowerCase();
    for (const word of [
      "testimonial",
      "trusted by",
      "customers say",
      "5-star",
    ]) {
      expect(credibility).not.toContain(word);
    }
  });

  it("avoids the vocabulary that gives away a page written by a stranger", () => {
    const everything = JSON.stringify(electrical).toLowerCase();
    for (const word of [
      "streamline",
      "empower",
      "leverage",
      "seamless",
      "revolutioniz",
      "game-chang",
      "best-in-class",
      "synerg",
    ]) {
      expect(
        everything,
        `marketing filler in the copy: "${word}"`
      ).not.toContain(word);
    }
  });

  it("uses a real product screenshot rather than stock imagery", () => {
    expect(electrical.hero.shot.src).toMatch(/^\/brand\//);
    expect(electrical.hero.shot.width).toBeGreaterThan(0);
    expect(electrical.hero.shot.height).toBeGreaterThan(0);
    // Intrinsic dimensions are set so the browser reserves the space — this is
    // the largest image on the page and the one that would shift the layout.
    expect(electrical.hero.shot.alt.length).toBeGreaterThan(40);
  });
});
