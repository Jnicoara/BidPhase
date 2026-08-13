/**
 * The getting-started checklist on the Dashboard.
 *
 * ── It reports, it does not congratulate ─────────────────────────────────────
 * Every tick comes from the user's real data (see shared/onboarding.ts): a step
 * is done because the thing exists, never because a screen was opened. A
 * checklist that ticks itself when you visit a page is worse than none — a new
 * user follows it to the end, believes they are set up, and finds out they are
 * not when a bid comes back wrong.
 *
 * ── Dismissible means dismissible ────────────────────────────────────────────
 * Closing it hides it for good until the user asks for it back, and asking for
 * it back is one click on the Dashboard. It also disappears on its own once
 * every step is done, because a list of things you have already finished is
 * clutter dressed up as encouragement.
 */
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  completedCount,
  isChecklistComplete,
  type OnboardingStep,
} from "@shared/onboarding";

export function GettingStartedChecklist() {
  const utils = trpc.useUtils();
  const { data } = trpc.onboarding.state.useQuery();

  const dismiss = trpc.onboarding.dismissChecklist.useMutation({
    onSuccess: () => utils.onboarding.state.invalidate(),
  });
  const restore = trpc.onboarding.restoreChecklist.useMutation({
    onSuccess: () => utils.onboarding.state.invalidate(),
  });

  if (!data) return null;

  const steps = data.steps as OnboardingStep[];
  const done = completedCount(steps);
  const finished = isChecklistComplete(steps);

  // Finished means finished: it goes away without being dismissed, and does not
  // come back. The restore button below is for people who dismissed it early.
  if (finished) return null;

  if (data.checklistDismissed) {
    return (
      <button
        onClick={() => restore.mutate()}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        Show getting started ({done}/{steps.length})
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <Rocket className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Getting started</h2>
            <span className="text-xs text-muted-foreground">
              {done} of {steps.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each of these makes the next bid more accurate than the last.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => dismiss.mutate()}
          aria-label="Hide the getting started checklist"
          title="Hide — you can bring it back any time"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <ol className="mt-3 space-y-1">
        {steps.map(step => (
          <li key={step.id}>
            <a
              href={step.href}
              className={cn(
                "flex items-start gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors group",
                step.done ? "opacity-60" : "hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                  step.done
                    ? "bg-[#F5C518]/20 border-[#F5C518]/40"
                    : "border-border"
                )}
                aria-hidden
              >
                {step.done && <Check className="w-2.5 h-2.5 text-[#F5C518]" />}
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm block",
                    step.done && "line-through text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
                {!step.done && (
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    {step.detail}
                  </span>
                )}
              </span>
              {!step.done && (
                <ArrowRight className="w-3.5 h-3.5 mt-1 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              <span className="sr-only">
                {step.done ? "Done" : "Not done yet"}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
