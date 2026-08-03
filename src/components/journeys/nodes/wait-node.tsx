"use client";

import { useCallback, useRef, useState } from "react";
import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react";
import { Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddButton } from "@/components/journeys/quick-add-button";
import { NodeErrorBadge } from "@/components/journeys/nodes/node-error-badge";

function formatDuration(duration: number, unit: string): string {
  if (unit === "hours" && duration >= 24 && duration % 24 === 0) return `${duration / 24}d`;
  const unitMap: Record<string, string> = { minutes: "m", hours: "h", days: "d" };
  return `${duration}${unitMap[unit] ?? unit}`;
}

const HANDLE_CLS = "!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-[var(--primary)]";

export function WaitNode({ id, data, selected }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(true);
  }, []);
  const onMouseLeave = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHovered(false), 200);
  }, []);

  const duration = (data.duration as number) ?? 24;
  const unit = (data.unit as string) ?? "hours";
  const display = formatDuration(duration, unit);
  const skipWeekends = data.skipWeekends as boolean | undefined;
  const respectContactHours = data.respectContactHours as boolean | undefined;
  const simCount = data._simCount as number | undefined;
  const liveCount = data._liveCount as number | undefined;

  return (
    <div
      className={cn(
        "node-card journey-node-enter relative w-[280px] overflow-hidden rounded-xl border bg-card shadow-md transition-all duration-150",
        selected
          ? "border-warning-500/60 shadow-lg shadow-warning-500/20 ring-2 ring-warning-500/40"
          : "border-border/60 hover:border-border hover:shadow-lg"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="h-1 w-full bg-warning-500" />
      <NodeErrorBadge
        message={data._error as string | undefined}
        severity={((data._errorSeverity as string) === "warning" ? "warning" : "blocker") as "blocker" | "warning"}
        side="left"
      />
      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />

      <div className="flex items-center gap-2.5 bg-warning-500/10 px-3 py-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-warning-500/20">
          <Clock className="h-4 w-4 text-warning-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-foreground">
            {(data.label as string) ?? "Wait"}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-warning-400/80">
            Flow Control
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 px-3 py-2.5">
        <div className="flex items-center justify-center rounded bg-warning-500/10 py-2">
          <span className="text-xl font-bold tabular-nums text-warning-300">{display}</span>
        </div>
        {(skipWeekends || respectContactHours) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {skipWeekends && (
              <span className="rounded bg-warning-500/15 px-1.5 py-0.5 text-[9px] text-warning-300/80">Skip weekends</span>
            )}
            {respectContactHours && (
              <span className="rounded bg-warning-500/15 px-1.5 py-0.5 text-[9px] text-warning-300/80">Contact hours</span>
            )}
          </div>
        )}
      </div>

      {typeof simCount === "number" && (
        <div className="absolute -right-2 -top-2 z-10 rounded-full bg-warning-500 px-2 py-0.5 text-[10px] font-semibold text-warning-950 shadow-lg">
          {simCount.toLocaleString()}
        </div>
      )}

      {typeof liveCount === "number" && liveCount > 0 && (
        <div className="absolute -left-2 -top-2 z-10 flex items-center gap-0.5 rounded-full bg-[var(--chart-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--background)] shadow-lg">
          <Users className="h-3 w-3" />
          {liveCount.toLocaleString()}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className={HANDLE_CLS} />

      <NodeToolbar position={Position.Bottom} offset={18} align="center" isVisible={hovered}>
        <div className="nodrag nopan">
          <QuickAddButton sourceId={id} />
        </div>
      </NodeToolbar>
    </div>
  );
}
