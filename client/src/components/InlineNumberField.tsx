/**
 * InlineNumberField — the one numeric field that saves as you go.
 *
 * Implements all five editing rules from CLAUDE.md § Editing fields so a screen
 * cannot pick up four of them and miss the fifth:
 *
 *   • select-on-focus  — typing replaces the value; no manual clearing
 *   • Enter / blur     — commit
 *   • Escape           — abandon the edit, snap back to the saved value
 *   • save flash       — a brief tick confirming the write landed
 *   • panel dismiss    — in a popover, Enter and Escape also close it, so
 *                        neither leaves the user to click away by hand
 *                        (pass `onDismiss`)
 *
 * The decision logic is in @/lib/inlineEdit and is tested there; this file is
 * the wiring. Use it for any field that persists on its own. Fields inside an
 * explicit Save/Cancel form are a different pattern — those want
 * `selectOnFocus` alone (see @/lib/selectOnFocus).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  commitNumericEdit,
  formatForEdit,
  planFieldKey,
  revertToSaved,
  type NumericFieldRules,
} from "@/lib/inlineEdit";

/** How long the confirmation tick stays up. Long enough to notice, short
 *  enough not to linger while tabbing down a column of figures. */
const FLASH_MS = 1100;

export function InlineNumberField({
  value,
  onSave,
  rules,
  className,
  ariaLabel,
  suffix,
  disabled,
  onDismiss,
}: {
  /** The saved value. Escape and invalid input both snap back to this. */
  value: number;
  /** Called only when the draft is valid AND different. */
  onSave: (next: number) => void;
  rules?: NumericFieldRules;
  className?: string;
  ariaLabel: string;
  /** Static text after the field, e.g. "%" or "h". */
  suffix?: string;
  disabled?: boolean;
  /**
   * Close the panel this field sits in. Supplying it makes the field a "panel"
   * field: Enter commits AND closes, Escape reverts AND closes, so neither
   * leaves the user to dismiss the panel by hand (CLAUDE.md § Editing fields,
   * rule 5). Omit it for a field in a row or form that stays put.
   *
   * On a panel with several fields, pass this to the LAST one only.
   */
  onDismiss?: () => void;
}) {
  const [draft, setDraft] = useState(() => formatForEdit(value));
  const [flash, setFlash] = useState(false);
  const editing = useRef(false);
  const flashTimer = useRef<number | null>(null);
  // Set when a keystroke has already settled the field, so the blur that
  // follows a closing panel does not commit the same draft a second time and
  // fire a duplicate write. Any further typing clears it — see onChange.
  const settledByKey = useRef(false);

  // Follow the saved value when it changes underneath us — a refetch, an
  // optimistic rollback — but never while the user is mid-edit, which would
  // yank the text out from under them.
  useEffect(() => {
    if (editing.current) return;
    setDraft(formatForEdit(value));
  }, [value]);

  useEffect(
    () => () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    },
    []
  );

  const showFlash = useCallback(() => {
    setFlash(true);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(false), FLASH_MS);
  }, []);

  const commit = useCallback(() => {
    const outcome = commitNumericEdit(draft, value, rules);
    if (outcome.action === "save") {
      onSave(outcome.value);
      setDraft(formatForEdit(outcome.value));
      showFlash();
      return;
    }
    // Both "revert" and "none" put the field back in step with what is stored.
    // Neither flashes: nothing was written, and a tick would claim otherwise.
    setDraft(revertToSaved(value));
  }, [draft, value, rules, onSave, showFlash]);

  return (
    <span className="inline-flex items-center">
      <Input
        value={draft}
        disabled={disabled}
        onChange={e => {
          settledByKey.current = false;
          setDraft(e.target.value);
        }}
        onFocus={e => {
          editing.current = true;
          // Select the lot so the first keystroke replaces it.
          e.target.select();
        }}
        onBlur={() => {
          editing.current = false;
          if (settledByKey.current) return;
          commit();
        }}
        onKeyDown={e => {
          const plan = planFieldKey(e.key, onDismiss ? "panel" : "inline");
          if (plan.action === "pass") return;

          e.preventDefault();
          const input = e.target as HTMLInputElement;

          if (plan.action === "commit") {
            commit();
            if (plan.keepFocus) {
              // Entering a column of numbers should not need a re-click after
              // every one.
              input.select();
            }
            if (plan.dismiss) {
              settledByKey.current = true;
              editing.current = false;
              onDismiss?.();
            }
            return;
          }

          // Abandon: snap back to what is stored and write nothing.
          // stopPropagation so Escape settles the field without also reaching
          // whatever encloses it; closing is this field's call to make, below.
          e.stopPropagation();
          setDraft(revertToSaved(value));
          editing.current = false;
          settledByKey.current = true;
          if (plan.dismiss) {
            onDismiss?.();
            return;
          }
          input.blur();
        }}
        inputMode="decimal"
        aria-label={ariaLabel}
        // The confirmation is on the field itself rather than a floating tick:
        // it cannot be clipped by a scrolling row, it shifts no layout, and it
        // is unmissable next to the number that just changed.
        data-saved={flash ? "true" : undefined}
        className={cn(
          "text-right transition-colors duration-200",
          flash && "border-emerald-500 bg-emerald-500/10 text-emerald-300",
          className
        )}
      />
      {suffix && (
        <span className="ml-1 text-xs text-muted-foreground">{suffix}</span>
      )}
      {/* Announce the save to assistive tech, which cannot see the colour. */}
      <span className="sr-only" role="status" aria-live="polite">
        {flash ? `${ariaLabel} saved` : ""}
      </span>
    </span>
  );
}
