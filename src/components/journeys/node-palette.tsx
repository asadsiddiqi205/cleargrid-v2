"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronRight,
  Plus,
  X,
  PanelLeftClose,
  Boxes,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCK_CATEGORIES, BLOCK_TYPES, type BlockType } from "@/data/journeys";
import {
  createInstanceData,
  listMasters,
  seedComponentsIfEmpty,
  type ComponentMaster,
  COMPONENT_CATEGORIES,
  type ComponentCategory,
} from "@/data/components";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface NodePaletteProps {
  onAdd?: (block: BlockType) => void;
  onAddComponent?: (master: ComponentMaster) => void;
  onDeleteComponent?: (master: ComponentMaster) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function NodePalette({
  onAdd,
  onAddComponent,
  onDeleteComponent,
  collapsed = false,
  onToggleCollapsed,
}: NodePaletteProps) {
  const [search, setSearch] = useState("");
  const [manualExpanded, setManualExpanded] = useState<string[]>([]);
  const [componentsOpen, setComponentsOpen] = useState(false);
  const [componentFilters, setComponentFilters] = useState<ComponentCategory[]>([]);
  const [masters, setMasters] = useState<ComponentMaster[]>([]);

  // Hydrate + subscribe to store changes.
  useEffect(() => {
    seedComponentsIfEmpty();
    setMasters(listMasters());
    const on = () => setMasters(listMasters());
    window.addEventListener("cg:components:changed", on);
    return () => window.removeEventListener("cg:components:changed", on);
  }, []);

  const toggleCategory = (id: string) => {
    setManualExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onDragStart = (e: DragEvent<HTMLDivElement>, block: BlockType) => {
    const data = { ...block.defaultData, blockType: block.type };
    e.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ nodeType: block.nodeKind, blockType: block.type, data })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const onComponentDragStart = (e: DragEvent<HTMLDivElement>, master: ComponentMaster) => {
    const data = createInstanceData(master);
    e.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ nodeType: "component_instance", data }),
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const q = search.trim().toLowerCase();

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
    });
  }, [q]);

  const filteredComponents = useMemo(() => {
    return masters
      .filter((m) => (componentFilters.length ? componentFilters.includes(m.category) : true))
      .filter((m) => {
        if (!q) return true;
        return (
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
        );
      });
  }, [masters, componentFilters, q]);

  const isOpen = (catId: string) => {
    if (q) return true;
    return manualExpanded.includes(catId);
  };

  // Auto-expand Components when searching or when the palette-wide search hits.
  const componentsExpanded = q ? filteredComponents.length > 0 : componentsOpen;

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

  const renderStandardCategory = (cat: (typeof filtered)[number]) => {
    if (cat.items.length === 0) return null;
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
              : "text-muted-foreground hover:bg-accent/30 hover:text-foreground",
          )}
        >
          <span className={cat.color}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1 text-left">{cat.label}</span>
          <span className="text-[10px] text-muted-foreground">{cat.items.length}</span>
          <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
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
  };

  const flowCategoryIndex = filtered.findIndex((c) => c.id === "flow");
  const before = flowCategoryIndex >= 0 ? filtered.slice(0, flowCategoryIndex + 1) : filtered;
  const after = flowCategoryIndex >= 0 ? filtered.slice(flowCategoryIndex + 1) : [];

  return (
    <div className="flex h-full w-[240px] shrink-0 flex-col border-r border-border bg-card/60">
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

      <div className="border-b border-border/50 px-3 py-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks + components…"
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

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {before.map(renderStandardCategory)}

        {/* ═══════════ Components section (Part 3) ═══════════ */}
        <div>
          <button
            onClick={() => setComponentsOpen((s) => !s)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              componentsExpanded
                ? "bg-violet-500/15 text-violet-100"
                : "text-violet-300 hover:bg-violet-500/10 hover:text-violet-100",
            )}
          >
            <span className="text-violet-400">
              <Boxes className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1 text-left">Components</span>
            <span className="rounded bg-violet-500/20 px-1 py-px text-[10px] font-semibold text-violet-100">
              {masters.length}
            </span>
            <ChevronRight
              className={cn("h-3 w-3 transition-transform", componentsExpanded && "rotate-90")}
            />
          </button>

          {componentsExpanded && (
            <div className="mt-1 space-y-1.5 pl-1">
              {masters.length > 0 && (
                <div className="flex flex-wrap gap-1 px-1">
                  {COMPONENT_CATEGORIES.map((cat) => {
                    const active = componentFilters.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() =>
                          setComponentFilters((prev) =>
                            active ? prev.filter((c) => c !== cat) : [...prev, cat],
                          )
                        }
                        className={cn(
                          "rounded-full border px-1.5 py-px text-[9px] font-medium uppercase tracking-wider transition-colors",
                          active
                            ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                            : "border-border/60 text-muted-foreground hover:border-violet-500/40 hover:text-violet-200",
                        )}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-1 pl-2">
                {filteredComponents.length === 0 && masters.length === 0 && (
                  <div className="rounded-md border border-dashed border-violet-500/25 bg-violet-500/[0.04] px-2.5 py-3 text-center">
                    <Boxes className="mx-auto h-4 w-4 text-violet-400/60" />
                    <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                      No components yet. Select 2+ nodes on any journey canvas and choose{" "}
                      <span className="font-medium text-violet-200">Save as component</span> to
                      create one.
                    </p>
                  </div>
                )}
                {filteredComponents.length === 0 && masters.length > 0 && (
                  <p className="px-1 py-2 text-center text-[10px] text-muted-foreground">
                    No components match the current search / filters.
                  </p>
                )}
                {filteredComponents.map((m) => (
                  <div
                    key={m.id}
                    draggable
                    onDragStart={(e) => onComponentDragStart(e, m)}
                    onClick={() => onAddComponent?.(m)}
                    title={m.description}
                    className="group flex cursor-pointer items-start gap-2 rounded-md border border-violet-500/20 bg-violet-500/[0.06] px-2 py-1.5 text-[11px] text-foreground transition-colors hover:border-violet-400/60 hover:bg-violet-500/12 active:cursor-grabbing"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-violet-500/25 text-violet-200">
                      <Boxes className="h-2.5 w-2.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate font-medium">{m.name}</p>
                        <span className="shrink-0 rounded bg-violet-500/15 px-1 py-px text-[9px] font-medium text-violet-300">
                          v{m.version}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {m.description}
                      </p>
                      <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-violet-300/80">
                        {m.category}
                      </p>
                    </div>
                    <div className="flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Link
                        href={`/components/${m.id}/edit`}
                        onClick={(e) => e.stopPropagation()}
                        title="Edit master"
                        className="flex h-5 w-5 items-center justify-center rounded text-violet-300 hover:bg-violet-500/20 hover:text-violet-100"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </Link>
                      {onDeleteComponent && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteComponent(m);
                          }}
                          title="Delete component"
                          className="flex h-5 w-5 items-center justify-center rounded text-error-400 hover:bg-error-500/20"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {after.map(renderStandardCategory)}

        {filtered.every((c) => c.items.length === 0) && filteredComponents.length === 0 && (
          <div className="flex flex-col items-center justify-center px-3 py-8 text-center">
            <X className="h-5 w-5 text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">No matches</p>
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
