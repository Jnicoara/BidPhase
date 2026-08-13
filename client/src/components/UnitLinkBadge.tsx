/**
 * The chip that says whether a unit is a template, still following one, or has
 * been edited away from one.
 *
 * Three things carry the distinction, not one: different wording, different
 * colour, and a different icon. Colour alone would fail for anyone who cannot
 * see the difference between the accent and the sky tone, and this is exactly
 * the fact an estimator must not get wrong — "Edited" means the next template
 * push will skip this room.
 */
import { Link2, Link2Off, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";
import { BADGE_CLASSES, unitBadge, type UnitState } from "@/lib/unitLinks";

const ICONS = {
  template: LayoutTemplate,
  linked: Link2,
  forked: Link2Off,
} as const;

export function UnitLinkBadge({
  state,
  className,
}: {
  state: UnitState;
  className?: string;
}) {
  const badge = unitBadge(state);
  if (!badge) return null;

  const Icon = ICONS[badge.tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        "text-[10px] font-medium uppercase tracking-wide whitespace-nowrap",
        BADGE_CLASSES[badge.tone],
        className
      )}
      title={badge.title}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      {badge.text}
      {/* The chip text is an abbreviation; the sentence is what actually
          explains the state, so it goes to assistive tech in full. */}
      <span className="sr-only"> — {badge.title}</span>
    </span>
  );
}
