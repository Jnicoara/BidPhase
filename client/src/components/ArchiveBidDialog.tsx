/**
 * ArchiveBidDialog — the one confirmation in front of removing a bid.
 *
 * Shared by the Dashboard and the Bids list so the two cannot drift: before
 * this existed, one asked and the other archived on a single click.
 *
 * The wording and the confirm/cancel decision come from @/lib/archiveBid, which
 * is tested. This file is the wiring.
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  archiveConfirmCopy,
  resolveArchiveAnswer,
  type PendingArchive,
} from "@/lib/archiveBid";

export function ArchiveBidDialog({
  pending,
  onClose,
  onArchive,
}: {
  /** The bid awaiting an answer, or null when the dialog is closed. */
  pending: PendingArchive | null;
  onClose: () => void;
  onArchive: (id: number) => void;
}) {
  const copy = pending ? archiveConfirmCopy(pending.name) : null;

  const answer = (which: "confirm" | "cancel" | "dismiss") => {
    const decision = resolveArchiveAnswer(pending, which);
    if (decision.action === "archive") onArchive(decision.id);
    onClose();
  };

  return (
    <AlertDialog
      open={pending !== null}
      // Escape and a click outside both land here, and both mean "no".
      onOpenChange={open => {
        if (!open) answer("dismiss");
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Cancel is the default focus, so Enter on a dialog someone did not
              mean to open keeps the bid rather than archiving it. */}
          <AlertDialogCancel onClick={() => answer("cancel")}>
            Keep it
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => answer("confirm")}>
            Archive bid
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
