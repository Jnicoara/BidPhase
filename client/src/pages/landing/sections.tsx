/**
 * The landing page's sections — structure only, no words of their own.
 *
 * ── The rule this file lives by ─────────────────────────────────────────────
 * Not one sentence of trade-specific copy appears here. Every string a visitor
 * reads comes from the TradeContent passed in; what these components own is the
 * layout, the rhythm and the visual language, all of which stay identical when
 * a second trade launches. If you find yourself typing the word "electrical"
 * into this file, the config is missing a field — add it to
 * content/trades/types.ts instead.
 *
 * client/src/lib/tradeContent.test.ts renders these with a synthetic trade and
 * fails if any of the shipped electrical copy survives, which is what keeps the
 * rule from decaying into a comment nobody enforces.
 *
 * ── Render-safe on the server ───────────────────────────────────────────────
 * Nothing here touches `window`, `document` or a browser API during render.
 * That is what lets the architecture test render the real page with
 * renderToStaticMarkup in a node environment rather than asserting against a
 * mock of it — and it keeps the door open to pre-rendering this page, which is
 * the obvious next win for a page whose whole job is a first impression.
 */
import {
  Calculator,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  HardHat,
  Layers,
  Loader2,
  Receipt,
  Ruler,
  ShieldCheck,
  Sliders,
  TrendingUp,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { IconKey, TradeContent } from "@/content/trades";

/**
 * The closed icon set.
 *
 * A config names a key; this map turns it into a component. A key that is not
 * here cannot be written — the IconKey type refuses it — so there is no path
 * where a content file renders a hole.
 */
const ICONS: Record<IconKey, LucideIcon> = {
  ruler: Ruler,
  calculator: Calculator,
  sliders: Sliders,
  fileText: FileText,
  hardHat: HardHat,
  shieldCheck: ShieldCheck,
  gauge: Gauge,
  trendingUp: TrendingUp,
  clock: Clock,
  receipt: Receipt,
  layers: Layers,
  zap: Zap,
};

/** Where the page's own anchors point. Shared so a link cannot drift. */
export const SIGNUP_ANCHOR = "early-access";

/** Section heading, so every section's type scale is decided in one place. */
function SectionHeading({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="max-w-2xl">
      <h2
        className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {children}
      </h2>
      {sub && (
        <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed">
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

/**
 * The hero.
 *
 * The headline says what the product does rather than what it is called,
 * because "HelixBid" explains nothing to someone meeting it for the first time
 * and a visitor who bounces off this screen never learns what was on offer.
 *
 * The screenshot is a real capture of the running app, at its intrinsic size
 * with width and height attributes set, loaded eagerly and at high priority.
 * It is the largest thing on the page and the first thing worth looking at, so
 * it is the one image that must not arrive late or shift the layout when it
 * does.
 */
export function Hero({ trade }: { trade: TradeContent }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* A soft accent wash and the app's own dot grid, so the page and the
          product look like the same piece of software. Pure CSS — a decorative
          background is not worth a request on a first impression. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -20%, rgba(245,197,24,0.13) 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(var(--bp-grid-dot, rgba(255,255,255,0.04)) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#F5C518]/30 bg-[#F5C518]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#F5C518]">
          {trade.hero.eyebrow}
        </p>

        <h1
          className="mx-auto mt-6 max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.08]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {trade.hero.headline}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
          {trade.hero.subhead}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <a
            href={`#${SIGNUP_ANCHOR}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F5C518] px-7 py-3.5 text-base font-bold text-black transition-all duration-150 hover:bg-[#F5C518]/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {trade.hero.ctaLabel}
            <Zap className="h-4 w-4" aria-hidden />
          </a>
          <p className="text-xs text-muted-foreground">{trade.hero.ctaNote}</p>
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {trade.hero.highlights.map(item => (
            <li
              key={item}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <CheckCircle2
                className="h-3.5 w-3.5 text-[#F5C518]"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* The product itself. Framed like a window rather than floated on a
          gradient: the claim is "this is the real screen", and a shot with a
          drop shadow and a tilt reads as an illustration of one. */}
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 pb-16 sm:pb-24">
        <figure className="mx-auto">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/40">
            <div className="flex items-center gap-1.5 border-b border-border bg-[#0F1117] px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            </div>
            <img
              src={trade.hero.shot.src}
              alt={trade.hero.shot.alt}
              width={trade.hero.shot.width}
              height={trade.hero.shot.height}
              loading="eager"
              decoding="async"
              // React 19 spells this camelCase and emits the lowercase HTML
              // attribute itself. It matters here: this image is the page's
              // largest contentful paint, and the browser otherwise discovers
              // it at normal priority behind the stylesheet.
              fetchPriority="high"
              className="block w-full h-auto"
            />
          </div>
          <figcaption className="mt-3 text-center text-xs text-muted-foreground">
            {trade.hero.shot.caption}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// ── The problem ──────────────────────────────────────────────────────────────

export function Problem({ trade }: { trade: TradeContent }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-24">
        <SectionHeading sub={trade.problem.intro}>
          {trade.problem.heading}
        </SectionHeading>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {trade.problem.pains.map(pain => (
            <li
              key={pain.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start gap-3">
                <TriangleAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#F5C518]"
                  aria-hidden
                />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {pain.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {pain.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p
          className="mt-10 border-l-2 border-[#F5C518] pl-5 text-lg sm:text-xl font-medium text-foreground"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {trade.problem.turn}
        </p>
      </div>
    </section>
  );
}

// ── How it works ─────────────────────────────────────────────────────────────

/**
 * The flow, numbered.
 *
 * A vertical rail on wide screens and a plain stack on narrow ones: a
 * four-across row of steps is unreadable on the phone half of this audience,
 * and the order of the steps IS the content here.
 */
export function HowItWorks({ trade }: { trade: TradeContent }) {
  return (
    <section className="border-b border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-24">
        <SectionHeading sub={trade.howItWorks.subheading}>
          {trade.howItWorks.heading}
        </SectionHeading>

        <ol className="mt-10 grid gap-5 sm:grid-cols-2">
          {trade.howItWorks.steps.map((step, index) => {
            const Icon = ICONS[step.icon];
            return (
              <li
                key={step.title}
                className="relative rounded-xl border border-border bg-background p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F5C518]/10">
                    <Icon className="h-4 w-4 text-[#F5C518]" aria-hidden />
                  </span>
                  <span
                    className="font-mono text-xs tabular-nums text-muted-foreground"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3
                  className="mt-4 text-lg font-semibold text-foreground"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ── Why it's different ───────────────────────────────────────────────────────

export function Different({ trade }: { trade: TradeContent }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-24">
        <SectionHeading sub={trade.different.subheading}>
          {trade.different.heading}
        </SectionHeading>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {trade.different.cards.map(card => {
            const Icon = ICONS[card.icon];
            return (
              <article
                key={card.title}
                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-[#F5C518]/40"
              >
                <Icon className="h-5 w-5 text-[#F5C518]" aria-hidden />
                <h3
                  className="mt-4 text-lg font-semibold text-foreground"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {card.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Credibility ──────────────────────────────────────────────────────────────

/**
 * Who built it, and how it is being tested.
 *
 * No testimonials, no logo wall, no "trusted by" counter — there are no
 * customers yet, and this is an audience that can smell an invented quote from
 * across a parking lot. Saying plainly that it is early and being built with a
 * handful of contractors is both true and, for this reader, better.
 */
export function Credibility({ trade }: { trade: TradeContent }) {
  return (
    <section className="border-b border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <SectionHeading>{trade.credibility.heading}</SectionHeading>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {trade.credibility.body}
            </p>
            <p className="mt-6 text-sm font-medium text-[#F5C518]">
              {trade.credibility.signature}
            </p>
          </div>

          <ul className="grid gap-4">
            {trade.credibility.points.map(point => {
              const Icon = ICONS[point.icon];
              return (
                <li
                  key={point.title}
                  className="flex items-start gap-4 rounded-xl border border-border bg-background p-5"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F5C518]/10">
                    <Icon className="h-4 w-4 text-[#F5C518]" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {point.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {point.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Signup ───────────────────────────────────────────────────────────────────

export type SignupStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "joined" }
  | { kind: "already" }
  | { kind: "error"; message: string };

/**
 * The early-access form.
 *
 * Presentational: it holds the typed value and hands a valid-looking address
 * upward. Whether that address is stored — and it is, see
 * server/routers/earlyAccessRouter.ts — is the container's business, which is
 * what lets the architecture test render this section without a tRPC provider.
 *
 * The privacy line sits directly under the field rather than in the footer,
 * because a promise about an email address is only worth anything where the
 * address is being typed.
 */
export function SignupSection({
  trade,
  email,
  onEmailChange,
  onSubmit,
  status,
}: {
  trade: TradeContent;
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
  status: SignupStatus;
}) {
  const submitting = status.kind === "submitting";
  const done = status.kind === "joined" || status.kind === "already";

  return (
    <section id={SIGNUP_ANCHOR} className="scroll-mt-16 border-b border-border">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-16 sm:py-24 text-center">
        <h2
          className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {trade.cta.heading}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          {trade.cta.body}
        </p>

        {done ? (
          <div
            className="mx-auto mt-8 flex max-w-md items-center justify-center gap-2.5 rounded-lg border border-[#F5C518]/40 bg-[#F5C518]/10 px-5 py-4"
            role="status"
          >
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-[#F5C518]"
              aria-hidden
            />
            <p className="text-sm font-medium text-foreground">
              {status.kind === "already"
                ? trade.cta.alreadyOn
                : trade.cta.success}
            </p>
          </div>
        ) : (
          <form
            className="mx-auto mt-8 max-w-md"
            onSubmit={event => {
              event.preventDefault();
              if (!submitting) onSubmit();
            }}
          >
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <label htmlFor="early-access-email" className="sr-only">
                Email address
              </label>
              <input
                id="early-access-email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={event => onEmailChange(event.target.value)}
                placeholder={trade.cta.placeholder}
                disabled={submitting}
                className="h-12 flex-1 rounded-lg border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:border-[#F5C518] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F5C518] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#F5C518] px-6 text-base font-bold text-black transition-all duration-150 hover:bg-[#F5C518]/90 active:scale-[0.97] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {submitting && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                )}
                {trade.cta.buttonLabel}
              </button>
            </div>

            {status.kind === "error" && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {status.message}
              </p>
            )}

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {trade.cta.privacy}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
