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
  PhoneIncoming,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddButton } from "@/components/journeys/quick-add-button";
import { NodeErrorBadge } from "@/components/journeys/nodes/node-error-badge";
import { isBlockHiddenByFlag } from "@/data/feature-flags";
import { getPoolForProject, getPoolById, getGatewayById } from "@/data/project-pools";
import { getSenderProfileById } from "@/data/sender-profiles";
import { describeProfileHealth, worstDomainState } from "@/components/warmy/sending-domains-list";

const actionIcons: Record<string, typeof Mail> = {
  email: Mail, sms: MessageSquare, whatsapp: MessageCircle, call: Phone,
  agent: UserPlus, attribute: Edit, push: Smartphone, web_push: Bell,
  inapp: Layers, onsite: Globe, rich_media: Layers, notify_internal: Bell,
  webhook: Webhook,
};

const actionLabels: Record<string, string> = {
  email: "Email", sms: "SMS", whatsapp: "WhatsApp", call: "AI Call",
  agent: "Assign Agent", attribute: "Update Attribute", push: "Mobile Push",
  web_push: "Web Push", inapp: "In-App", onsite: "On-Site",
  rich_media: "Rich Media", notify_internal: "Notify Team",
  webhook: "Webhook",
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
  const blockType = (data.blockType as string | undefined) ?? undefined;
  const unavailable = isBlockHiddenByFlag(blockType);

  // AI Call card subtitle: "<project> · <agent> · Pool: <pool>" in pool
  // mode, "<project> · <agent> · Gateway: <name>" in gateway mode, amber
  // "No pool" / "No gateway" when the dial target isn't set yet.
  const projectId = typeof data.clearvoiceProjectId === "string" ? data.clearvoiceProjectId : null;
  const projectName = typeof data.clearvoiceProjectName === "string" ? data.clearvoiceProjectName : null;
  const agentName = typeof data.clearvoiceAgentName === "string" ? data.clearvoiceAgentName : null;
  const gatewayId = typeof data.aiCallGateway === "string" ? data.aiCallGateway : null;
  const explicitDialMode = typeof data.dialMode === "string" ? data.dialMode : null;
  const aiCallDialMode = explicitDialMode ?? (gatewayId ? "gateway" : "pool");
  const stagedPoolAssignment = data._stagedPoolAssignment as { poolId?: string } | undefined;
  const livePool = actionType === "call" && projectId ? getPoolForProject(projectId) : null;
  const stagedPool = actionType === "call" && stagedPoolAssignment?.poolId ? getPoolById(stagedPoolAssignment.poolId) : null;
  const effectivePool = livePool ?? stagedPool;
  const gateway = actionType === "call" && gatewayId ? getGatewayById(gatewayId) : null;
  const aiCallHasProject = actionType === "call" && Boolean(projectId);
  const showNoPool = aiCallHasProject && aiCallDialMode === "pool" && !effectivePool;
  const showNoGateway = aiCallHasProject && aiCallDialMode === "gateway" && !gateway;

  // Send Email subtitle: profile name + the worst domain state across
  // its domain list. Composer-picked only; no profile → fall through.
  const senderProfileId = typeof data.senderProfileId === "string" ? data.senderProfileId : null;
  const senderProfile = actionType === "email" && senderProfileId ? getSenderProfileById(senderProfileId) : null;
  const emailWorstState = senderProfile ? worstDomainState(senderProfile) : null;
  const emailSummary = senderProfile ? describeProfileHealth(senderProfile) : null;

  // Callback Handling badge — only on AI Call nodes with `callbackEnabled` on
  // (defaults to true per spec). Shows "Callbacks N" where N is the per-borrower cap.
  const callbackEnabled =
    actionType === "call" && (data.callbackEnabled === undefined || data.callbackEnabled === true);
  const callbackMax = (data.callbackMaxPerBorrower as number) ?? 3;

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

      <NodeErrorBadge
        message={data._error as string | undefined}
        severity={((data._errorSeverity as string) === "warning" ? "warning" : "blocker") as "blocker" | "warning"}
        side="left"
      />

      {unavailable && (
        <span
          title="This node type is temporarily disabled. Existing instances still load but can't be added or duplicated."
          className="absolute right-2 top-2 z-10 rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300"
        >
          Unavailable
        </span>
      )}

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
        {actionType === "email" && senderProfile ? (
          <p className="truncate text-[11px] text-muted-foreground">
            <span className="text-foreground">{senderProfile.name}</span>
            {" · "}
            <span
              className={cn(
                emailWorstState === "blocked" && "text-red-400",
                emailWorstState === "at_risk" && "text-orange-300",
                emailWorstState === "watch" && "text-amber-300",
                emailWorstState === "healthy" && "text-emerald-300",
                emailWorstState === "no_data" && "text-muted-foreground",
              )}
            >
              {emailSummary}
            </span>
          </p>
        ) : actionType === "call" && aiCallHasProject ? (
          <p className="truncate text-[11px] text-muted-foreground">
            {[projectName ?? template ?? projectId, agentName].filter(Boolean).join(" · ")}
            {" · "}
            {aiCallDialMode === "gateway" ? (
              gateway ? (
                <span className="text-foreground">Gateway: {gateway.name}</span>
              ) : (
                <span className="text-amber-400">No gateway</span>
              )
            ) : effectivePool ? (
              <span className="text-foreground">Pool: {effectivePool.name}</span>
            ) : (
              <span className="text-amber-400">No pool</span>
            )}
          </p>
        ) : (
          <p className="truncate text-[11px] text-muted-foreground">
            {template ||
              (typeof data.description === "string" ? data.description : "Pick template...")}
          </p>
        )}
        {actionType === "whatsapp" && template && (
          <div className="mt-1.5 inline-flex items-center rounded bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-medium text-primary-400">
            Approved template
          </div>
        )}
        {(showNoPool || showNoGateway) && (
          <div className="mt-1.5 inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
            Won&apos;t be dialed
          </div>
        )}
      </div>

      {/* Callback Handling badge (top-right) */}
      {callbackEnabled && typeof simCount !== "number" && (
        <div
          className="absolute -right-2 -top-2 z-10 flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium text-neutral-300 shadow"
          title={`Callbacks enabled. Max ${callbackMax} per borrower. Holds on DND, contact window, 7-in-7. Cancels on DNC, opt-out, consent revoked.`}
        >
          <PhoneIncoming className="h-2.5 w-2.5" />
          <span>Callbacks {callbackMax}</span>
        </div>
      )}

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
