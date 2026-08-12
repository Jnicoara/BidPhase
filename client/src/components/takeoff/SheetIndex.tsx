/**
 * SheetIndex — every sheet in the set, by name, one click from the drawing.
 *
 * ── Why names and not page numbers ───────────────────────────────────────────
 * An estimator thinks "the panel schedule", not "page 23". Where the PDF
 * carries bookmarks — architectural sets very often do — those are the sheet's
 * real names and they go straight in. Where it does not, every sheet still gets
 * a label ("Sheet 3") that can be renamed, because a column of bare numbers is
 * the thing this panel exists to replace, and an unnamed row would send the
 * user back to clicking through pages to find out what each one is.
 *
 * The page number stays visible beside the name regardless, since it is how
 * people cross-reference against a printed set.
 *
 * ── Renaming ─────────────────────────────────────────────────────────────────
 * In place, following CLAUDE.md § Editing fields: the text selects on focus,
 * commits on Enter and on blur, Escape abandons back to the stored name, and a
 * real write flashes green. A rename is sticky — reopening the document never
 * overwrites it from the bookmarks again.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { selectOnFocus } from "@/lib/selectOnFocus";
import { FileText, Pencil, Ruler } from "lucide-react";
import { Input } from "@/components/ui/input";

const FLASH_MS = 1100;

export type IndexSheet = {
  id: number;
  pageNumber: number;
  name: string;
  nameSource: "bookmark" | "default" | "user";
  scaleRatio: number | null;
  scaleText: string | null;
};

function SheetRow({ sheet, isActive, onOpen, onRename }: {
  sheet: IndexSheet;
  isActive: boolean;
  onOpen: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sheet.name);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => { if (!editing) setDraft(sheet.name); }, [sheet.name, editing]);
  useEffect(() => () => {
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
  }, []);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    // Blank or unchanged writes nothing — and must not flash, because a
    // confirmation for a save that did not happen is worse than none.
    if (!next || next === sheet.name) { setDraft(sheet.name); return; }
    onRename(next);
    setFlash(true);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(false), FLASH_MS);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !editing && onOpen()}
      onKeyDown={e => {
        if (editing) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
      }}
      className={cn(
        "group flex items-start gap-2 px-3 py-2 cursor-pointer border-l-2 transition-colors",
        isActive
          ? "border-l-[#F5C518] bg-[#F5C518]/5"
          : "border-l-transparent hover:bg-muted/50",
        flash && "bg-emerald-500/10"
      )}
    >
      <span
        className={cn(
          "font-mono text-[0.7rem] tabular-nums mt-0.5 w-6 shrink-0 text-right",
          isActive ? "text-[#F5C518]" : "text-muted-foreground/60"
        )}
      >
        {sheet.pageNumber}
      </span>

      <div className="flex-1 min-w-0">
        {editing ? (
          <Input
            value={draft}
            autoFocus
            onChange={e => setDraft(e.target.value)}
            onFocus={selectOnFocus}
            onBlur={commit}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              if (e.key === "Escape") {
                e.preventDefault();
                setDraft(sheet.name);
                setEditing(false);
              }
            }}
            className="h-6 text-xs px-1.5"
            aria-label={`Name of sheet ${sheet.pageNumber}`}
          />
        ) : (
          <p
            className={cn(
              "text-sm truncate transition-colors",
              flash && "text-emerald-300",
              // A default label is visibly provisional, so it reads as
              // something to fix rather than as the sheet's actual name.
              sheet.nameSource === "default" && !flash && "text-muted-foreground italic"
            )}
            title={sheet.name}
          >
            {sheet.name}
          </p>
        )}

        {sheet.scaleText && (
          <span className="flex items-center gap-1 text-[0.7rem] text-muted-foreground/70 mt-0.5">
            <Ruler className="w-2.5 h-2.5" />
            <span className="font-mono">{sheet.scaleText}</span>
          </span>
        )}
      </div>

      {!editing && (
        <button
          onClick={e => { e.stopPropagation(); setDraft(sheet.name); setEditing(true); }}
          className="shrink-0 p-1 rounded text-muted-foreground/60 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground hover:bg-muted transition-all"
          aria-label={`Rename sheet ${sheet.pageNumber}`}
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {flash ? `Sheet ${sheet.pageNumber} renamed` : ""}
      </span>
    </div>
  );
}

export function SheetIndex({ sheets, activePage, onOpenPage, onRename, loading }: {
  sheets: IndexSheet[];
  activePage: number;
  onOpenPage: (pageNumber: number) => void;
  onRename: (sheetId: number, name: string) => void;
  loading?: boolean;
}) {
  const scaled = sheets.filter(s => s.scaleRatio !== null).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
          <FileText className="w-3 h-3" /> Sheets
          <span className="ml-auto normal-case tracking-normal">
            {sheets.length === 0 ? "" : `${scaled}/${sheets.length} scaled`}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-3 space-y-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-8 rounded bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : sheets.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            Sheets appear here once the document opens.
          </p>
        ) : (
          sheets.map(sheet => (
            <SheetRow
              key={sheet.id}
              sheet={sheet}
              isActive={sheet.pageNumber === activePage}
              onOpen={() => onOpenPage(sheet.pageNumber)}
              onRename={name => onRename(sheet.id, name)}
            />
          ))
        )}
      </div>
    </div>
  );
}
