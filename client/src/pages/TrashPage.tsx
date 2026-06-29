/**
 * TrashPage — shows soft-deleted projects with restore and permanent delete.
 * Projects are retained for 30 days after deletion.
 */
import { useApp } from "@/contexts/AppContext";
import { Trash2, RotateCcw, X, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;

const CATEGORY_LABELS: Record<string, string> = {
  civil: "Civil & Underground",
  commercial: "Commercial",
  residential: "Residential",
};

export default function TrashPage({ onBack }: { onBack: () => void }) {
  const { trashedProjects, restoreProject, permanentlyDeleteProject } = useApp();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const now = Date.now();
  const sorted = [...trashedProjects].sort((a, b) => b.deletedAt - a.deletedAt);

  const daysLeft = (deletedAt: number) => {
    const remaining = MS_30_DAYS - (now - deletedAt);
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0 bg-card">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2">
          <Trash2 size={18} className="text-muted-foreground" />
          <h1
            className="text-base font-semibold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Trash
          </h1>
        </div>
        <span className="text-xs text-muted-foreground ml-1">
          Projects are permanently deleted after 30 days
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Trash2 size={40} strokeWidth={1} />
            <p className="text-sm">Trash is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
            {sorted.map((p) => {
              const pid = p.project.id;
              const pname = p.project.name;
              const days = daysLeft(p.deletedAt);
              const isExpired = days === 0;
              return (
                <div
                  key={pid}
                  className="bp-card p-4 flex flex-col gap-3 opacity-80 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{pname}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        days <= 3
                          ? "bg-destructive/20 text-destructive"
                          : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {isExpired ? "Expired" : `${days}d left`}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {!isExpired && (
                      <button
                        onClick={() => {
                          restoreProject(pid);
                          toast.success(`"${pname}" restored.`);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium
                                   bg-[#F5C518]/10 text-[#F5C518] border border-[#F5C518]/30
                                   hover:bg-[#F5C518]/20 transition-colors"
                      >
                        <RotateCcw size={12} /> Restore
                      </button>
                    )}
                    {confirmId === pid ? (
                      <div className="flex-1 flex gap-1">
                        <button
                          onClick={() => {
                            permanentlyDeleteProject(pid);
                            setConfirmId(null);
                            toast.success(`"${pname}" permanently deleted.`);
                          }}
                          className="flex-1 py-1.5 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2 py-1.5 rounded text-xs border border-border text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(pid)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium
                                   bg-muted/30 text-muted-foreground border border-border
                                   hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                      >
                        <Trash2 size={12} /> Delete Forever
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
