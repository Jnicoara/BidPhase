/**
 * PriceSyncDialog
 *
 * Shown whenever a user edits a price in the Unit Count panel (or any other
 * estimating surface) and the new price differs from what is stored in their
 * Material Database.  Gives them a one-click way to push the updated price
 * back to the database so every tool (run tool, catalog picker, material DB
 * search) stays in sync.
 *
 * Props
 * ─────
 * open           – controls dialog visibility
 * onOpenChange   – called when the dialog should close
 * description    – human-readable material name shown in the prompt
 * newPrice       – the price the user just entered
 * category       – optional category for new-row inserts
 * unit           – optional unit for new-row inserts
 * onSynced       – called after a successful DB write (so parent can
 *                  invalidate queries or show a toast)
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Database, X } from "lucide-react";

interface PriceSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  newPrice: number;
  category?: string;
  unit?: string;
  onSynced?: (wasUpdate: boolean) => void;
}

export function PriceSyncDialog({
  open,
  onOpenChange,
  description,
  newPrice,
  category,
  unit,
  onSynced,
}: PriceSyncDialogProps) {
  const utils = trpc.useUtils();

  const upsert = trpc.data.materials.upsertPriceByDescription.useMutation({
    onSuccess: (result) => {
      utils.data.materials.list.invalidate();
      const msg = result.updated
        ? `Price updated in Material Database.`
        : `"${description}" added to Material Database at $${newPrice.toFixed(2)}.`;
      toast.success(msg);
      onSynced?.(result.updated);
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(`Failed to sync price: ${err.message}`);
    },
  });

  const handleSync = () => {
    upsert.mutate({
      description,
      userPrice: newPrice,
      category,
      unit,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-4 h-4 text-yellow-400" />
            Update Material Database?
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-1">
            You set a custom price of{" "}
            <span className="font-semibold text-foreground">
              ${newPrice.toFixed(2)}
            </span>{" "}
            for{" "}
            <span className="font-semibold text-foreground">
              {description}
            </span>
            .
            <br />
            <br />
            Would you like to save this price to your Material Database so it
            applies everywhere — including the run tool, catalog picker, and
            future estimates?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Keep Local Only
          </Button>
          <Button
            size="sm"
            onClick={handleSync}
            disabled={upsert.isPending}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5" />
            {upsert.isPending ? "Saving…" : "Yes, Update Database"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
