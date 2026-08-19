/**
 * A card that opens when you need it and states its contents when you do not.
 *
 * ── Why the bid rail needed this ─────────────────────────────────────────────
 * The right-hand side of a bid stacked five things in one column: the totals,
 * the close-out, the charges, the scope lines, the tax controls and the pricing
 * settings — the last of which is three inherit-or-override selects, each
 * revealing a conditional field. All open, all the time, on every bid, whether
 * or not that bid had anything in them.
 *
 * `CloseoutPanel` already had the answer and its comment already gave the
 * reason: "an open form on every bid would imply the work is expected". Most
 * bids never touch tax overrides or per-bid pricing, and the ones that do touch
 * them once. So the default is shut, and the header carries a summary — because
 * a collapsed panel still has to answer "did I set that?" without being opened.
 *
 * ── The summary is the whole design ──────────────────────────────────────────
 * A panel that collapses to just its title has hidden information; a panel that
 * collapses to a true one-line statement has organised it. Pass a `summary`
 * that says what is CURRENTLY true — "Following company defaults", "3 charges ·
 * $420" — not what the panel is for.
 *
 * Open/shut is remembered per panel rather than per bid: it is a preference
 * about how you work, not a fact about the job.
 */
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function CollapsiblePanel({
  id,
  title,
  summary,
  badge,
  defaultOpen = false,
  children,
}: {
  /** Stable key for remembering open/shut. Not per-bid — see above. */
  id: string;
  title: string;
  /** One line stating what is currently true. Shown only when shut. */
  summary: ReactNode;
  /** Optional short marker beside the title, e.g. "this bid". */
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useLocalStorage<boolean>(
    `bp_panel_${id}`,
    defaultOpen
  );

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 text-sm font-medium">
            {title}
            {badge}
          </span>
          {/* Only when shut. Open, the panel says all of this in full, and
              repeating it in the header is noise on the state that matters. */}
          {!open && (
            <span className="block text-xs text-muted-foreground truncate">
              {summary}
            </span>
          )}
        </span>
      </button>

      <div className={cn("px-4 pb-4 space-y-3", !open && "hidden")}>
        {children}
      </div>
    </div>
  );
}
