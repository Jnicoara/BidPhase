/**
 * BidPhase — CatalogPicker
 *
 * A searchable inline picker that lets the user select a material from the
 * price catalog. Uses a React portal so the dropdown escapes any
 * overflow:hidden parent (e.g. scroll containers, rounded cards).
 *
 * Props:
 *   value        — currently selected catalog item id (or null)
 *   onChange     — called with the selected CatalogItem (or null to clear)
 *   placeholder  — input placeholder text
 *   className    — optional wrapper class
 *   disabled     — disables the trigger
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, X, ChevronDown, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATALOG, CATALOG_CATEGORIES, searchCatalog, getCatalogItem } from "@/lib/materialCatalog";
import type { CatalogItem } from "@/lib/materialCatalog";

interface CatalogPickerProps {
  value: string | null;
  onChange: (item: CatalogItem | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function CatalogPicker({
  value,
  onChange,
  placeholder = "Search catalog…",
  className,
  disabled,
}: CatalogPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  // Position of the dropdown portal
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedItem = value ? getCatalogItem(value) : null;

  // Compute dropdown position from trigger rect
  const computePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 360;
    // Prefer below, flip above if not enough space
    const spaceBelow = viewportHeight - rect.bottom;
    const top = spaceBelow >= dropdownHeight
      ? rect.bottom + 4
      : rect.top - dropdownHeight - 4;
    setDropdownPos({ top, left: rect.left, width: Math.max(rect.width, 320) });
  }, []);

  // Close on outside click (both trigger and dropdown)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && triggerRef.current.contains(target)
      ) return;
      if (
        dropdownRef.current && dropdownRef.current.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Recompute position on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const update = () => computePos();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, computePos]);

  const openPicker = () => {
    if (disabled) return;
    computePos();
    setOpen(true);
    setQuery("");
    setActiveCategory(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = useCallback((item: CatalogItem) => {
    onChange(item);
    setOpen(false);
    setQuery("");
  }, [onChange]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Filtered results
  const results = query.trim()
    ? searchCatalog(query, 40)
    : activeCategory
      ? CATALOG.filter((i) => i.category === activeCategory).slice(0, 40)
      : CATALOG.slice(0, 20);

  const dropdown = open && dropdownPos ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
      style={{
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        maxWidth: "90vw",
        maxHeight: "360px",
      }}
    >
      {/* Search input */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Search size={12} className="text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveCategory(null); }}
          placeholder="Search by name, category…"
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-mono"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={11} />
          </button>
        )}
      </div>

      {/* Category chips (only shown when no query) */}
      {!query && (
        <div className="flex gap-1.5 px-3 py-2 border-b border-border/50 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn("shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border",
              !activeCategory ? "bg-[#F5C518] text-black border-[#F5C518]" : "bg-transparent text-muted-foreground border-border hover:border-[#F5C518]/40"
            )}
          >All</button>
          {CATALOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn("shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border whitespace-nowrap",
                activeCategory === cat ? "bg-[#F5C518] text-black border-[#F5C518]" : "bg-transparent text-muted-foreground border-border hover:border-[#F5C518]/40"
              )}
            >{cat}</button>
          ))}
        </div>
      )}

      {/* Results list */}
      <div className="overflow-y-auto flex-1">
        {results.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">No items found for "{query}"</div>
        ) : (
          results.map((item) => (
            <button
              key={item.id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/30",
                value === item.id && "bg-[#F5C518]/10"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className={cn("text-xs font-medium truncate", value === item.id ? "text-[#F5C518]" : "text-foreground")}>
                  {item.description}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">{item.category}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-bold font-mono text-[#F5C518]">${item.unitPrice.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground font-mono">/{item.unit}</div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-border/50 shrink-0">
        <p className="text-[10px] text-muted-foreground">{CATALOG.length} items in catalog · prices are editable after selection</p>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={cn("relative", className)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-all",
          "bg-muted/20 border-border text-left",
          "hover:border-[#F5C518]/50 hover:bg-muted/30",
          "focus:outline-none focus:border-[#F5C518]/70",
          disabled && "opacity-50 cursor-not-allowed",
          open && "border-[#F5C518]/70 bg-muted/30"
        )}
      >
        <Tag size={11} className={cn("shrink-0", selectedItem ? "text-[#F5C518]" : "text-muted-foreground")} />
        <span className={cn("flex-1 truncate font-mono", selectedItem ? "text-foreground" : "text-muted-foreground")}>
          {selectedItem ? selectedItem.description : placeholder}
        </span>
        {selectedItem ? (
          <>
            <span className="text-[10px] font-mono text-[#F5C518] shrink-0">${selectedItem.unitPrice.toFixed(2)}/{selectedItem.unit}</span>
            <button
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleClear(e); }}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors ml-1"
              title="Clear selection"
            >
              <X size={11} />
            </button>
          </>
        ) : (
          <ChevronDown size={11} className="shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Portal dropdown */}
      {dropdown}
    </div>
  );
}
