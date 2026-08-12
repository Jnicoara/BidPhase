/**
 * UploadProgress — what a large plan set is doing while it uploads.
 *
 * ── Why a bar and not a spinner ──────────────────────────────────────────────
 * A 150MB set takes minutes on a site connection, and a spinner says only "not
 * finished". It cannot distinguish moving slowly from stalled, so the honest
 * reading of a spinner after two minutes is "this has hung", and people cancel
 * work that was about to succeed. The standing rule is that genuinely slow work
 * gets an honest indicator, ideally with progress rather than an indeterminate
 * spinner — this is the case that rule was written for.
 *
 * So every job shows a filled bar, a percentage, and how many megabytes of how
 * many have actually left the browser. Those numbers come from the transfer
 * itself (XHR upload progress), not from a timer pretending to be one.
 *
 * ── After the bytes ──────────────────────────────────────────────────────────
 * Reaching 100% is not the end: the sheet still has to be recorded. That step
 * is fast but not instant, and a bar sitting full with nothing happening reads
 * as frozen, so it gets its own "Finishing…" state.
 *
 * ── Failures stay ────────────────────────────────────────────────────────────
 * A finished upload disappears — the sheet it produced is the confirmation. A
 * failed one stays with its reason, because a toast is gone in seconds and the
 * user needs to know WHICH file of five did not make it and why.
 */
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@shared/uploadLimits";

export type UploadJobView = {
  filename: string;
  byteSize: number;
  sent: number;
  state: "waiting" | "uploading" | "finishing" | "done" | "failed";
  error?: string;
};

export function UploadProgress({ jobs, onCancel, onDismiss }: {
  jobs: UploadJobView[];
  /** Abort the transfer in flight. */
  onCancel: () => void;
  /** Clear a failed row the user has read. */
  onDismiss: (index: number) => void;
}) {
  if (jobs.length === 0) return null;

  return (
    <div className="border-b border-border bg-card px-4 py-2.5 space-y-2 shrink-0">
      {jobs.map((job, index) => {
        const failed = job.state === "failed";
        // Guard the divide: a zero-byte file is refused before it gets here,
        // but a NaN width would break the bar rather than show an empty one.
        const pct = job.byteSize > 0
          ? Math.min(100, Math.round((job.sent / job.byteSize) * 100))
          : 0;

        return (
          <div key={`${job.filename}-${index}`}>
            <div className="flex items-center gap-2">
              {failed ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-destructive" />
              ) : (
                <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-[#F5C518]" />
              )}

              <span className="text-xs truncate flex-1 min-w-0" title={job.filename}>
                {job.filename}
              </span>

              {failed ? (
                <Button
                  size="sm" variant="ghost"
                  className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => onDismiss(index)}
                  aria-label={`Dismiss ${job.filename}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              ) : (
                <>
                  <span className="text-[0.7rem] font-mono tabular-nums text-muted-foreground shrink-0">
                    {job.state === "finishing"
                      ? "Finishing…"
                      : job.state === "waiting"
                        ? "Queued"
                        : `${pct}% · ${formatBytes(job.sent)} of ${formatBytes(job.byteSize)}`}
                  </span>
                  {job.state === "uploading" && (
                    <Button
                      size="sm" variant="ghost"
                      className="h-6 px-1.5 shrink-0 text-[0.7rem] text-muted-foreground hover:text-destructive"
                      onClick={onCancel}
                    >
                      Cancel
                    </Button>
                  )}
                </>
              )}
            </div>

            {failed ? (
              <p className="text-[0.7rem] text-destructive mt-0.5 ml-5.5 pl-0.5">{job.error}</p>
            ) : (
              <div
                className="h-1 mt-1.5 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={job.state === "finishing" ? 100 : pct}
                aria-label={`Uploading ${job.filename}`}
              >
                <div
                  className={cn(
                    "h-full rounded-full bg-[#F5C518] transition-[width] duration-200",
                    // The record-the-sheet step has no measurable progress, so
                    // the full bar pulses rather than sitting inert.
                    job.state === "finishing" && "animate-pulse"
                  )}
                  style={{ width: `${job.state === "finishing" ? 100 : pct}%` }}
                />
              </div>
            )}

            {/* Announced for anyone who cannot see the bar. Percentage only, so
                it is not read out on every progress event. */}
            <span className="sr-only" role="status" aria-live="polite">
              {job.state === "failed"
                ? `${job.filename} failed: ${job.error}`
                : job.state === "done"
                  ? `${job.filename} uploaded`
                  : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
