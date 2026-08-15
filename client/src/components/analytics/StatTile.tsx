/**
 * One headline figure.
 *
 * ── A tile, not a one-bar chart ──────────────────────────────────────────────
 * A single current value is read faster as a number than as a mark on an axis,
 * and the axis costs space that a dashboard does not have. Charts on this screen
 * are reserved for things that change over time or split into parts.
 *
 * ── An absent figure says so ─────────────────────────────────────────────────
 * `value` is whatever the caller formatted, and every formatter in
 * lib/analyticsChart renders a null as an em dash rather than as a zero. That
 * distinction runs through this whole feature: a company with nothing decided
 * yet has no win rate, which is a different statement from a win rate of 0%.
 */
import { cn } from "@/lib/utils";

export type StatTone = "good" | "bad" | "neutral";

const TONE_TEXT: Record<StatTone, string> = {
  // Text tokens, not chart colours. The chart palette is for marks; a coloured
  // word has to clear text contrast, which the mark colours are not chosen for.
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-destructive",
  neutral: "text-muted-foreground",
};

export function StatTile({
  label,
  value,
  hint,
  delta,
  tone = "neutral",
  hero = false,
}: {
  label: string;
  value: string;
  /** The quiet line underneath — what the figure is of, or what it excludes. */
  hint?: string;
  /** A signed comparison, already formatted. */
  delta?: string;
  tone?: StatTone;
  /** The one figure the screen leads with. Exactly one per view. */
  hero?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-semibold text-foreground",
          // Proportional figures, deliberately: tabular-nums gives every digit
          // the width of a zero, which makes a large standalone number look
          // gappy. Tabular is for columns, and the tables below use it.
          hero ? "text-4xl leading-none" : "text-xl"
        )}
      >
        {value}
      </p>
      {delta && (
        <p className={cn("mt-1 text-xs font-medium", TONE_TEXT[tone])}>
          {delta}
        </p>
      )}
      {hint && (
        <p className="mt-1 text-[0.7rem] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
