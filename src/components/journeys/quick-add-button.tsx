"use client";

import { useState } from "react";
import { useReactFlow, MarkerType, type Edge } from "@xyflow/react";
import { Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BLOCK_CATEGORIES, BLOCK_TYPES, type BlockType } from "@/data/journeys";
import { cn } from "@/lib/utils";

let quickAddCounter = 5000;

interface QuickAddButtonProps {
  sourceId: string;
  /** sourceHandle id for branching nodes (e.g. "yes", "no", "a", "b") */
  sourceHandle?: string;
  /** Label shown on the button, e.g. "Yes +" */
  label?: string;
}

export function QuickAddButton({ sourceId, sourceHandle, label }: QuickAddButtonProps) {
  const [open, setOpen] = useState(false);
  const { addNodes, addEdges, getNode, getEdges, setEdges } = useReactFlow();

  function addBlock(block: BlockType) {
    const sourceNode = getNode(sourceId);
    const sx = sourceNode?.position.x ?? 0;
    const sy = sourceNode?.position.y ?? 0;
    const nodeH = (sourceNode?.measured?.height ?? sourceNode?.height ?? 100) as number;

    const newId = `quick-${++quickAddCounter}`;
    const newPosition = { x: sx, y: sy + nodeH + 80 };

    addNodes([
      {
        id: newId,
        type: block.nodeKind,
        position: newPosition,
        data: { ...block.defaultData, blockType: block.type },
      },
    ]);

    // Splice behaviour: if there's already an edge leaving this source from
    // the same handle, rewire it through the new node — source → new → existing target.
    const existingOutgoing = getEdges().find(
      (e: Edge) =>
        e.source === sourceId &&
        (sourceHandle ? e.sourceHandle === sourceHandle : !e.sourceHandle)
    );

    const edgeStyle = {
      type: "smoothstep" as const,
      animated: true,
      style: { stroke: "var(--primary)", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
    };

    if (existingOutgoing) {
      // Splice: keep the existing edge's downstream target, but route through `newId`.
      setEdges((prev) =>
        prev.map((e) =>
          e.id === existingOutgoing.id
            ? { ...e, id: `e-${newId}-${existingOutgoing.target}`, source: newId, sourceHandle: undefined }
            : e
        )
      );
      addEdges([
        {
          id: `e-${sourceId}${sourceHandle ? `-${sourceHandle}` : ""}-${newId}`,
          source: sourceId,
          target: newId,
          ...(sourceHandle ? { sourceHandle } : {}),
          ...edgeStyle,
        },
      ]);
    } else {
      addEdges([
        {
          id: `e-${sourceId}${sourceHandle ? `-${sourceHandle}` : ""}-${newId}`,
          source: sourceId,
          target: newId,
          ...(sourceHandle ? { sourceHandle } : {}),
          ...edgeStyle,
        },
      ]);
    }

    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={(o) => setOpen(o)}>
      <PopoverTrigger
        className={cn(
          "flex h-5 items-center gap-0.5 rounded-full border border-border bg-card px-2 text-[10px] font-medium text-muted-foreground shadow-sm transition-all hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
        )}
      >
        <Plus className="h-3 w-3" />
        {label}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="center" className="w-60 p-1.5">
        <div className="max-h-72 overflow-y-auto">
          {BLOCK_CATEGORIES.map((cat) => {
            const items = BLOCK_TYPES.filter((b) => b.category === cat.id);
            if (items.length === 0) return null;
            const CatIcon = cat.icon;
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-1.5 px-1.5 py-1">
                  <span className={cat.color}>
                    <CatIcon className="h-3 w-3" />
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {cat.label}
                  </span>
                </div>
                {items.map((block) => {
                  const ItemIcon = block.icon;
                  return (
                    <button
                      key={block.type}
                      onClick={() => addBlock(block)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <span className={cat.color}>
                        <ItemIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 truncate">{block.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
