"use client";

import { useMemo, useState, type DragEvent } from "react";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronRight,
  Plus,
  X,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCK_CATEGORIES, BLOCK_TYPES, type BlockType } from "@/data/journeys";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface NodePaletteProps {
  onAdd?: (block: BlockType) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function NodePalette({ onAdd, collapsed = false, onToggleCollapsed }: NodePaletteProps) {
  const [search, setSearch] = useState("");
  // All categories collapsed by default — search drives discovery
  const [manualExpanded, setManualExpanded] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    setManualExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onDragStart = (e: DragEvent<HTMLDivElement>, block: BlockType) => {
    const data = { ...block.defaultData, blockType: block.type };
    e.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({
        nodeType: block.nodeKind,
        blockType: block.type,
        data,
      })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const q = search.trim().toLowerCase();

  // Filtered categories with counts
  const filtered = useMemo(() => {
    return BLOCK_CATEGORIES.map((cat) => {
      const items = BLOCK_TYPES.filter((b) => b.category === cat.id).filter((b) => {
        if (!q) return true;
        return (
          b.label.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q)
        );
      });
      return { ...cat, items };
    }).filter((c) => c.items.length > 0);
  }, [q]);

  // A category is open if: searching (auto-expand all matches) OR manually expanded
  const isOpen = (catId: string) => {
    if (q) return true;
    return manualExpanded.includes(catId);
  };

  if (collapsed) {
    return (
      <div className="flex h-full w-10 shrink-0 flex-col items-center border-r border-border bg-card/40 py-3">
        <button
          onClick={onToggleCollapsed}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Show blocks"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-[240px] shrink-0 flex-col border-r border-border bg-card/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Blocks
        </h3>
        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Hide blocks"
          >
            <PanelLeftClose className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="border-b border-border/50 px-3 py-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks (e.g. Send Email, Wait, Split...)"
            className="h-8 pl-8 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {!q && (
          <p className="mt-1.5 text-[10px] text-muted-foreground/60">
            Search or expand a category below
          </p>
        )}
      </div>

      {/* Categories */}
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {filtered.map((cat) => {
          const open = isOpen(cat.id);
          const Icon = cat.icon;
          return (
            <div key={cat.id}>
              <button
                onClick={() => toggleCategory(cat.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  open
                    ? "bg-accent/50 text-foreground"
                    : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                )}
              >
                <span className={cat.color}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1 text-left">{cat.label}</span>
                <span className="text-[10px] text-muted-foreground">{cat.items.length}</span>
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-transform",
                    open && "rotate-90"
                  )}
                />
              </button>
              {open && (
                <div className="space-y-0.5 pl-3 pt-1">
                  {cat.items.map((block) => {
                    const ItemIcon = block.icon;
                    return (
                      <div
                        key={block.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, block)}
                        onClick={() => onAdd?.(block)}
                        title={block.description}
                        className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground active:cursor-grabbing"
                      >
                        <span className={cn("transition-colors", cat.color)}>
                          <ItemIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1 truncate">{block.label}</span>
                        <Plus className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center px-3 py-8 text-center">
            <X className="h-5 w-5 text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">No blocks match</p>
            <button
              onClick={() => setSearch("")}
              className="mt-2 text-[10px] text-primary hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
