"use client";

import { useCallback, useRef, useState } from "react";
import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react";
import { GitBranch, Users, Zap, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddButton } from "@/components/journeys/quick-add-button";
import { NodeErrorBadge } from "@/components/journeys/nodes/node-error-badge";

const conditionIcons: Record<string, typeof GitBranch> = {
  check_attribute: GitBranch,
  is_in_segment: Users,
  has_done_event: Zap,
  is_reachable_on: Wifi,
};

const HANDLE_CLS = "!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-[var(--primary)]";

export function ConditionNode({ id, data, selected }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(true);
  }, []);
  const onMouseLeave = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHovered(false), 200);
  }, []);

  const conditionType = data.conditionType as string | undefined;
  const Icon = conditionIcons[conditionType ?? ""] ?? GitBranch;

  let conditionText = data.description as string | undefined;
  if (!conditionText) {
    if (conditionType === "check_attribute") {
      const field = data.field as string;
      const operator = data.operator as string;
      const value = data.value as string;
      if (field && operator && value) {
        const opMap: Record<string, string> = {
          equals: "=", greater_than: ">", less_than: "<", between: "between", not_equals: "!=",
        };
        conditionText = `${field.toUpperCase()} ${opMap[operator] ?? operator} ${value}`;
      }
    } else if (conditionType === "is_in_segment") {
      const segment = data.segment as string;
      if (segment) conditionText = `In "${segment}"`;
    } else if (conditionType === "has_done_event") {
      const event = data.event as string;
      const tw = data.timeWindow as number;
      const twu = data.timeWindowUnit as string;
      if (event) conditionText = `${event}${tw ? ` within ${tw}${twu?.[0] ?? "h"}` : ""}`;
    } else if (conditionType === "is_reachable_on") {
      const channels = data.channels as string[] | undefined;
      if (channels?.length) conditionText = `Reachable on ${channels.join(", ")}`;
    }
  }

  const simYes = data._simYes as number | undefined;
  const simNo = data._simNo as number | undefined;
  const liveCount = data._liveCount as number | undefined;

  return (
    <div
      className={cn(
        "node-card journey-node-enter relative w-[280px] overflow-hidden rounded-xl border bg-card shadow-md transition-all duration-150",
        selected
          ? "border-violet-500/60 shadow-lg shadow-violet-500/20 ring-2 ring-violet-500/40"
          : "border-border/60 hover:border-border hover:shadow-lg"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="h-1 w-full bg-violet-500" />
      <NodeErrorBadge
        message={data._error as string | undefined}
        severity={((data._errorSeverity as string) === "warning" ? "warning" : "blocker") as "blocker" | "warning"}
        side="left"
      />
      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />

      <div className="flex items-center gap-2.5 bg-violet-500/10 px-3 py-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-500/20">
          <Icon className="h-4 w-4 text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-foreground">
            {(data.label as string) ?? "Condition"}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-violet-400/80">
            Decision
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 px-3 py-2">
        {conditionText ? (
          <div className="rounded bg-violet-500/10 px-2 py-1">
            <p className="truncate text-[11px] font-medium text-violet-300">{conditionText}</p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Configure condition...</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border/40 px-4 py-1.5">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
          <span className="text-[10px] font-medium text-primary-400">Yes</span>
          {typeof simYes === "number" && (
            <span className="rounded bg-primary-500/20 px-1 text-[9px] font-semibold text-primary-400">
              {simYes.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {typeof simNo === "number" && (
            <span className="rounded bg-error-500/20 px-1 text-[9px] font-semibold text-error-400">
              {simNo.toLocaleString()}
            </span>
          )}
          <span className="text-[10px] font-medium text-error-400">No</span>
          <span className="h-1.5 w-1.5 rounded-full bg-error-400" />
        </div>
      </div>

      {typeof liveCount === "number" && liveCount > 0 && (
        <div className="absolute -left-2 -top-2 z-10 flex items-center gap-0.5 rounded-full bg-[var(--chart-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--background)] shadow-lg">
          <Users className="h-3 w-3" />
          {liveCount.toLocaleString()}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        className="!-translate-x-[60px] !h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-primary-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!translate-x-[60px] !h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-error-400"
      />

      <NodeToolbar position={Position.Bottom} offset={18} align="center" isVisible={hovered}>
        <div className="nodrag nopan flex gap-2">
          <QuickAddButton sourceId={id} sourceHandle="yes" label="Yes" />
          <QuickAddButton sourceId={id} sourceHandle="no" label="No" />
        </div>
      </NodeToolbar>
    </div>
  );
}
