"use client";

import { useCallback, useRef, useState } from "react";
import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react";
import { FlaskConical, Users, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddButton } from "@/components/journeys/quick-add-button";
import { NodeErrorBadge } from "@/components/journeys/nodes/node-error-badge";
import { ARM_HANDLES, readExperimentConfig, statusLabel, totalShare } from "@/data/experiments";
import type { ArmHandle, ExperimentArm, ExperimentStatus } from "@/data/experiments";

const HANDLE_CLS = "!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-[var(--primary)]";

const ARM_COLOR: Record<ArmHandle, string> = {
  a: "bg-blue-500",
  b: "bg-purple-500",
  c: "bg-warning-500",
  d: "bg-rose-500",
  e: "bg-emerald-500",
};

const ARM_HANDLE_COLOR: Record<ArmHandle, string> = {
  a: "bg-blue-400",
  b: "bg-purple-400",
  c: "bg-warning-400",
  d: "bg-rose-400",
  e: "bg-emerald-400",
};

const ARM_TEXT_COLOR: Record<ArmHandle, string> = {
  a: "text-blue-400",
  b: "text-purple-400",
  c: "text-warning-400",
  d: "text-rose-400",
  e: "text-emerald-400",
};

function handleLeftPercent(index: number, total: number): string {
  // Evenly space `total` handles between 15% and 85% of the card's width.
  if (total <= 1) return "50%";
  const start = 15;
  const end = 85;
  const pct = start + ((end - start) * index) / (total - 1);
  return `${pct}%`;
}

export function SplitNode({ id, data, selected }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(true);
  }, []);
  const onMouseLeave = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHovered(false), 200);
  }, []);

  const cfg = readExperimentConfig(data as Record<string, unknown>);
  const arms = cfg.arms;
  const sum = totalShare(arms);
  const leading = (data as { _leadingArm?: LeadingArmSummary })._leadingArm;
  const simCount = (data as { _simCount?: number })._simCount;
  const liveCount = (data as { _liveCount?: number })._liveCount;

  return (
    <div
      className={cn(
        "node-card journey-node-enter relative w-[280px] overflow-hidden rounded-xl border bg-card shadow-md transition-all duration-150",
        selected
          ? "border-fuchsia-500/60 shadow-lg shadow-fuchsia-500/20 ring-2 ring-fuchsia-500/40"
          : "border-border/60 hover:border-border hover:shadow-lg"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="h-1 w-full bg-fuchsia-500" />
      <NodeErrorBadge
        message={(data as { _error?: string })._error}
        severity={(((data as { _errorSeverity?: string })._errorSeverity === "warning") ? "warning" : "blocker") as "blocker" | "warning"}
        side="left"
      />
      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />

      {/* Header: name + status chip */}
      <div className="flex items-center gap-2.5 bg-fuchsia-500/10 px-3 py-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-fuchsia-500/20">
          <FlaskConical className="h-4 w-4 text-fuchsia-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-foreground">{cfg.name}</div>
          <div className="truncate text-[9px] uppercase tracking-wider text-fuchsia-400/80">
            {cfg.experimentId}
          </div>
        </div>
        <StatusChip status={cfg.status} />
      </div>

      {/* Share bar + per-arm rows */}
      <div className="border-t border-border/40 px-3 py-2">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/20">
          {arms.map((arm) => (
            <div
              key={arm.id}
              className={cn(ARM_COLOR[arm.handle], arm.isControl && "opacity-70")}
              style={{ width: `${arm.share}%` }}
              title={`${arm.name} · ${arm.share}%`}
            />
          ))}
        </div>
        <div className="mt-1.5 space-y-0.5">
          {arms.map((arm) => (
            <div key={arm.id} className="flex items-center justify-between text-[10px]">
              <div className="flex min-w-0 items-center gap-1">
                {arm.isControl && <Shield className="h-2.5 w-2.5 text-muted-foreground" />}
                <span className={cn("truncate", ARM_TEXT_COLOR[arm.handle])}>{arm.name}</span>
              </div>
              <span className="text-muted-foreground">{arm.share}%</span>
            </div>
          ))}
        </div>
        {sum !== 100 && (
          <p className="mt-1 rounded bg-error-500/10 px-1 py-0.5 text-center text-[9px] text-error-400">
            Shares total {sum}% — must be 100%
          </p>
        )}
        {leading && (
          <p className="mt-1 rounded bg-primary-500/10 px-1 py-0.5 text-center text-[9px] text-primary-400">
            {leading.armName} leading · {leading.deltaLabel} {leading.metricLabel} · {leading.confidenceLabel}
          </p>
        )}
      </div>

      {typeof simCount === "number" && (
        <div className="absolute -right-2 -top-2 z-10 rounded-full bg-fuchsia-500 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-950 shadow-lg">
          {simCount.toLocaleString()}
        </div>
      )}

      {typeof liveCount === "number" && liveCount > 0 && (
        <div className="absolute -left-2 -top-2 z-10 flex items-center gap-0.5 rounded-full bg-[var(--chart-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--background)] shadow-lg">
          <Users className="h-3 w-3" />
          {liveCount.toLocaleString()}
        </div>
      )}

      {/* Handles — one per arm, in config order */}
      {arms.map((arm, i) => (
        <Handle
          key={arm.handle}
          type="source"
          position={Position.Bottom}
          id={arm.handle}
          style={{ left: handleLeftPercent(i, arms.length) }}
          className={cn(
            "!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)]",
            ARM_HANDLE_COLOR[arm.handle]
          )}
        />
      ))}

      <NodeToolbar position={Position.Bottom} offset={18} align="center" isVisible={hovered}>
        <div className="nodrag nopan flex gap-2">
          {arms.map((arm) => (
            <QuickAddButton
              key={arm.handle}
              sourceId={id}
              sourceHandle={arm.handle}
              label={arm.name.slice(0, 10)}
            />
          ))}
        </div>
      </NodeToolbar>
    </div>
  );
}

function StatusChip({ status }: { status: ExperimentStatus }) {
  const label = statusLabel(status);
  const cls =
    status === "running"
      ? "bg-primary-500/15 text-primary-400"
      : status === "paused"
        ? "bg-warning-500/15 text-warning-400"
        : status === "concluded_winner"
          ? "bg-emerald-500/15 text-emerald-400"
          : status === "concluded_no_winner"
            ? "bg-muted/40 text-muted-foreground"
            : "bg-muted/40 text-muted-foreground";
  return (
    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", cls)}>
      {label.split(" · ")[0]}
    </span>
  );
}

/** Shape the experiment Analytics tab writes back onto node data so the
 *  canvas card can show "B leading · +1.8pp PTP rate · 91% confident" once
 *  results exist. */
export interface LeadingArmSummary {
  armName: string
  metricLabel: string
  deltaLabel: string
  confidenceLabel: string
}

export { ARM_HANDLES };
export type { ExperimentArm };
