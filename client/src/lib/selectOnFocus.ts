/**
 * Select-on-focus for numeric inputs that are NOT self-saving.
 *
 * Fields inside an explicit Save/Cancel form keep their own draft state, so
 * they do not want InlineNumberField's commit-on-blur. They still owe the user
 * rule 1 from CLAUDE.md § Editing fields: clicking or tabbing into a number
 * selects it, so typing replaces rather than appends.
 *
 * Usage:  <Input inputMode="decimal" onFocus={selectOnFocus} … />
 */
import type { FocusEvent } from "react";

export function selectOnFocus(
  // Textareas take the same treatment — a multi-line address field is still a
  // field somebody tabs into meaning to replace what is there.
  event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>
): void {
  // `select()` on an already-focused element is a no-op, so this is safe to
  // attach unconditionally.
  event.target.select();
}
