"use client";

import { useCallback, useRef, useState } from "react";
import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react";
import { Box, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlockType, getBlockCategory } from "@/data/journeys";
import { QuickAddButton } from "@/components/journeys/quick-add-button";

const SCOPE_BADGE: Record<string, string> = {
  borrower: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  account: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  sub_account: "bg-orange-500/15 text-orange-300 border-orange-500/30",
};

const SCOPE_LABELS: Record<string, string> = {
  borrower: "Borrower",
  account: "Account",
  sub_account: "Sub-account",
};

const HANDLE_CLS = "!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-[var(--primary)]";

export function GenericNode({ id, data, selected }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(true);
  }, []);
  const onMouseLeave = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHovered(false), 200);
  }, []);

  const blockType = (data.blockType as string) || "";
  const block = getBlockType(blockType);
  const category = block ? getBlockCategory(block.category) : undefined;

  const Icon = block?.icon ?? Box;
  const accent = category?.accent ?? "#6b7280";
  const colorCls = category?.color ?? "text-muted-foreground";
  const bgCls = category?.bgColor ?? "bg-muted/30";

  const branches = (data.branches as number) ?? block?.maxOutputs ?? 1;
  const branchKind = data.branchKind as string | undefined;
  const ports = getPorts(branchKind, branches);

  const summary = (data.description as string) || (data.summary as string) || block?.description || "";
  const executionLevel = data.executionLevel as string | undefined;
  const simCount = data._simCount as number | undefined;
  const liveCount = data._liveCount as number | undefined;

  const isExit = blockType === "global_exit" || blockType === "end_journey";
  const isEntry = block?.category === "entry";

  return (
    <div
      className={cn(
        "node-card journey-node-enter relative w-[280px] overflow-hidden rounded-xl border bg-card shadow-md transition-all duration-150",
        selected
          ? "border-primary/60 shadow-lg shadow-primary/20 ring-2 ring-primary/40"
          : "border-border/60 hover:border-border hover:shadow-lg"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />

      {!isEntry && (
        <Handle type="target" position={Position.Top} className={HANDLE_CLS} />
      )}

      <div className={cn("flex items-center gap-2.5 px-3 py-2.5", bgCls)}>
        <div
          className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", bgCls)}
          style={{ boxShadow: `inset 0 0 0 1px ${accent}33` }}
        >
          <Icon className={cn("h-4 w-4", colorCls)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-foreground">
            {(data.label as string) ?? block?.label ?? "Node"}
          </div>
          <div className={cn("truncate text-[9px] uppercase tracking-wider opacity-80", colorCls)}>
            {category?.label ?? "Block"}
          </div>
        </div>
      </div>

      {summary && (
        <div className="border-t border-border/40 px-3 py-2">
          <p className="truncate text-[11px] text-muted-foreground">{summary}</p>
          {executionLevel && SCOPE_LABELS[executionLevel] && (
            <div className="mt-1.5">
              <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-medium", SCOPE_BADGE[executionLevel])}>
                {SCOPE_LABELS[executionLevel]}
              </span>
            </div>
          )}
        </div>
      )}

      {ports.length > 1 && (
        <div className="space-y-0.5 border-t border-border/40 px-3 py-1.5">
          {ports.map((p, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{p}</span>
              <span className="h-2 w-2 rounded-full border" style={{ borderColor: accent, backgroundColor: "transparent" }} />
            </div>
          ))}
        </div>
      )}

      {typeof simCount === "number" && (
        <div className="absolute -right-2 -top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg" style={{ backgroundColor: accent }}>
          {simCount.toLocaleString()}
        </div>
      )}

      {typeof liveCount === "number" && liveCount > 0 && (
        <div className="absolute -left-2 -top-2 z-10 flex items-center gap-0.5 rounded-full bg-[var(--chart-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--background)] shadow-lg">
          <Users className="h-3 w-3" />
          {liveCount.toLocaleString()}
        </div>
      )}

      {!isExit && ports.length === 1 && (
        <Handle type="source" position={Position.Bottom} className={HANDLE_CLS} />
      )}
      {!isExit &&
        ports.length > 1 &&
        ports.map((_p, i) => {
          const total = ports.length;
          const pct = ((i + 1) / (total + 1)) * 100;
          return (
            <Handle
              key={`out-${i}`}
              id={`out-${i}`}
              type="source"
              position={Position.Bottom}
              style={{ left: `${pct}%` }}
              className={HANDLE_CLS}
            />
          );
        })}

      {!isExit && (
        <NodeToolbar position={Position.Bottom} offset={18} align="center" isVisible={hovered}>
          <div className="nodrag nopan">
            {ports.length === 1 ? (
              <QuickAddButton sourceId={id} />
            ) : (
              <div className="flex gap-2">
                {ports.map((p, i) => (
                  <QuickAddButton key={i} sourceId={id} sourceHandle={`out-${i}`} label={p} />
                ))}
              </div>
            )}
          </div>
        </NodeToolbar>
      )}
    </div>
  );
}

function getPorts(branchKind: string | undefined, count: number): string[] {
  if (count <= 1) return ["out"];
  switch (branchKind) {
    case "audience_split":
      return Array.from({ length: count }, (_, i) => `Group ${String.fromCharCode(65 + i)}`);
    case "action_path":
      return ["Clicked", "Opened", "Dismissed", "No Action"].slice(0, count);
    case "best_channel":
      return ["Email", "SMS", "Push", "WhatsApp"].slice(0, count);
    case "inbound_evaluator":
      return ["Positive", "Negative", "Neutral", "No Reply"].slice(0, count);
    case "profile_check":
      return ["Match A", "Match B", "No Match"].slice(0, count);
    case "wait_for_event":
      return ["Event", "Timeout"];
    case "call_api":
      return ["Success", "Timeout"];
    case "traffic_split":
      return Array.from({ length: count }, (_, i) => `Path ${String.fromCharCode(65 + i)}`);
    default:
      return Array.from({ length: count }, (_, i) => `Out ${i + 1}`);
  }
}
