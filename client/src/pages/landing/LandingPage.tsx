/**
 * The marketing landing page — shared chrome, and the section order.
 *
 * ── Presentational on purpose ───────────────────────────────────────────────
 * This component takes a TradeContent, an email value and a submit callback,
 * and renders. It talks to no server and reads no global state, which buys two
 * things: the architecture test can render the REAL page against a synthetic
 * trade rather than a stand-in for it, and the page stays pre-renderable if
 * this ever wants to be static HTML — the obvious next win for something whose
 * entire job is a stranger's first impression.
 *
 * LandingPageContainer supplies the tRPC wiring.
 *
 * ── What lives here versus in the config ────────────────────────────────────
 * Here: the nav, the footer, the section ORDER, the layout, the brand. Those
 * are identical for every trade by design — a plumbing page that reorders its
 * sections is a second page to maintain, not a second config entry.
 *
 * In the config: every word a visitor reads. See content/trades/types.ts.
 */
import { BrandLockup, BrandMark } from "@/components/brand/BrandMark";
import type { TradeContent } from "@/content/trades";
import {
  Credibility,
  Different,
  Hero,
  HowItWorks,
  Problem,
  SignupSection,
  SIGNUP_ANCHOR,
  type SignupStatus,
} from "./sections";

export type { SignupStatus } from "./sections";

export function LandingPage({
  trade,
  email,
  onEmailChange,
  onSubmit,
  status,
  onSignIn,
}: {
  trade: TradeContent;
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
  status: SignupStatus;
  /** Sends an existing user to the login flow. */
  onSignIn: () => void;
}) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Skip link first in the DOM: this page is long and keyboard users
          should not have to tab through a nav to reach the one thing it is
          asking them to do. */}
      <a
        href={`#${SIGNUP_ANCHOR}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#F5C518] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-black"
      >
        Skip to early access signup
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8 py-3">
          <BrandLockup size={30} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSignIn}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
            >
              Sign in
            </button>
            <a
              href={`#${SIGNUP_ANCHOR}`}
              className="rounded-lg bg-[#F5C518] px-4 py-2 text-sm font-bold text-black transition-all duration-150 hover:bg-[#F5C518]/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {trade.hero.ctaLabel}
            </a>
          </div>
        </div>
      </header>

      <main>
        <Hero trade={trade} />
        <Problem trade={trade} />
        <HowItWorks trade={trade} />
        <Different trade={trade} />
        <Credibility trade={trade} />
        <SignupSection
          trade={trade}
          email={email}
          onEmailChange={onEmailChange}
          onSubmit={onSubmit}
          status={status}
        />
      </main>

      <footer className="bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 sm:px-8 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size={22} />
            <p className="text-sm text-muted-foreground">
              Estimating software for {trade.vocabulary.tradespeople}.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            © {year} HelixBid. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
