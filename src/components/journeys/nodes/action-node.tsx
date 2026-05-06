"use client";

import { useCallback, useRef, useState } from "react";
import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react";
import {
  Mail,
  MessageSquare,
  MessageCircle,
  Phone,
  UserPlus,
  Edit,
  Zap,
  Smartphone,
  Bell,
  Layers,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddButton } from "@/components/journeys/quick-add-button";

const actionIcons: Record<string, typeof Mail> = {
  email: Mail, sms: MessageSquare, whatsapp: MessageCircle, call: Phone,
  agent: UserPlus, attribute: Edit, push: Smartphone, web_push: Bell,
  inapp: Layers, onsite: Globe, rich_media: Layers, notify_internal: Bell,
};

const actionLabels: Record<string, string> = {
  email: "Email", sms: "SMS", whatsapp: "WhatsApp", call: "AI Call",
  agent: "Assign Agent", attribute: "Update Attribute", push: "Mobile Push",
  web_push: "Web Push", inapp: "In-App", onsite: "On-Site",
  rich_media: "Rich Media", notify_internal: "Notify Team",
};

const HANDLE_CLS = "!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-[var(--primary)]";

export function ActionNode({ id, data, selected }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(true);
  }, []);
  const onMouseLeave = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHovered(false), 200);
  }, []);

  const actionType = (data.actionType as string) ?? "email";
  const Icon = actionIcons[actionType] ?? Zap;
  const template = data.template as string | undefined;
  const simCount = data._simCount as number | undefined;
  const liveCount = data._liveCount as number | undefined;

  return (
    <div
      className={cn(
        "node-card journey-node-enter relative w-[280px] overflow-hidden rounded-xl border bg-card shadow-md transition-all duration-150",
        selected
          ? "border-cyan-500/60 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-500/40"
          : "border-border/60 hover:border-border hover:shadow-lg"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="h-1 w-full bg-cyan-500" />

      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />

      <div className="flex items-center gap-2.5 bg-cyan-500/10 px-3 py-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-500/20">
          <Icon className="h-4 w-4 text-cyan-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-foreground">
            {(data.label as string) ?? "Send Message"}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-cyan-400/80">
            Channel · {actionLabels[actionType] ?? actionType}
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 px-3 py-2">
        <p className="truncate text-[11px] text-muted-foreground">
          {template ||
            (typeof data.description === "string" ? data.description : "Pick template...")}
        </p>
        {actionType === "whatsapp" && template && (
          <div className="mt-1.5 inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
            Approved template
          </div>
        )}
      </div>

      {typeof simCount === "number" && (
        <div className="absolute -right-2 -top-2 z-10 rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-semibold text-cyan-950 shadow-lg">
          {simCount.toLocaleString()}
        </div>
      )}

      {typeof liveCount === "number" && liveCount > 0 && (
        <div className="absolute -left-2 -top-2 z-10 flex items-center gap-0.5 rounded-full bg-[var(--chart-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--background)] shadow-lg">
          <UserPlus className="h-3 w-3" />
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
