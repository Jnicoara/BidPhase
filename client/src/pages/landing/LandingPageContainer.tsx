/**
 * The landing page, wired up.
 *
 * All the server-talking lives here so LandingPage itself stays a pure function
 * of its trade config — which is what lets the architecture test render the
 * real page rather than a mock of it. See LandingPage.tsx.
 *
 * ── Also owns the page's head ───────────────────────────────────────────────
 * index.html carries the marketing title and description, because that is what
 * a crawler and a link-preview scraper read — neither runs the app. This
 * component sets the same values again at runtime, for the case index.html
 * cannot cover: an authenticated user navigating back out to the landing page
 * in a session where the app has already retitled the tab.
 */
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { DEFAULT_TRADE, type TradeContent } from "@/content/trades";
import { LandingPage, type SignupStatus } from "./LandingPage";

export function LandingPageContainer({
  trade = DEFAULT_TRADE,
  onSignIn,
}: {
  trade?: TradeContent;
  onSignIn: () => void;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SignupStatus>({ kind: "idle" });

  const join = trpc.earlyAccess.join.useMutation({
    onSuccess: result =>
      setStatus({
        kind: result.status === "joined" ? "joined" : "already",
      }),
    onError: error => setStatus({ kind: "error", message: error.message }),
  });

  useEffect(() => {
    document.title = trade.meta.title;

    const set = (selector: string, content: string) =>
      document.querySelector(selector)?.setAttribute("content", content);

    set('meta[name="description"]', trade.meta.description);
    set('meta[property="og:image:alt"]', trade.meta.ogImageAlt);

    // Upgrade the sharing image to an absolute URL. index.html can only carry a
    // relative one — the deployed hostname is not known at build time, and a
    // hardcoded wrong host is worse than a relative path. Scrapers that run JS
    // get the absolute form; the rest resolve the relative one against the page.
    const absolute = new URL(trade.meta.ogImage, window.location.origin).href;
    set('meta[property="og:image"]', absolute);
    set('meta[name="twitter:image"]', absolute);
    set('meta[property="og:url"]', window.location.origin + "/");
  }, [trade.meta]);

  return (
    <LandingPage
      trade={trade}
      email={email}
      onEmailChange={value => {
        setEmail(value);
        // Clear a previous failure the moment they start fixing it. Leaving a
        // red line under a field somebody is actively correcting is how a form
        // reads as broken.
        if (status.kind === "error") setStatus({ kind: "idle" });
      }}
      onSubmit={() => {
        setStatus({ kind: "submitting" });
        join.mutate({ email, tradeId: trade.id });
      }}
      status={status}
      onSignIn={onSignIn}
    />
  );
}

export default LandingPageContainer;
