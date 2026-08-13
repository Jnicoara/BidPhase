/**
 * What a unit's link state means on screen, and what the two destructive
 * template actions say before they run.
 *
 * Separated from the components for the same reason `archiveBid.ts` is: the
 * wording of a confirmation is the part that has to be right, and a string
 * buried in JSX gets tested by nobody. The components below are wiring.
 */

export type UnitRole = "template" | "linked" | "forked" | "standalone";

export type UnitState = {
  label: string;
  role: UnitRole;
  templateLabel: string | null;
  linkedCount: number;
  forkedCount: number;
};

export type BadgeTone = "template" | "linked" | "forked";

export type UnitBadge = {
  tone: BadgeTone;
  /** Short text on the chip itself. */
  text: string;
  /** The full sentence, for a tooltip and for screen readers. */
  title: string;
};

/**
 * The chip shown beside a unit's name, or null for a one-off label.
 *
 * A standalone unit gets NO badge on purpose. Most bids never use templates at
 * all, and decorating every hand-typed label with "not linked" would put a
 * feature they are not using in front of them on every row.
 */
export function unitBadge(state: UnitState): UnitBadge | null {
  switch (state.role) {
    case "template": {
      const total = state.linkedCount + state.forkedCount;
      return {
        tone: "template",
        text: `Template · ${total}`,
        title:
          state.forkedCount === 0
            ? `Template for ${plural(total, "copy", "copies")}.`
            : `Template for ${plural(total, "copy", "copies")} — ` +
              `${state.linkedCount} still following, ${state.forkedCount} edited separately.`,
      };
    }
    case "linked":
      return {
        tone: "linked",
        text: "Linked",
        title:
          `Follows ${state.templateLabel ?? "its template"}. ` +
          `Editing this copy directly will unlink it.`,
      };
    case "forked":
      return {
        tone: "forked",
        text: "Edited",
        title:
          `Was copied from ${state.templateLabel ?? "a template"}, ` +
          `then edited — template changes no longer reach it.`,
      };
    case "standalone":
      return null;
  }
}

/** Tailwind classes per tone, so the three states are told apart by more than colour. */
export const BADGE_CLASSES: Record<BadgeTone, string> = {
  // The source. Solid accent — it is the thing others depend on.
  template: "border-[#F5C518]/40 bg-[#F5C518]/10 text-[#F5C518]",
  // Following. Quiet, because this is the default and most numerous state.
  linked: "border-border bg-muted/60 text-muted-foreground",
  // Broken away. Distinct hue AND different wording, never colour alone.
  forked: "border-sky-500/40 bg-sky-500/10 text-sky-400",
};

export type ConfirmCopy = { title: string; body: string; confirm: string };

/**
 * Pushing a template's lines onto its linked copies.
 *
 * The count is in the title rather than the body because it is the whole
 * decision: "update 3 rooms" and "update 140 rooms" are different actions, and
 * someone dismissing a dialog reads the title and nothing else.
 */
export function pushConfirmCopy(
  templateLabel: string,
  linkedCount: number,
  forkedCount: number
): ConfirmCopy {
  return {
    title: `Update ${plural(linkedCount, "copy", "copies")} of ${templateLabel}?`,
    body:
      `Each one is rebuilt from ${templateLabel} as it stands now — added lines appear, ` +
      `removed lines go, quantities match.` +
      (forkedCount > 0
        ? ` ${plural(forkedCount, "copy", "copies")} you edited separately ${
            forkedCount === 1 ? "is" : "are"
          } left alone.`
        : ""),
    confirm: `Update ${linkedCount}`,
  };
}

/**
 * Archiving every copy still following a template.
 *
 * Says "archive", not "delete", and says where they go — the recoverability is
 * the reason this is allowed to be a single click on forty rooms at once.
 */
export function archiveCopiesConfirmCopy(
  templateLabel: string,
  linkedCount: number,
  forkedCount: number
): ConfirmCopy {
  return {
    title: `Archive ${plural(linkedCount, "copy", "copies")} of ${templateLabel}?`,
    body:
      `They come off the bid and the total drops to match. ${templateLabel} itself stays.` +
      (forkedCount > 0
        ? ` ${plural(forkedCount, "copy", "copies")} you edited separately ${
            forkedCount === 1 ? "is" : "are"
          } kept.`
        : "") +
      ` You can undo this straight afterwards.`,
    confirm: `Archive ${linkedCount}`,
  };
}

/**
 * Whether a template offers its bulk actions at all.
 *
 * Zero linked copies means both actions are no-ops, and a button that does
 * nothing is worse than no button — it reads as broken rather than empty.
 */
export function templateActionsEnabled(state: UnitState): boolean {
  return state.role === "template" && state.linkedCount > 0;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
