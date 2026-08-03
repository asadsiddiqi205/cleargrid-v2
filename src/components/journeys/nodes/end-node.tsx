"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Square, CheckCircle, XCircle, AlertTriangle, MinusCircle, Power, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeErrorBadge } from "@/components/journeys/nodes/node-error-badge";

const outcomeConfig: Record<string, { icon: typeof Square; color: string; bg: string }> = {
  Completed: { icon: CheckCircle, color: "text-blue-400", bg: "bg-blue-500/15" },
  Converted: { icon: CheckCircle, color: "text-primary-400", bg: "bg-primary-500/15" },
  Exhausted: { icon: AlertTriangle, color: "text-warning-400", bg: "bg-warning-500/15" },
  Unresponsive: { icon: XCircle, color: "text-error-400", bg: "bg-error-500/15" },
  Exited: { icon: Power, color: "text-error-400", bg: "bg-error-500/15" },
};

const HANDLE_CLS = "!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-[var(--primary)]";

export function EndNode({ data, selected }: NodeProps) {
  const outcome = data.outcome as string | undefined;
  const config = outcomeConfig[outcome ?? ""] ?? {
    icon: MinusCircle, color: "text-error-400", bg: "bg-error-500/15",
  };
  const Icon = outcome ? config.icon : Square;
  const simCount = data._simCount as number | undefined;
  const liveCount = data._liveCount as number | undefined;

  return (
    <div
      className={cn(
        "node-card journey-node-enter relative w-[280px] overflow-hidden rounded-xl border bg-card shadow-md transition-all duration-150",
        selected
          ? "border-error-500/60 shadow-lg shadow-error-500/20 ring-2 ring-error-500/40"
          : "border-border/60 hover:border-border hover:shadow-lg"
      )}
    >
      <div className="h-1 w-full bg-error-500" />
      <NodeErrorBadge
        message={data._error as string | undefined}
        severity={((data._errorSeverity as string) === "warning" ? "warning" : "blocker") as "blocker" | "warning"}
        side="left"
      />
      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />

      <div className="flex items-center gap-2.5 bg-error-500/10 px-3 py-2.5">
        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", config.bg)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-foreground">
            {(data.label as string) ?? "End Journey"}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-error-400/80">
            Exit / Governance
          </div>
        </div>
      </div>

      {outcome && (
        <div className="border-t border-border/40 px-3 py-2">
          <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium", config.bg, config.color)}>
            {outcome}
          </span>
        </div>
      )}

      {typeof simCount === "number" && (
        <div className="absolute -right-2 -top-2 z-10 rounded-full bg-error-500 px-2 py-0.5 text-[10px] font-semibold text-error-950 shadow-lg">
          {simCount.toLocaleString()}
        </div>
      )}

      {typeof liveCount === "number" && liveCount > 0 && (
        <div className="absolute -left-2 -top-2 z-10 flex items-center gap-0.5 rounded-full bg-[var(--chart-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--background)] shadow-lg">
          <Users className="h-3 w-3" />
          {liveCount.toLocaleString()}
        </div>
      )}
    </div>
  );
}
