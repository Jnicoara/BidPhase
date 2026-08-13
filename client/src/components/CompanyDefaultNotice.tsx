/**
 * The "this changes every future bid" warning.
 *
 * ── Where this belongs, and where it very much does not ──────────────────────
 * Only on the COMPANY-level controls. Overriding overhead, profit or the
 * productivity factor on one bid is an ordinary local edit and must keep
 * feeling like one — putting the same warning there would train people to read
 * past it, and then it stops working in the one place it matters.
 *
 * Same shape as the notice on LaborRateQuickEdit, deliberately: a contractor
 * who has learned what a yellow triangle in an edit panel means here should not
 * have to learn it again there. Both answer the same question — "am I changing
 * one thing or everything?" — and both answer it in the panel, at the moment of
 * the edit, rather than in a tooltip nobody opens.
 */
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompanyDefaultNotice({
  children,
  className,
}: {
  /** What this particular setting affects, in plain words. */
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-1.5 text-xs text-[#F5C518]",
        className
      )}
      // Announced with the field rather than as an alert: it is a standing fact
      // about the control, not an error that just happened.
      role="note"
    >
      <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
