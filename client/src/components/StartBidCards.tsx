/**
 * The two ways to start a bid, on the Dashboard where someone looks first.
 *
 * ── Why two, side by side, and not a choice screen ───────────────────────────
 * These are the two real shapes a job arrives in: a drawing set to take off, or
 * a count already in someone's head. They are genuinely different work, so
 * merging them would mean putting a file picker in front of Quick Bid — whose
 * entire value is that it needs no file — and a choice screen in between would
 * add a click before either path had started. Two doors, both open.
 *
 * ── They are not the only way, and do not pretend to be ──────────────────────
 * The Dashboard header keeps a quieter "New bid" for the case neither door
 * fits: setting up a shell to hold a name, a due date and a client before any
 * pricing exists. Three equally loud buttons would be no emphasis at all, so
 * that one stays deliberately plain.
 *
 * ── Uploading takes the file FIRST ───────────────────────────────────────────
 * A plan cannot exist without a bid, so this creates one — named after the file
 * — and hands the file to the Takeoff screen through lib/pendingPlanUpload.
 * Asking for a bid name first would put a form in front of the single action
 * the button offers, which is the friction the whole entry point exists to
 * remove. The name is editable the moment the screen opens.
 */
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { FileUp, Zap } from "lucide-react";
import { MAX_PDF_BYTES, formatBytes } from "@shared/uploadLimits";

function StartCard({
  icon: Icon,
  title,
  body,
  footnote,
  onClick,
  disabled,
  accent,
}: {
  icon: typeof FileUp;
  title: string;
  body: string;
  footnote: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex-1 min-w-0 text-left rounded-xl border bg-card px-4 py-3.5",
        "transition-colors focus-visible:outline-none focus-visible:border-[#F5C518]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        accent
          ? "border-[#F5C518]/30 hover:border-[#F5C518]/60 hover:bg-[#F5C518]/[0.04]"
          : "border-border hover:border-border/80 hover:bg-muted/20"
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
            accent
              ? "bg-[#F5C518]/10 text-[#F5C518]"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Icon className="w-4 h-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs text-muted-foreground">{body}</span>
        </span>
      </div>
      <p className="text-[0.7rem] text-muted-foreground/70 mt-2">{footnote}</p>
    </button>
  );
}

export function StartBidCards({
  onUploadPlan,
  onQuickBid,
  busy,
}: {
  /** Called with the chosen PDF. Creates the bid and opens its Takeoff screen. */
  onUploadPlan: (file: File) => void;
  onQuickBid: () => void;
  /** True while a bid is being created, so the card cannot be fired twice. */
  busy?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          // Cleared immediately so choosing the SAME file again still fires a
          // change event — otherwise a failed first attempt could not be
          // repeated from the picker.
          e.target.value = "";
          if (file) onUploadPlan(file);
        }}
      />

      <StartCard
        icon={FileUp}
        accent
        title="Upload a plan"
        body="Start from a drawing set and take it off"
        footnote={`PDF, up to ${formatBytes(MAX_PDF_BYTES)}. Creates the bid for you.`}
        disabled={busy}
        onClick={() => fileInput.current?.click()}
      />

      <StartCard
        icon={Zap}
        title="Quick bid"
        body="Count it out without a plan"
        footnote="Type, pick, Enter. No file needed."
        disabled={busy}
        onClick={onQuickBid}
      />
    </div>
  );
}
