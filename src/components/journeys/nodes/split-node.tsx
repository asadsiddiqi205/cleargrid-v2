"use client";

import { useCallback, useRef, useState } from "react";
import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react";
import { FlaskConical, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddButton } from "@/components/journeys/quick-add-button";
import { NodeErrorBadge } from "@/components/journeys/nodes/node-error-badge";

const HANDLE_CLS = "!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-[var(--primary)]";

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

  const splitA = (data.splitA as number) ?? 50;
  const splitB = (data.splitB as number) ?? 50;
  const splitC = (data.splitC as number) ?? 0;
  const splitD = (data.splitD as number) ?? 0;
  const variantCount = (data.variantCount as number) ?? 2;
  const winnerCriteria = data.winnerCriteria as string | undefined;
  const simCount = data._simCount as number | undefined;
  const liveCount = data._liveCount as number | undefined;

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
        message={data._error as string | undefined}
        severity={((data._errorSeverity as string) === "warning" ? "warning" : "blocker") as "blocker" | "warning"}
        side="left"
      />
      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />

      <div className="flex items-center gap-2.5 bg-fuchsia-500/10 px-3 py-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-fuchsia-500/20">
          <FlaskConical className="h-4 w-4 text-fuchsia-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-foreground">
            {(data.label as string) ?? "Experiment"}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-fuchsia-400/80">
            {variantCount}-variant A/B test
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 px-3 py-2">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/20">
          <div className="bg-blue-500" style={{ width: `${splitA}%` }} />
          <div className="bg-purple-500" style={{ width: `${splitB}%` }} />
          {variantCount >= 3 && <div className="bg-warning-500" style={{ width: `${splitC}%` }} />}
          {variantCount >= 4 && <div className="bg-rose-500" style={{ width: `${splitD}%` }} />}
        </div>
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          {splitA}/{splitB}{variantCount >= 3 && `/${splitC}`}{variantCount >= 4 && `/${splitD}`}
        </p>
        {winnerCriteria && (
          <p className="mt-0.5 text-center text-[9px] text-muted-foreground/80">Optimize by: {winnerCriteria}</p>
        )}
      </div>

      <div className="flex items-center justify-around border-t border-border/40 px-3 py-1.5">
        <span className="text-[10px] font-medium text-blue-400">A</span>
        <span className="text-[10px] font-medium text-purple-400">B</span>
        {variantCount >= 3 && <span className="text-[10px] font-medium text-warning-400">C</span>}
        {variantCount >= 4 && <span className="text-[10px] font-medium text-rose-400">D</span>}
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

      <Handle type="source" position={Position.Bottom} id="a"
        style={{ left: "20%" }}
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-blue-400"
      />
      <Handle type="source" position={Position.Bottom} id="b"
        style={{ left: variantCount === 2 ? "80%" : variantCount === 3 ? "50%" : "40%" }}
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-purple-400"
      />
      {variantCount >= 3 && (
        <Handle type="source" position={Position.Bottom} id="c"
          style={{ left: variantCount === 3 ? "80%" : "60%" }}
          className="!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-warning-400"
        />
      )}
      {variantCount >= 4 && (
        <Handle type="source" position={Position.Bottom} id="d"
          style={{ left: "80%" }}
          className="!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-rose-400"
        />
      )}

      <NodeToolbar position={Position.Bottom} offset={18} align="center" isVisible={hovered}>
        <div className="nodrag nopan flex gap-2">
          <QuickAddButton sourceId={id} sourceHandle="a" label="A" />
          <QuickAddButton sourceId={id} sourceHandle="b" label="B" />
          {variantCount >= 3 && <QuickAddButton sourceId={id} sourceHandle="c" label="C" />}
          {variantCount >= 4 && <QuickAddButton sourceId={id} sourceHandle="d" label="D" />}
        </div>
      </NodeToolbar>
    </div>
  );
}
