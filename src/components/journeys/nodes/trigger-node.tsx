"use client";

import { useCallback, useRef, useState } from "react";
import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react";
import { Play, Zap, Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddButton } from "@/components/journeys/quick-add-button";
import { NodeErrorBadge } from "@/components/journeys/nodes/node-error-badge";

const triggerIcons: Record<string, typeof Play> = {
  segment_entry: Users,
  attribute_change: Zap,
  event: Star,
};

export function TriggerNode({ id, data, selected }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(true);
  }, []);
  const onMouseLeave = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHovered(false), 200);
  }, []);

  const Icon = triggerIcons[data.triggerType as string] ?? Play;
  const triggerType = data.triggerType as string;
  const segment = data.segment as string | undefined;
  const field = data.field as string | undefined;
  const event = data.event as string | undefined;

  let subtitle = data.description as string | undefined;
  if (!subtitle) {
    if (triggerType === "segment_entry" && segment) {
      subtitle = segment;
    } else if (triggerType === "attribute_change" && field) {
      const condition = data.condition as string | undefined;
      const conditionValue = data.conditionValue as string | undefined;
      subtitle = `${field}${condition ? ` ${condition}` : ""}${conditionValue ? ` ${conditionValue}` : ""}`;
    } else if (triggerType === "event" && event) {
      subtitle = event;
    }
  }

  const simCount = data._simCount as number | undefined;
  const liveCount = data._liveCount as number | undefined;

  return (
    <div
      className={cn(
        "node-card journey-node-enter relative w-[280px] overflow-hidden rounded-xl border bg-card shadow-md transition-all duration-150",
        selected
          ? "border-primary-500/60 shadow-lg shadow-primary-500/20 ring-2 ring-primary-500/40"
          : "border-border/60 hover:border-border hover:shadow-lg"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="h-1 w-full bg-primary-500" />

      <NodeErrorBadge
        message={data._error as string | undefined}
        severity={((data._errorSeverity as string) === "warning" ? "warning" : "blocker") as "blocker" | "warning"}
        side="left"
      />

      <div className="flex items-center gap-2.5 bg-primary-500/10 px-3 py-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-500/20">
          <Icon className="h-4 w-4 text-primary-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-foreground">
            {(data.label as string) ?? "Trigger"}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-primary-400/80">
            Entry / Trigger
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 px-3 py-2">
        <p className="truncate text-[11px] text-muted-foreground">
          {subtitle || "Configure trigger..."}
        </p>
        {!!data.schedule && (data.schedule as string) !== "continuously" && (
          <div className="mt-1.5">
            <span className="inline-block rounded bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-medium text-primary-400">
              {data.schedule === "daily"
                ? `Daily at ${(data.scheduleTime as string) ?? "09:00"}`
                : (data.schedule as string)}
            </span>
          </div>
        )}
      </div>

      {typeof simCount === "number" && (
        <div className="absolute -right-2 -top-2 z-10 rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-semibold text-primary-950 shadow-lg">
          {simCount.toLocaleString()}
        </div>
      )}

      {typeof liveCount === "number" && liveCount > 0 && (
        <div className="absolute -left-2 -top-2 z-10 flex items-center gap-0.5 rounded-full bg-[var(--chart-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--background)] shadow-lg">
          <Users className="h-3 w-3" />
          {liveCount.toLocaleString()}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-[var(--primary)]"
      />

      <NodeToolbar position={Position.Bottom} offset={18} align="center" isVisible={hovered}>
        <div className="nodrag nopan">
          <QuickAddButton sourceId={id} />
        </div>
      </NodeToolbar>
    </div>
  );
}
