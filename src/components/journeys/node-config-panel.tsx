"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  X,
  ShieldCheck,
  Wand2,
  Settings,
  Filter,
  Variable as VariableIcon,
  GitBranch,
  Send as SendIcon,
  SlidersHorizontal,
  Plus,
  Trash2,
  Upload as UploadIcon,
  FileSpreadsheet,
  ExternalLink,
  RefreshCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Lock,
  Blocks,
} from "lucide-react";
import { getBlockType, getBlockCategory, findUpstreamExcelColumns } from "@/data/journeys";
import { ChannelContactPicker } from "@/components/shared/channel-contact-picker";
import {
  DEFAULT_PHONE_SELECTION,
  describePhoneSelection,
  type PhoneSelection,
} from "@/data/borrower-channels";
import { cn } from "@/lib/utils";
import { getBlockConfigForm } from "@/components/journeys/block-configs";
import { CallbackHandlingSection } from "@/components/journeys/callback-handling";
/* Part 4 — real Composer registry, replacing the old hardcoded EMAIL_TEMPLATES / SMS_TEMPLATES arrays */
import {
  getComposerTemplatesForChannel,
  getComposerPlaybooks,
  encodeTemplatePrefill,
  type ComposerTemplateEntry,
} from "@/data/composer-registry-adapter";
/* Part 5 — Human Campaign node references real seeded campaigns */
import {
  getCampaignsForLender,
  SKILL_GROUP_LABEL,
  type HumanCampaign,
} from "@/data/campaigns-seed";
/* Part 6.4 — event trigger tooltip metadata + component */
import { EVENT_TRIGGER_CATALOG } from "@/data/event-trigger-catalog";
import { EventTriggerInfoIcon } from "@/components/journeys/workshop-panels";
/* Part 6.5 — filter registry with role scaffolding */
import {
  FILTER_REGISTRY,
  getVisibleFilters,
  CURRENT_ROLE,
  type FilterDefinition,
} from "@/data/filter-registry";
/* Shared "as the borrower received it" preview — same component the
 * Composer uses. Ensures Send Email / Send SMS / Send WhatsApp nodes
 * always render at parity with the Composer preview panel. */
import { MessagePreview, type MessageChannel as PreviewChannel } from "@/components/shared/message-preview";
import { MessagePreviewWithSampling } from "@/components/journeys/message-preview-sample";
import type { EmailSelection } from "@/data/borrower-channels";
import { getRichTemplate } from "@/data/rich-email-templates";
import { NodeAnalyticsTab } from "@/components/journeys/node-analytics-tab";
import {
  ExperimentArmsSection,
  ExperimentGeneralSection,
  ExperimentGoalLogicSection,
} from "@/components/journeys/experiment-setup-form";
import { ExperimentAnalyticsTab } from "@/components/journeys/experiment-analytics-tab";
import { readExperimentConfig } from "@/data/experiments";
import type { ExperimentConfig } from "@/data/experiments";
import { BarChart3 } from "lucide-react";
import {
  senderProfiles as SP_SEED,
  getSenderProfileById,
} from "@/data/sender-profiles"
import {
  SendingDomainsList,
  describeProfileRotationHealth,
} from "@/components/warmy/sending-domains-list"
import {
  listPools,
  getPoolById,
  getPoolForProject,
  getProjectPriority,
  poolTodayState,
  poolCallsQueued,
  poolProjectQueuedCount,
  poolPooledConcurrency,
  poolHasPooledAiCapacity,
  poolEditUrl,
  canManagePools,
  assignProjectToPool,
  listGateways,
  getGatewayById,
  POOL_STATE_LABEL,
  POOL_PRIORITY_LABEL,
  type Pool,
  type PoolProjectPriority,
} from "@/data/project-pools";

/* ------------------------------------------------------------------ */
/*  Mock data for dropdowns                                           */
/* ------------------------------------------------------------------ */

const SEGMENTS = [
  "High DPD UAE Borrowers",
  "PTP Broken Promise",
  "Low Risk Active Accounts",
  "Arabic Speaking Escalations",
];

const ATTRIBUTE_FIELDS = ["DPD", "Outstanding Amount", "Payment Status", "Risk Segment"];

const ATTRIBUTE_CONDITIONS = ["increases", "decreases", "changes to"];

const EVENTS = [
  "Payment Failed",
  "Email Opened",
  "PTP Made",
  "AI Call Completed",
  "SMS Replied",
  "Payment Made",
];

const CONDITION_OPERATORS: Record<string, string> = {
  equals: "Equals",
  greater_than: "Greater Than",
  less_than: "Less Than",
  between: "Between",
  not_equals: "Not Equals",
};

const EMAIL_TEMPLATES = [
  "Payment Reminder",
  "Overdue Notice",
  "Settlement Offer",
  "Friendly Nudge",
  "Final Warning",
  "PTP Confirmation",
];

const EMAIL_PREVIEWS: Record<string, string> = {
  "Payment Reminder": "Dear {name}, your payment of {amount} is due on {date}. Please ensure timely payment to avoid...",
  "Overdue Notice": "Dear {name}, your account is now {dpd} days past due. An amount of {amount} remains outstanding...",
  "Settlement Offer": "Dear {name}, we have a special settlement offer for you. Pay {amount} by {date} to close...",
  "Friendly Nudge": "Hi {name}, just a gentle reminder that your payment is coming up soon. We are here to help...",
  "Final Warning": "IMPORTANT: Dear {name}, this is your final notice regarding your overdue balance of {amount}...",
  "PTP Confirmation": "Dear {name}, thank you for your promise to pay {amount} by {date}. We have recorded your...",
};

const SMS_TEMPLATES = [
  "Payment Due SMS",
  "PTP Reminder",
  "Payment Link",
  "Urgent Notice",
];

const SMS_CHAR_COUNTS: Record<string, number> = {
  "Payment Due SMS": 127,
  "PTP Reminder": 98,
  "Payment Link": 142,
  "Urgent Notice": 155,
};

const WHATSAPP_TEMPLATES = [
  "Payment Reminder WA",
  "Settlement Offer WA",
  "PTP Follow-up WA",
];

interface ClearVoiceProject {
  id: string;
  name: string;
  status: "live" | "draft";
  tags: string[];
}

const CLEARVOICE_PROJECTS: ClearVoiceProject[] = [
  { id: "proj_001", name: "CashNow PTP EN", status: "live", tags: ["PTP", "EN", "UAE"] },
  { id: "proj_002", name: "CashNow Reminder AR", status: "live", tags: ["Reminder", "AR", "UAE"] },
  { id: "proj_003", name: "Mashreq Settlement EN", status: "live", tags: ["Settlement", "EN", "UAE"] },
  { id: "proj_004", name: "Tamara Early Delinquency AR", status: "live", tags: ["Early DPD", "AR", "UAE"] },
  { id: "proj_005", name: "Generic Collection EN", status: "draft", tags: ["Collection", "EN"] },
  { id: "proj_006", name: "FAB Final Notice EN", status: "draft", tags: ["Final Notice", "EN", "UAE"] },
  // Projects that sit in no pool — the Pool tab opens in the
  // assign-a-pool state when the author picks one of these.
  { id: "proj_007", name: "Mashreq PTP Follow-up AR", status: "live", tags: ["PTP", "AR", "UAE", "Needs pool"] },
  { id: "proj_008", name: "FAB Early Delinquency EN", status: "live", tags: ["Early DPD", "EN", "UAE", "Needs pool"] },
  { id: "proj_009", name: "Tamara Settlement Negotiator EN", status: "live", tags: ["Settlement", "EN", "KSA", "Needs pool"] },
  { id: "proj_010", name: "ADCB Hardship Care AR", status: "draft", tags: ["Hardship", "AR", "UAE", "Needs pool"] },
];

interface ClearVoiceAgent {
  id: string;
  name: string;
  org: string;
  isDefault?: boolean;
}

/**
 * Agents keyed by project id. In production this comes from the ClearVoice
 * API; here it's a deterministic slice per project so the picker behaves
 * consistently in the prototype.
 */
const CLEARVOICE_AGENTS: Record<string, ClearVoiceAgent[]> = {
  proj_001: [
    { id: "agent_101", name: "Jozep", org: "ClearGrid" },
    { id: "agent_102", name: "Jozep 2", org: "cleargrid" },
    { id: "agent_103", name: "Jozep (np)", org: "ClearGrid", isDefault: true },
  ],
  proj_002: [
    { id: "agent_201", name: "Salma", org: "ClearGrid", isDefault: true },
    { id: "agent_202", name: "Salma (fast)", org: "ClearGrid" },
  ],
  proj_003: [
    { id: "agent_301", name: "Rashid", org: "ClearGrid", isDefault: true },
    { id: "agent_302", name: "Rashid EN", org: "cleargrid" },
  ],
  proj_004: [
    { id: "agent_401", name: "Layla", org: "ClearGrid", isDefault: true },
    { id: "agent_402", name: "Layla AR", org: "cleargrid" },
  ],
  proj_005: [
    { id: "agent_501", name: "Generic", org: "ClearGrid", isDefault: true },
  ],
  proj_006: [
    { id: "agent_601", name: "Karim", org: "ClearGrid", isDefault: true },
    { id: "agent_602", name: "Karim (final)", org: "cleargrid" },
  ],
  proj_007: [
    { id: "agent_701", name: "Nadia", org: "ClearGrid", isDefault: true },
    { id: "agent_702", name: "Nadia (follow-up)", org: "cleargrid" },
  ],
  proj_008: [
    { id: "agent_801", name: "Omar", org: "ClearGrid", isDefault: true },
  ],
  proj_009: [
    { id: "agent_901", name: "Yara", org: "ClearGrid", isDefault: true },
    { id: "agent_902", name: "Yara (negotiator)", org: "cleargrid" },
  ],
  proj_010: [
    { id: "agent_1001", name: "Hassan", org: "ClearGrid", isDefault: true },
  ],
};

const AGENT_TEAMS = [
  "General Collections",
  "High Value",
  "Arabic Speaking",
  "Legal",
];

const OUTCOME_TAGS = ["Completed", "Converted", "Exhausted", "Unresponsive"];

const CHANNELS_LIST = ["Email", "SMS", "WhatsApp", "Voice"];

/* ------------------------------------------------------------------ */
/*  Styled native select (consistent w/ shadcn style)                 */
/* ------------------------------------------------------------------ */

function NativeSelect({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-7 w-full rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 ${className}`}
    >
      {children}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                   */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface NodeConfigPanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDeleteNode?: () => void;
  /** Full canvas graph — used to compute upstream-action context for
   *  nodes like Action Path Split that adapt to their predecessor. */
  nodes?: Node[];
  edges?: Edge[];
  /** Journey id — required for the Analytics tab. */
  journeyId?: string;
  /** Currently-selected run id from the canvas Analytics chip. When set, the
   *  Analytics tab shows who entered this node during that specific run.
   *  When null, the tab prompts the author to pick a run. */
  selectedRunId?: string | null;
  /**
   * Part 1.5 — Fix-button target. When present, scrolls the offending field
   * into view and pulses its border red for 3 seconds. `ts` is used to
   * re-trigger the animation even if `field` hasn't changed.
   */
  focusField?: { field?: string; ts: number };
  /**
   * Master-editor context (Part 5.3). When present, the panel is running
   * inside `/components/[id]/edit` — enables per-field lock toggles.
   */
  masterContext?: {
    lockedProperties: Array<{ nodeId: string; propertyPath: string; reason?: string }>;
    onToggleLock: (propertyPath: string, locked: boolean, reason?: string) => void;
  };
  /**
   * Instance-editor context (Parts 4.3 + 7). When present, the panel is
   * editing a node inside an expanded component instance. Field edits become
   * overrides on the instance.
   */
  instanceContext?: {
    componentName: string;
    componentId: string;
    lockedProperties: Array<{ nodeId: string; propertyPath: string; reason?: string }>;
    overriddenPaths: string[];
    onResetOverride: (propertyPath: string) => void;
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function NodeConfigPanel({ node, onClose, onUpdate, onDeleteNode, nodes = [], edges = [], journeyId, selectedRunId, focusField, masterContext, instanceContext }: NodeConfigPanelProps) {
  const d = (node?.data ?? {}) as Record<string, unknown>;

  const isExperiment = (d.blockType as string | undefined) === "experiment";
  const experimentCfg: ExperimentConfig | null = isExperiment ? readExperimentConfig(d) : null;
  const updateExperiment = useCallback(
    (next: ExperimentConfig) => {
      if (!node) return;
      const currentData = node.data as Record<string, unknown>;
      // Strip legacy split fields so the migrated form doesn't keep re-hydrating
      // off them and ignore the ExperimentConfig.
      const {
        variantCount: _vc,
        splitA: _sa,
        splitB: _sb,
        splitC: _sc,
        splitD: _sd,
        optimizeAfter: _oa,
        winnerCriteria: _wc,
        ...rest
      } = currentData;
      onUpdate(node.id, { ...rest, experiment: next });
    },
    [node, onUpdate]
  );

  // Walk the graph backward from the selected node to find the nearest
  // upstream action node. We hop through pass-through nodes (waits, splits)
  // so a Send Email → Wait → Action Path Split still detects "email".
  const upstreamActionType = React.useMemo<
    "email" | "sms" | "whatsapp" | "call" | null
  >(() => {
    if (!node) return null;
    const byId = new Map(nodes.map((n) => [n.id, n] as const));
    const visited = new Set<string>();
    let cursor = node.id;
    // Walk back up to 6 hops to avoid pathological loops.
    for (let i = 0; i < 6; i++) {
      const inbound = edges.find((e) => e.target === cursor);
      if (!inbound) return null;
      if (visited.has(inbound.source)) return null;
      visited.add(inbound.source);
      const src = byId.get(inbound.source);
      if (!src) return null;
      if (src.type === "action") {
        const at = (src.data as Record<string, unknown>).actionType as string | undefined;
        if (at === "email" || at === "sms" || at === "whatsapp" || at === "call") {
          return at;
        }
      }
      cursor = src.id;
    }
    return null;
  }, [node, nodes, edges]);

  const update = useCallback(
    (key: string, value: unknown) => {
      if (!node) return;
      const currentData = node.data as Record<string, unknown>;
      const newData = { ...currentData, [key]: value };

      // Auto-update label / description based on config
      if (node.type === "trigger") {
        const triggerType = key === "triggerType" ? value : currentData.triggerType;
        if (triggerType === "segment_entry") {
          const seg = key === "segment" ? value : currentData.segment;
          if (seg) newData.description = seg as string;
        } else if (triggerType === "attribute_change") {
          const field = key === "field" ? value : currentData.field;
          const cond = key === "condition" ? value : currentData.condition;
          const condVal = key === "conditionValue" ? value : currentData.conditionValue;
          if (field) {
            newData.description = `${field}${cond ? ` ${cond}` : ""}${condVal ? ` ${condVal}` : ""}`;
          }
        } else if (triggerType === "event") {
          const evt = key === "event" ? value : currentData.event;
          if (evt) newData.description = evt as string;
        }
      }

      if (node.type === "condition") {
        const ct = key === "conditionType" ? value : currentData.conditionType;
        if (ct === "check_attribute") {
          const field = key === "field" ? value : currentData.field;
          const op = key === "operator" ? value : currentData.operator;
          const val = key === "value" ? value : currentData.value;
          if (field && op && val) {
            const opMap: Record<string, string> = { equals: "=", greater_than: ">", less_than: "<", between: "between", not_equals: "!=" };
            newData.description = `${(field as string).toUpperCase()} ${opMap[op as string] ?? op} ${val}`;
          }
          newData.label = "Check Attribute";
        } else if (ct === "is_in_segment") {
          const seg = key === "segment" ? value : currentData.segment;
          if (seg) newData.description = `In "${seg}"`;
          newData.label = "Is In Segment";
        } else if (ct === "has_done_event") {
          const evt = key === "event" ? value : currentData.event;
          const tw = key === "timeWindow" ? value : currentData.timeWindow;
          const twu = key === "timeWindowUnit" ? value : currentData.timeWindowUnit;
          if (evt) newData.description = `${evt}${tw ? ` within ${tw}${(twu as string)?.[0] ?? "h"}` : ""}`;
          newData.label = "Has Done Event";
        } else if (ct === "is_reachable_on") {
          const ch = key === "channels" ? value : currentData.channels;
          if (Array.isArray(ch) && ch.length) newData.description = `Reachable on ${ch.join(", ")}`;
          newData.label = "Is Reachable On";
        }
      }

      if (node.type === "action") {
        const at = currentData.actionType as string;
        const template = key === "template" ? value : currentData.template;
        if (template) {
          newData.description = template as string;
        }
        // Update label based on action type
        const labelMap: Record<string, string> = {
          email: "Send Email",
          sms: "Send SMS",
          whatsapp: "Send WhatsApp",
          call: "Start AI Call",
          agent: "Assign Agent",
          attribute: "Update Attribute",
        };
        if (labelMap[at]) newData.label = labelMap[at];
      }

      if (node.type === "wait") {
        const dur = key === "duration" ? value : currentData.duration;
        const unit = key === "unit" ? value : currentData.unit;
        newData.description = `Wait ${dur} ${unit}`;
      }

      if (node.type === "end") {
        const outcome = key === "outcome" ? value : currentData.outcome;
        if (outcome) newData.description = outcome as string;
      }

      onUpdate(node.id, newData);
    },
    [node, onUpdate]
  );

  const multiUpdate = useCallback(
    (updates: Record<string, unknown>) => {
      if (!node) return;
      const currentData = node.data as Record<string, unknown>;
      const newData = { ...currentData, ...updates };
      onUpdate(node.id, newData);
    },
    [node, onUpdate]
  );

  // Active tab in the right config panel (3 tabs)
  const [tab, setTab] = useState<string>("logic");

  if (!node) return null;

  // Look up block metadata (if node was created from the new palette)
  const blockTypeId = (node.data as Record<string, unknown>).blockType as string | undefined;
  const block = blockTypeId ? getBlockType(blockTypeId) : undefined;
  const blockCategory = block ? getBlockCategory(block.category) : undefined;
  const headerLabel = block?.label ?? (node.type ? node.type.charAt(0).toUpperCase() + node.type.slice(1) : "Node");

  // Check whether this node has a rich legacy config form.
  // Block types like wait_until_date / pause / etc. still use nodeKind "wait",
  // but shouldn't show the basic "delay" legacy form — let the block-specific
  // form from block-configs.tsx take precedence.
  const BlockConfigComponent = getBlockConfigForm(blockTypeId);
  const blockOverridesLegacy = Boolean(BlockConfigComponent) && blockTypeId !== "delay";
  const hasLegacyRichConfig =
    ["trigger", "condition", "action", "wait", "split", "end"].includes(node.type ?? "") &&
    !blockOverridesLegacy;
  const hasRichConfig = hasLegacyRichConfig || Boolean(BlockConfigComponent);
  const isBranchNode = (block?.maxOutputs ?? 1) > 1 || node.type === "condition" || node.type === "split";
  const isActionNode = node.type === "action" || block?.category === "channels";

  // Part 1.5 — react to Fix button focus token: scroll + pulse the field.
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!focusField) return;
    const timeout = setTimeout(() => {
      const container = panelRef.current;
      if (!container) return;
      const target: HTMLElement | null = focusField.field
        ? container.querySelector(`[data-focus-field="${focusField.field}"]`)
        : container;
      if (!target) return;
      try {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch {
        target.scrollIntoView();
      }
      target.classList.add("journey-focus-pulse");
      const cleanup = window.setTimeout(() => {
        target.classList.remove("journey-focus-pulse");
      }, 3000);
      return () => window.clearTimeout(cleanup);
    }, 80);
    return () => clearTimeout(timeout);
  }, [focusField]);

  return (
    <div
      ref={panelRef}
      className="flex h-full w-[360px] shrink-0 flex-col border-l border-border bg-card/80 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{headerLabel}</h3>
          {blockCategory && (
            <span
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                blockCategory.bgColor,
                blockCategory.color
              )}
            >
              {blockCategory.label.split(" / ")[0]}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Part 4.3 — Instance-of-component banner. Amber-warning tone,
          explains that edits become overrides. */}
      {instanceContext && (
        <div className="flex items-start gap-2 border-b border-warning-500/40 bg-warning-500/10 px-3 py-2 text-[11px] text-warning-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-300" />
          <div className="flex-1">
            <p className="font-medium">
              You're editing an instance of "{instanceContext.componentName}".
            </p>
            <p className="mt-0.5 text-warning-200/80">
              Changes apply to this journey only.{" "}
              <Link
                href={`/components/${instanceContext.componentId}/edit`}
                className="underline underline-offset-2 hover:text-warning-100"
              >
                Open master
              </Link>{" "}
              to change every journey using this component.
            </p>
          </div>
        </div>
      )}

      {/* Part 5.3 — Master editor hint */}
      {masterContext && (
        <div className="flex items-start gap-2 border-b border-violet-500/40 bg-violet-500/10 px-3 py-2 text-[11px] text-violet-100">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
          <div className="flex-1">
            <p className="font-medium">Master editor — changes flow to every instance.</p>
            <p className="mt-0.5 text-violet-200/80">
              Use the 🔒 icon on any field to prevent instance overrides.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v ?? "logic")}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b border-border px-2 pt-2">
          <TabsList variant="line" className="h-7 w-full justify-start gap-0">
            <TabsTrigger value="general" className="flex-none px-2 text-[10px]">
              <Settings className="h-3 w-3" />
              General
            </TabsTrigger>
            <TabsTrigger value="logic" className="flex-none px-2 text-[10px]">
              <Filter className="h-3 w-3" />
              Logic
            </TabsTrigger>
            {isActionNode && (
              <TabsTrigger value="delivery" className="flex-none px-2 text-[10px]">
                <SendIcon className="h-3 w-3" />
                Delivery
              </TabsTrigger>
            )}
            {isBranchNode && (
              <TabsTrigger value="branches" className="flex-none px-2 text-[10px]">
                <GitBranch className="h-3 w-3" />
                Branches
              </TabsTrigger>
            )}
            <TabsTrigger value="advanced" className="flex-none px-2 text-[10px]">
              <SlidersHorizontal className="h-3 w-3" />
              Advanced
            </TabsTrigger>
            {journeyId && (
              <TabsTrigger value="analytics" className="flex-none px-2 text-[10px]">
                <BarChart3 className="h-3 w-3" />
                Analytics
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* General tab — name + description + type */}
        <TabsContent value="general" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {isExperiment && experimentCfg ? (
            <Section title="Experiment">
              <ExperimentGeneralSection cfg={experimentCfg} onChange={updateExperiment} />
            </Section>
          ) : (
            <Section title="Name">
              <Input
                value={(d.label as string) ?? ""}
                onChange={(e) => update("label", e.target.value)}
                className="h-7 text-xs"
                placeholder="Node name..."
              />
            </Section>
          )}
          <Section title="Description">
            <Textarea
              value={(d.description as string) ?? ""}
              onChange={(e) => update("description", e.target.value)}
              className="min-h-[60px] text-xs"
              placeholder="Optional notes about this step..."
            />
          </Section>
          {block && (
            <Section title="Block Type">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-foreground">{block.label}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{block.description}</p>
                {blockCategory && (
                  <p className={cn("mt-1.5 text-[10px]", blockCategory.color)}>
                    Category: {blockCategory.label}
                  </p>
                )}
              </div>
            </Section>
          )}
          {!hasRichConfig && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setTab("logic")}
            >
              Configure {block?.label ?? "Node"}
            </Button>
          )}
        </TabsContent>


        {/* Delivery tab — for action / channel nodes only */}
        {isActionNode && (
          <TabsContent value="delivery" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {(d.actionType as string) === "email" ? (
              <EmailDeliveryPanel d={d} update={update} journeyId={journeyId} />
            ) : (
              <Section title="Provider / sender">
                <p className="text-[11px] text-muted-foreground">
                  Delivery provider and sender ID are set inside the Logic tab for this action.
                  See <span className="font-medium text-foreground">From</span> /{" "}
                  <span className="font-medium text-foreground">Sender ID</span> /{" "}
                  <span className="font-medium text-foreground">Provider</span>.
                </p>
              </Section>
            )}
            <Section title="Send window">
              <NativeSelect
                value={(d.sendWindow as string) ?? "anytime"}
                onChange={(v) => update("sendWindow", v)}
              >
                <option value="anytime">Anytime (default)</option>
                <option value="business">Business hours (09:00–18:00)</option>
                <option value="morning">Morning (09:00–12:00)</option>
                <option value="afternoon">Afternoon (12:00–17:00)</option>
                <option value="evening">Evening (17:00–20:00)</option>
              </NativeSelect>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Messages outside this window queue until the next allowed slot.
              </p>
            </Section>
            <Section title="Retry policy">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Max attempts</Label>
                  <Input
                    type="number"
                    value={(d.maxAttempts as number) ?? 3}
                    onChange={(e) => update("maxAttempts", Number(e.target.value))}
                    className="mt-1 h-7 text-xs"
                    min={1}
                    max={10}
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Retry interval (min)</Label>
                  <Input
                    type="number"
                    value={(d.retryIntervalMin as number) ?? 30}
                    onChange={(e) => update("retryIntervalMin", Number(e.target.value))}
                    className="mt-1 h-7 text-xs"
                    min={1}
                  />
                </div>
              </div>
            </Section>
            <Section title="Frequency cap override">
              <label className="flex cursor-pointer items-center justify-between">
                <span className="text-[11px] text-foreground">Bypass journey-level frequency cap</span>
                <Switch
                  checked={(d.bypassFrequencyCap as boolean) ?? false}
                  onCheckedChange={(v) => update("bypassFrequencyCap", v)}
                  size="sm"
                />
              </label>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Use only for critical compliance messages (e.g. final notices).
              </p>
            </Section>
          </TabsContent>
        )}

        {/* Branches tab — for branching nodes only */}
        {isBranchNode && (
          <TabsContent value="branches" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {isExperiment && experimentCfg ? (
              <Section title="Arms">
                <ExperimentArmsSection cfg={experimentCfg} onChange={updateExperiment} />
              </Section>
            ) : (
              <Section title="Outgoing branches">
                <p className="text-[11px] text-muted-foreground mb-2">
                  Branches are derived from the Logic tab. Edit them here only to rename labels for display on the canvas.
                </p>
                {(() => {
                  const persisted = (d.branchLabels as string[] | undefined) ?? [];
                  const fallback = defaultBranches(node, block);
                  const labels = persisted.length > 0 ? persisted : fallback;
                  if (labels.length === 0) {
                    return (
                      <p className="rounded-md border border-dashed border-border bg-muted/20 px-2 py-3 text-center text-[11px] text-muted-foreground">
                        This block has no configured branches yet.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-1.5">
                      {labels.map((label, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-6 shrink-0 rounded bg-muted px-1.5 py-0.5 text-center font-mono text-[10px] text-muted-foreground">
                            {idx + 1}
                          </span>
                          <Input
                            value={label}
                            onChange={(e) => {
                              const next = [...labels];
                              next[idx] = e.target.value;
                              update("branchLabels", next);
                            }}
                            className="h-7 flex-1 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Section>
            )}
          </TabsContent>
        )}

        {/* Advanced tab */}
        <TabsContent value="advanced" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <Section title="Custom properties">
            <Textarea
              value={(d.customProps as string) ?? ""}
              onChange={(e) => update("customProps", e.target.value)}
              className="min-h-[80px] font-mono text-[10px]"
              placeholder='{ "key": "value" }'
            />
          </Section>
          <Section title="Fallback behaviour">
            <NativeSelect
              value={(d.fallback as string) ?? "skip"}
              onChange={(v) => update("fallback", v)}
            >
              <option value="skip">Skip this step on error</option>
              <option value="end">End journey on error</option>
              <option value="retry">Retry up to 3 times</option>
            </NativeSelect>
          </Section>
          <Section title="Node ID">
            <code className="block rounded bg-muted/30 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
              {node.id}
            </code>
          </Section>
        </TabsContent>

        {/* Logic tab — wraps the existing rich config forms */}
        <TabsContent value="logic" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {!hasRichConfig && (
          <EmptyTabState
            icon={<Filter className="h-5 w-5" />}
            title="Configuration not yet available"
            message={`No configuration schema has been defined for ${block?.label ?? "this block type"} yet. Use the General tab to rename this step or leave a description.`}
          />
        )}

        {/* Block-specific form from block-configs.tsx (covers the 40+
            new block types that don't have a legacy rich form). */}
        {BlockConfigComponent && !hasLegacyRichConfig && (
          <BlockConfigComponent data={d} update={update} upstreamActionType={upstreamActionType} />
        )}
        {/* ============================================================ */}
        {/*  TRIGGER CONFIG                                              */}
        {/* ============================================================ */}
        {hasLegacyRichConfig && node.type === "trigger" && (
          <>
            <Section title="Trigger Type">
              <NativeSelect
                value={(d.triggerType as string) ?? "segment_entry"}
                onChange={(v) => update("triggerType", v)}
              >
                <option value="segment_entry">Segment Entry</option>
                <option value="attribute_change">Attribute Change</option>
                <option value="event">Occurrence of Event</option>
              </NativeSelect>
            </Section>

            {/* Segment Entry */}
            {(d.triggerType as string) === "segment_entry" && (
              <Section title="Segment">
                <NativeSelect
                  value={(d.segment as string) ?? ""}
                  onChange={(v) => update("segment", v)}
                >
                  <option value="">Select segment...</option>
                  {SEGMENTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </NativeSelect>
              </Section>
            )}

            {/* Attribute Change */}
            {(d.triggerType as string) === "attribute_change" && (
              <>
                <Section title="Field">
                  <NativeSelect
                    value={(d.field as string) ?? ""}
                    onChange={(v) => update("field", v)}
                  >
                    <option value="">Select field...</option>
                    {ATTRIBUTE_FIELDS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </NativeSelect>
                </Section>
                <Section title="Condition">
                  <NativeSelect
                    value={(d.condition as string) ?? ""}
                    onChange={(v) => update("condition", v)}
                  >
                    <option value="">Select condition...</option>
                    {ATTRIBUTE_CONDITIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </NativeSelect>
                </Section>
                {(d.condition as string) === "changes to" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Value</Label>
                    <Input
                      value={(d.conditionValue as string) ?? ""}
                      onChange={(e) => update("conditionValue", e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Enter value..."
                    />
                  </div>
                )}
              </>
            )}

            {/* Occurrence of Event */}
            {(d.triggerType as string) === "event" && (
              <Section title="Event">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1">
                    <NativeSelect
                      value={(d.event as string) ?? ""}
                      onChange={(v) => update("event", v)}
                    >
                      <option value="">Select event...</option>
                      {EVENT_TRIGGER_CATALOG.map((ev) => (
                        <option key={ev.id} value={ev.id}>{ev.label}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  {(d.event as string) && (
                    <EventTriggerInfoIcon eventId={d.event as string} />
                  )}
                </div>
              </Section>
            )}

            {/* Excel upload — picker + parsed-columns preview */}
            {(d.triggerType as string) === "excel_upload" && (
              <ExcelUploadConfig d={d} update={update} />
            )}

            {/* Schedule */}
            <Section title="Schedule">
              <NativeSelect
                value={(d.schedule as string) ?? "continuously"}
                onChange={(v) => update("schedule", v)}
              >
                <option value="continuously">Continuously</option>
                <option value="once">Once</option>
                <option value="daily">Daily at time</option>
              </NativeSelect>
              {(d.schedule as string) === "daily" && (
                <Input
                  type="time"
                  value={(d.scheduleTime as string) ?? "09:00"}
                  onChange={(e) => update("scheduleTime", e.target.value)}
                  className="mt-2 h-7 text-xs"
                />
              )}
            </Section>
          </>
        )}

        {/* ============================================================ */}
        {/*  CONDITION CONFIG                                            */}
        {/* ============================================================ */}
        {hasLegacyRichConfig && node.type === "condition" && (
          <>
            <Section title="Condition Type">
              <NativeSelect
                value={(d.conditionType as string) ?? "check_attribute"}
                onChange={(v) => update("conditionType", v)}
              >
                <option value="check_attribute">Check Attribute</option>
                <option value="is_in_segment">Is In Segment</option>
                <option value="has_done_event">Has Done Event</option>
                <option value="is_reachable_on">Is Reachable On</option>
              </NativeSelect>
            </Section>

            {/* Check Attribute */}
            {(d.conditionType as string) === "check_attribute" && (
              <>
                <Section title="Field">
                  <RoleScopedFilterPicker
                    value={(d.field as string) ?? ""}
                    onChange={(v) => update("field", v)}
                  />
                </Section>
                <Section title="Operator">
                  <NativeSelect
                    value={(d.operator as string) ?? "equals"}
                    onChange={(v) => update("operator", v)}
                  >
                    {Object.entries(CONDITION_OPERATORS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </NativeSelect>
                </Section>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Value</Label>
                  {(d.operator as string) === "between" ? (
                    <div className="flex gap-2">
                      <Input
                        value={(d.valueMin as string) ?? ""}
                        onChange={(e) => {
                          update("valueMin", e.target.value);
                          update("value", `${e.target.value}-${(d.valueMax as string) ?? ""}`);
                        }}
                        className="h-7 text-xs"
                        placeholder="Min"
                      />
                      <Input
                        value={(d.valueMax as string) ?? ""}
                        onChange={(e) => {
                          update("valueMax", e.target.value);
                          update("value", `${(d.valueMin as string) ?? ""}-${e.target.value}`);
                        }}
                        className="h-7 text-xs"
                        placeholder="Max"
                      />
                    </div>
                  ) : (
                    <Input
                      value={(d.value as string) ?? ""}
                      onChange={(e) => update("value", e.target.value)}
                      className="h-7 text-xs"
                      placeholder={
                        (d.field as string) === "dpd" ? "e.g. 60" :
                        (d.field as string) === "outstanding_amount" ? "e.g. 5000" :
                        "Enter value..."
                      }
                    />
                  )}
                </div>
              </>
            )}

            {/* Is In Segment */}
            {(d.conditionType as string) === "is_in_segment" && (
              <Section title="Segment">
                <NativeSelect
                  value={(d.segment as string) ?? ""}
                  onChange={(v) => update("segment", v)}
                >
                  <option value="">Select segment...</option>
                  {SEGMENTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </NativeSelect>
              </Section>
            )}

            {/* Has Done Event */}
            {(d.conditionType as string) === "has_done_event" && (
              <>
                <Section title="Event">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1">
                      <NativeSelect
                        value={(d.event as string) ?? ""}
                        onChange={(v) => update("event", v)}
                      >
                        <option value="">Select event...</option>
                        {EVENT_TRIGGER_CATALOG.map((ev) => (
                          <option key={ev.id} value={ev.id}>{ev.label}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    {(d.event as string) && (
                      <EventTriggerInfoIcon eventId={d.event as string} />
                    )}
                  </div>
                </Section>
                <Section title="Time Window">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={(d.timeWindow as number) ?? 24}
                        onChange={(e) => update("timeWindow", Number(e.target.value))}
                        className="h-7 text-xs"
                        min={1}
                      />
                    </div>
                    <div className="w-24">
                      <NativeSelect
                        value={(d.timeWindowUnit as string) ?? "hours"}
                        onChange={(v) => update("timeWindowUnit", v)}
                      >
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </NativeSelect>
                    </div>
                  </div>
                </Section>
              </>
            )}

            {/* Is Reachable On */}
            {(d.conditionType as string) === "is_reachable_on" && (
              <Section title="Channels">
                <div className="space-y-2">
                  {CHANNELS_LIST.map((ch) => {
                    const channels = ((d.channels as string[]) ?? []);
                    const isChecked = channels.includes(ch.toLowerCase());
                    return (
                      <label key={ch} className="flex items-center gap-2 text-xs text-foreground">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const chLower = ch.toLowerCase();
                            const newChannels = checked
                              ? [...channels, chLower]
                              : channels.filter((c: string) => c !== chLower);
                            update("channels", newChannels);
                          }}
                        />
                        {ch}
                      </label>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Output path labels */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-primary-400" />
                <span className="text-xs text-primary-400">Yes path</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-error-400" />
                <span className="text-xs text-error-400">No path</span>
              </div>
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/*  ACTION CONFIG                                               */}
        {/* ============================================================ */}
        {hasLegacyRichConfig && node.type === "action" && (
          <>
            {/* Channel display */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Channel</Label>
              <div className="flex h-7 items-center rounded-lg border border-input bg-muted/40 px-2 text-xs capitalize text-muted-foreground">
                {((d.actionType as string) ?? "email").replace("_", " ")}
              </div>
            </div>

            {/* ---- Send Email ---- */}
            {(d.actionType as string) === "email" && (
              <>
                <RecipientsControl
                  d={d}
                  update={update}
                  nodes={nodes}
                  edges={edges}
                  nodeId={node?.id ?? ""}
                  channel="email"
                />
                {/* Template / Manual mode toggle */}
                <ModeToggle
                  value={((d.composeMode as string) ?? "template") as "template" | "manual"}
                  onChange={(v) => update("composeMode", v)}
                />

                {((d.composeMode as string) ?? "template") === "template" ? (
                  <ComposerTemplatePicker
                    channel="email"
                    value={(d.template as string) ?? ""}
                    onChange={(v) => update("template", v)}
                    playbookId={(d.playbookId as string) ?? ""}
                    onChangePlaybook={(v) => update("playbookId", v)}
                  />
                ) : (
                  <>
                    <Section title="Subject">
                      <Input
                        dir="auto"
                        value={(d.manualSubject as string) ?? ""}
                        onChange={(e) => update("manualSubject", e.target.value)}
                        placeholder="Use {{borrower.first_name}} for personalization"
                        className="h-8 text-xs"
                      />
                    </Section>
                    <Section title="HTML body">
                      <textarea
                        dir="auto"
                        value={(d.manualBodyHtml as string) ?? ""}
                        onChange={(e) => update("manualBodyHtml", e.target.value)}
                        placeholder="<p>Hi {{borrower.first_name}},</p>"
                        className="min-h-[80px] w-full rounded-md border border-input bg-transparent p-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                      />
                    </Section>
                    <Section title="Plain-text fallback">
                      <textarea
                        dir="auto"
                        value={(d.manualBodyText as string) ?? ""}
                        onChange={(e) => update("manualBodyText", e.target.value)}
                        placeholder="Hi {{borrower.first_name}}, ..."
                        className="min-h-[60px] w-full rounded-md border border-input bg-transparent p-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                      />
                    </Section>
                  </>
                )}

                {/* Shared between both modes */}
                <Section title="From">
                  <Input
                    value={(d.fromAddress as string) ?? ""}
                    onChange={(e) => update("fromAddress", e.target.value)}
                    placeholder="collections@cleargrid.co"
                    className="h-8 text-xs"
                  />
                </Section>
                <Section title="Reply-to">
                  <Input
                    value={(d.replyTo as string) ?? ""}
                    onChange={(e) => update("replyTo", e.target.value)}
                    placeholder="replies@cleargrid.co"
                    className="h-8 text-xs"
                  />
                </Section>
                <Section title="Provider">
                  <NativeSelect
                    value={(d.provider as string) ?? "default"}
                    onChange={(v) => update("provider", v)}
                  >
                    <option value="default">Default ESP</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="ses">Amazon SES</option>
                  </NativeSelect>
                </Section>

                <Link
                  href="/email-generator?channel=email&context=journey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <Wand2 className="h-3 w-3" />
                  Compose in Composer
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </>
            )}

            {/* ---- Send SMS ---- */}
            {(d.actionType as string) === "sms" && (
              <>
                <RecipientsControl
                  d={d}
                  update={update}
                  nodes={nodes}
                  edges={edges}
                  nodeId={node?.id ?? ""}
                  channel="phone"
                />
                {/* Template / Manual mode toggle */}
                <ModeToggle
                  value={((d.composeMode as string) ?? "template") as "template" | "manual"}
                  onChange={(v) => update("composeMode", v)}
                />

                {((d.composeMode as string) ?? "template") === "template" ? (
                  <ComposerTemplatePicker
                    channel="sms"
                    value={(d.template as string) ?? ""}
                    onChange={(v) => update("template", v)}
                    playbookId={(d.playbookId as string) ?? ""}
                    onChangePlaybook={(v) => update("playbookId", v)}
                  />
                ) : (
                  <Section title="SMS body">
                    <textarea
                      dir="auto"
                      value={(d.manualBodyText as string) ?? ""}
                      onChange={(e) => update("manualBodyText", e.target.value)}
                      placeholder="Hi {{borrower.first_name}}, your payment of {{borrower.outstanding}} is due..."
                      className="min-h-[80px] w-full rounded-md border border-input bg-transparent p-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    />
                    <div className="mt-1 flex justify-end">
                      <span className={`text-[10px] ${
                        (((d.manualBodyText as string) ?? "").length > 160) ? "text-warning-400" : "text-muted-foreground"
                      }`}>
                        {((d.manualBodyText as string) ?? "").length}/160
                      </span>
                    </div>
                  </Section>
                )}

                {/* Shared between both modes */}
                <Section title="Sender ID">
                  <Input
                    value={(d.smsSenderId as string) ?? ""}
                    onChange={(e) => update("smsSenderId", e.target.value)}
                    placeholder="ClearGrid"
                    className="h-8 text-xs"
                  />
                </Section>
                <Section title="Provider">
                  <NativeSelect
                    value={(d.provider as string) ?? "default"}
                    onChange={(v) => update("provider", v)}
                  >
                    <option value="default">Default SMS provider</option>
                    <option value="twilio">Twilio</option>
                    <option value="unifonic">Unifonic</option>
                  </NativeSelect>
                </Section>

                <Link
                  href="/email-generator?channel=sms&context=journey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <Wand2 className="h-3 w-3" />
                  Compose in Composer
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </>
            )}

            {/* ---- Send WhatsApp ---- */}
            {(d.actionType as string) === "whatsapp" && (
              <>
                <Section title="WhatsApp Template">
                  <NativeSelect
                    value={(d.template as string) ?? ""}
                    onChange={(v) => update("template", v)}
                  >
                    <option value="">Select template...</option>
                    {WHATSAPP_TEMPLATES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </NativeSelect>
                </Section>
                {(d.template as string) && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-xs text-green-400">Approved template</span>
                  </div>
                )}
                <Link
                  href="/email-generator?channel=whatsapp&context=journey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <Wand2 className="h-3 w-3" />
                  Compose in Composer
                  <ExternalLink className="h-3 w-3" />
                </Link>
                {(d.template as string) && (
                  <Link
                    href="/templates/editor"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Edit template
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </>
            )}

            {/* ---- Shared message preview (email/sms/whatsapp) ---- */}
            {(["email", "sms", "whatsapp"] as const).includes(
              (d.actionType as "email" | "sms" | "whatsapp"),
            ) && (
              <NodeMessagePreview
                data={d}
                journeyId={journeyId}
                nodeId={node?.id ?? ""}
                nodes={nodes}
                edges={edges}
                selectedRunId={selectedRunId}
              />
            )}

            {/* ---- Start AI Call — Project → Agent → Params → Delivery ---- */}
            {(d.actionType as string) === "call" && (
              <>
                <RecipientsControl
                  d={d}
                  update={update}
                  nodes={nodes}
                  edges={edges}
                  nodeId={node?.id ?? ""}
                  channel="phone"
                />
                <AICallConfig
                  d={d}
                  update={update}
                  multiUpdate={multiUpdate}
                  journeyId={journeyId}
                />
              </>
            )}

            {/* ---- Part 5: Trigger Human Campaign ---- */}
            {(d.actionType as string) === "human_campaign" && (
              <>
                <RecipientsControl
                  d={d}
                  update={update}
                  nodes={nodes}
                  edges={edges}
                  nodeId={node?.id ?? ""}
                  channel="phone"
                />
                <HumanCampaignConfig d={d} update={update} />
              </>
            )}

            {/* ---- Send Webhook ---- */}
            {(d.actionType as string) === "webhook" && (
              <WebhookActionConfig d={d} update={update} />
            )}

            {/* ---- Assign Agent ---- */}
            {(d.actionType as string) === "agent" && (
              <>
                <Section title="Team">
                  <NativeSelect
                    value={(d.team as string) ?? ""}
                    onChange={(v) => update("team", v)}
                  >
                    <option value="">Select team...</option>
                    {AGENT_TEAMS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </NativeSelect>
                </Section>
                <Section title="Priority">
                  <NativeSelect
                    value={(d.priority as string) ?? "Medium"}
                    onChange={(v) => update("priority", v)}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </NativeSelect>
                </Section>
              </>
            )}

            {/* ---- Update Attribute ---- */}
            {(d.actionType as string) === "attribute" && (
              <>
                <Section title="Field">
                  <div data-focus-field="field">
                  <NativeSelect
                    value={(d.field as string) ?? ""}
                    onChange={(v) => update("field", v)}
                  >
                    <option value="">Select field...</option>
                    {ATTRIBUTE_FIELDS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </NativeSelect>
                  </div>
                </Section>
                <div className="space-y-1.5" data-focus-field="newValue">
                  <Label className="text-xs text-muted-foreground">New Value</Label>
                  <Input
                    value={(d.newValue as string) ?? ""}
                    onChange={(e) => update("newValue", e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Enter new value..."
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/*  WAIT CONFIG                                                 */}
        {/* ============================================================ */}
        {hasLegacyRichConfig && node.type === "wait" && (
          <>
            <Section title="Wait Duration">
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <Input
                    type="number"
                    value={(d.duration as number) ?? 24}
                    onChange={(e) => update("duration", Number(e.target.value))}
                    className="h-7 text-xs"
                    min={1}
                  />
                </div>
                <div className="w-24 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Unit</Label>
                  <NativeSelect
                    value={(d.unit as string) ?? "hours"}
                    onChange={(v) => update("unit", v)}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </NativeSelect>
                </div>
              </div>
            </Section>

            <Section title="Wait Until (optional)">
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground">Day of week</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                    const days = ((d.waitDays as string[]) ?? []);
                    const isSelected = days.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const newDays = isSelected
                            ? days.filter((dd: string) => dd !== day)
                            : [...days, day];
                          update("waitDays", newDays);
                        }}
                        className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <Input
                  type="time"
                  value={(d.waitTime as string) ?? "09:00"}
                  onChange={(e) => update("waitTime", e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </Section>

            <Section title="Options">
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-xs text-foreground">Skip weekends</span>
                  <Switch
                    checked={(d.skipWeekends as boolean) ?? false}
                    onCheckedChange={(val) => update("skipWeekends", val)}
                    size="sm"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-xs text-foreground">Respect contact hours</span>
                  <Switch
                    checked={(d.respectContactHours as boolean) ?? true}
                    onCheckedChange={(val) => update("respectContactHours", val)}
                    size="sm"
                  />
                </label>
              </div>
            </Section>
          </>
        )}

        {/* ============================================================ */}
        {/*  EXPERIMENT / A-B TEST CONFIG                                */}
        {/* ============================================================ */}
        {hasLegacyRichConfig && node.type === "split" && experimentCfg && (
          <Section title="Goal, duration & winner">
            <ExperimentGoalLogicSection cfg={experimentCfg} onChange={updateExperiment} />
          </Section>
        )}

        {/* ============================================================ */}
        {/*  END CONFIG                                                  */}
        {/* ============================================================ */}
        {hasLegacyRichConfig && node.type === "end" && (
          <>
            <Section title="Outcome">
              <NativeSelect
                value={(d.outcome as string) ?? ""}
                onChange={(v) => update("outcome", v)}
              >
                <option value="">Select outcome...</option>
                {OUTCOME_TAGS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </NativeSelect>
            </Section>
            <label className="flex items-center justify-between">
              <span className="text-xs text-foreground">Record outcome</span>
              <Switch
                checked={(d.recordOutcome as boolean) ?? true}
                onCheckedChange={(val) => update("recordOutcome", val)}
                size="sm"
              />
            </label>
          </>
        )}
        </TabsContent>

        {/* Analytics tab — per-run per-node borrower list. */}
        {journeyId && node && (
          <TabsContent value="analytics" className="min-h-0 flex-1 overflow-hidden p-0">
            {isExperiment ? (
              <div className="h-full overflow-y-auto p-3">
                <ExperimentAnalyticsTab
                  journeyId={journeyId}
                  nodeId={node.id}
                  nodes={nodes}
                  edges={edges}
                  data={d}
                />
              </div>
            ) : (
              <NodeAnalyticsTab
                journeyId={journeyId}
                runId={selectedRunId ?? null}
                nodeId={node.id}
                nodeLabel={(d.label as string) ?? node.id}
                nodeType={node.type ?? "action"}
                blockType={d.blockType as string | undefined}
                senderProfileId={(d.senderProfileId as string | undefined) ?? undefined}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
      <div className="border-t border-border p-4">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => {
            onDeleteNode?.()
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete node
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function EmptyTabState({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center">
      <div className="mb-2 text-muted-foreground">{icon}</div>
      <p className="text-xs font-medium text-foreground">{title}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

function defaultBranches(node: Node | null, block: ReturnType<typeof getBlockType>): string[] {
  if (!node) return [];
  if (node.type === "condition") return ["Yes", "No"];
  if (node.type === "split") return ["A", "B"];
  if (block?.maxOutputs && block.maxOutputs > 1) {
    const kind = (node.data as Record<string, unknown>).branchKind as string | undefined;
    switch (kind) {
      case "audience_split":
        return ["Group A", "Group B", "Group C", "Group D", "Group E"].slice(0, block.maxOutputs);
      case "action_path":
        return ["Clicked", "Opened", "Dismissed", "No Action"];
      case "best_channel":
        return ["Email", "SMS", "Push", "WhatsApp"];
      case "inbound_evaluator":
        return ["Positive", "Negative", "Neutral", "No Reply"];
      case "profile_check":
        return ["Match", "No Match", "Unknown"];
      case "wait_for_event":
        return ["Event", "Timeout"];
      case "call_api":
        return ["Success", "Timeout"];
      case "traffic_split":
        return ["Path A", "Path B", "Path C", "Path D", "Path E"].slice(0, block.maxOutputs);
      default:
        return Array.from({ length: block.maxOutputs }, (_, i) => `Out ${i + 1}`);
    }
  }
  return [];
}


/* ------------------------------------------------------------------ */
/*  Template / Manual mode toggle (used by Send Email + Send SMS)     */
/* ------------------------------------------------------------------ */

function ModeToggle({
  value,
  onChange,
}: {
  value: "template" | "manual";
  onChange: (v: "template" | "manual") => void;
}) {
  return (
    <div className="flex rounded-lg border border-border bg-muted/20 p-0.5">
      <button
        type="button"
        onClick={() => onChange("template")}
        className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          value === "template"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Template
      </button>
      <button
        type="button"
        onClick={() => onChange("manual")}
        className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          value === "manual"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Manual
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Part 4 — Composer template picker.
 *
 * Replaces the hardcoded EMAIL_TEMPLATES / SMS_TEMPLATES arrays with a
 * registry-backed picker that pulls from Composer's rich HTML + plain
 * templates + playbooks. When the user picks "Create new template" the
 * link pushes to /email-generator/builder/new with a base64 prefill blob.
 * ══════════════════════════════════════════════════════════════════════════ */

function ComposerTemplatePicker({
  channel,
  value,
  onChange,
  playbookId,
  onChangePlaybook,
}: {
  channel: "email" | "sms" | "whatsapp";
  value: string;
  onChange: (v: string) => void;
  playbookId: string;
  onChangePlaybook: (v: string) => void;
}) {
  const templates = getComposerTemplatesForChannel(channel);
  const playbooks = getComposerPlaybooks();
  const active = templates.find((t) => t.id === value);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Category filter — All / HTML (rich) / Plain text.
  const [category, setCategory] = useState<"all" | "rich" | "plain">("all");
  const [query, setQuery] = useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (category === "rich" && t.source !== "rich") return false;
      if (category === "plain" && t.source !== "plain") return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.lenderName.toLowerCase().includes(q) ||
        (t.subject ?? "").toLowerCase().includes(q)
      );
    });
  }, [templates, category, query]);

  const richCount = templates.filter((t) => t.source === "rich").length;
  const plainCount = templates.filter((t) => t.source === "plain").length;

  const prefillUrl =
    "/email-generator/builder/new?" +
    new URLSearchParams({
      channel,
      from: "journey",
      prefill: encodeTemplatePrefill({
        name: `Journey · ${channel} draft`,
        body: "",
        channel,
      }),
    }).toString();

  // "Edit template" points at the v3 builder for rich HTML templates and at
  // the legacy plain editor for plain-text ones.
  const editHref = active
    ? active.source === "rich"
      ? `/email-generator/builder/${active.id}`
      : `/templates/editor?id=${active.id}`
    : "";

  return (
    <>
      <Section title="Composer template">
        <div data-focus-field="template" className="space-y-2">
          {/* Category chips — visually distinguish HTML vs plain sources. */}
          {channel === "email" && (
            <div className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/[0.04] p-0.5 text-[10px]">
              <CategoryChip
                active={category === "all"}
                onClick={() => setCategory("all")}
              >
                All <span className="opacity-60">· {templates.length}</span>
              </CategoryChip>
              <CategoryChip
                active={category === "rich"}
                onClick={() => setCategory("rich")}
                tone="primary"
              >
                <Blocks className="h-2.5 w-2.5" />
                HTML <span className="opacity-60">· {richCount}</span>
              </CategoryChip>
              <CategoryChip
                active={category === "plain"}
                onClick={() => setCategory("plain")}
                tone="muted"
              >
                Plain text <span className="opacity-60">· {plainCount}</span>
              </CategoryChip>
            </div>
          )}
          {/* Search */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates by name, lender, subject…"
            className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-[11px] outline-none focus-visible:border-ring dark:bg-input/30"
          />
          {/* Card list — visual template previews replace the flat dropdown. */}
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border/60 bg-muted/[0.02] p-1">
            {filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onChange(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
                    value === t.id
                      ? "border-primary/60 bg-primary/[0.08]"
                      : "border-transparent hover:bg-muted/40",
                  )}
                >
                  <TemplateSwatch source={t.source} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[11px] font-medium text-foreground">
                        {t.name}
                      </span>
                      {t.source === "rich" ? (
                        <span className="rounded bg-primary/15 px-1 py-px text-[9px] font-medium uppercase tracking-wider text-primary">
                          HTML
                        </span>
                      ) : (
                        <span className="rounded bg-muted px-1 py-px text-[9px] font-medium uppercase tracking-wider text-neutral-300">
                          Plain
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {t.lenderName}
                      {t.subject ? ` · ${t.subject}` : ""}
                    </div>
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                No templates match.
              </li>
            )}
          </ul>
          <p className="text-[10px] text-muted-foreground">
            Pulls from Composer&apos;s template registry.{" "}
            <span className="rounded bg-primary/15 px-1 text-primary">HTML</span>{" "}
            = rich block-based (Open HTML builder to author).{" "}
            <span className="rounded bg-muted px-1 text-neutral-300">Plain</span>{" "}
            = free-text template. Every send tagged{" "}
            <code className="font-mono">source: journey_[id]</code>.
          </p>
        </div>
      </Section>

      {active && (
        <>
          <ComposerTemplatePreview template={active} />
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={editHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {active.source === "rich" ? <Blocks className="h-3 w-3" /> : <Wand2 className="h-3 w-3" />}
              Edit template
              <ExternalLink className="h-3 w-3" />
            </Link>
            <span className="text-[10px] text-muted-foreground">
              opens the {active.source === "rich" ? "HTML builder" : "plain template editor"} in a new tab
            </span>
          </div>
        </>
      )}

      <Section title="Playbook (optional)">
        <NativeSelect value={playbookId} onChange={onChangePlaybook}>
          <option value="">None</option>
          {playbooks.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.tone}
            </option>
          ))}
        </NativeSelect>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Playbook compliance rules run at journey publish time.
        </p>
      </Section>

      {/* Variable overrides — advanced */}
      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex w-full items-center gap-1 rounded-md border border-border/60 bg-muted/10 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          {advancedOpen ? "▾" : "▸"} Variable overrides (journey-scoped)
        </button>
        {advancedOpen && (
          <div className="mt-2 rounded-md border border-border bg-muted/10 p-3 text-[11px] text-muted-foreground">
            <p>
              Journey-scoped merge-tag overrides. Set key/value pairs here to
              override the template&apos;s defaults just for this journey&apos;s
              sends — the underlying template is untouched.
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground/70">
              Overrides UI wired in a follow-up. For now, edit the template
              directly if you need to change copy.
            </p>
          </div>
        )}
      </div>

      <Link
        href={prefillUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
      >
        <Wand2 className="h-3 w-3" />
        Author full template in Composer
        <ExternalLink className="h-3 w-3" />
      </Link>
    </>
  );
}

function ComposerTemplatePreview({ template }: { template: ComposerTemplateEntry }) {
  // When the picked template is an HTML rich template, look up its
  // definition + render the actual JSX so the sidebar preview shows what
  // the borrower will receive — not just a text description.
  const rich = template.source === "rich" ? getRichTemplate(template.id) : undefined
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Preview
        </p>
        <div className="flex items-center gap-1">
          <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium text-neutral-300">
            {template.lenderName}
          </span>
          {template.source === "rich" && (
            <span className="rounded bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-medium text-primary-300">
              Rich HTML
            </span>
          )}
        </div>
      </div>
      {template.subject && (
        <p className="mt-1.5 text-xs font-semibold text-foreground">
          Subject: {template.subject}
        </p>
      )}
      {rich ? (
        // Scaled-down live HTML render. The rich template already carries a
        // full JSX renderer + defaultSlots — we mount it non-interactive and
        // scale it to fit the sidebar width. Overflow-y is scrollable so long
        // templates don't blow out the panel height.
        <div className="mt-2 overflow-hidden rounded-md border border-border/60 bg-white">
          <div className="max-h-[380px] overflow-y-auto">
            <div
              style={{
                transform: "scale(0.44)",
                transformOrigin: "top left",
                width: "227%", // 100 / 0.44 so the scaled-down box fills width
              }}
            >
              {rich.render({ slots: rich.defaultSlots, interactive: false })}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80 line-clamp-3">
          {template.preview}
        </p>
      )}
    </div>
  );
}

/** Small chip used inside the template category filter row. */
function CategoryChip({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean
  onClick: () => void
  tone?: "primary" | "muted"
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 font-medium transition-colors",
        active
          ? tone === "primary"
            ? "bg-primary/15 text-primary"
            : tone === "muted"
              ? "bg-muted/80 text-foreground"
              : "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

/** 20px thumbnail that visually differentiates HTML vs plain templates. */
function TemplateSwatch({ source }: { source: "rich" | "plain" }) {
  if (source === "rich") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-primary/40 bg-gradient-to-br from-primary/20 to-primary/5">
        <Blocks className="h-4 w-4 text-primary" />
      </div>
    )
  }
  return (
    <div className="flex h-9 w-9 shrink-0 flex-col items-start justify-center gap-0.5 rounded border border-border/60 bg-muted/40 px-1">
      <span className="block h-0.5 w-6 rounded bg-neutral-500" />
      <span className="block h-0.5 w-5 rounded bg-neutral-500" />
      <span className="block h-0.5 w-6 rounded bg-neutral-500" />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Part 5 — Human Campaign config panel.
 *
 * Hybrid mode: Use existing campaign / Create new campaign. Enrollment
 * fires a console.log stub (real Campaigns API is out of scope). Journey
 * continues either Immediately or Wait-for-outcome.
 * ══════════════════════════════════════════════════════════════════════════ */

const DIALERS = [
  { id: "isdn7", label: "ISDN 7", gateway: "isdn7" },
  { id: "isdn3", label: "ISDN 3", gateway: "isdn3" },
  { id: "sip_asterisk", label: "SIP · Asterisk", gateway: "sip-asterisk-01" },
  { id: "sip_freeswitch", label: "SIP · FreeSWITCH", gateway: "sip-fs-01" },
] as const;

const AGENT_GROUP_OPTIONS = [
  "Collections · UAE · English",
  "Collections · UAE · Arabic",
  "Collections · KSA · Arabic",
  "Hardship Care",
  "Settlement Negotiators",
  "Final Notice Specialists",
] as const;

const DEFAULT_STAGES = ["PTP", "Broken Promise", "RPC", "Attempted", "Allocated"];

/**
 * Human Campaign config panel — mirrors Command's Create-human-campaign dialog
 * (Basics / Audience / Schedule / Messages tabs). Audience defaults to
 * "inherited from journey step" since journeys own the audience upstream.
 */
function HumanCampaignConfig({
  d,
  update,
}: {
  d: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  const composeMode = ((d.composeMode as string) ?? "existing") as "existing" | "create";
  const campaigns = getCampaignsForLender((d.lenderId as string) ?? "general");
  const activeCampaign: HumanCampaign | undefined = campaigns.find(
    (c) => c.id === (d.campaignId as string),
  );
  const [tab, setTab] = useState<"basics" | "audience" | "schedule" | "messages">("basics");

  return (
    <div className="space-y-3">
      {/* Header: existing vs create mode + pause-by-default */}
      <div className="rounded-lg border border-border bg-muted/10 p-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => update("composeMode", "existing")}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              composeMode === "existing"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Use existing
          </button>
          <button
            type="button"
            onClick={() => update("composeMode", "create")}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              composeMode === "create"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Create new
          </button>
        </div>
      </div>

      {composeMode === "existing" ? (
        <>
          <Section title="Campaign">
            <div data-focus-field="campaignId">
              <NativeSelect
                value={(d.campaignId as string) ?? ""}
                onChange={(v) => {
                  update("campaignId", v);
                  const c = campaigns.find((cc) => cc.id === v);
                  if (c) update("campaignName", c.name);
                }}
              >
                <option value="">Select campaign…</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {SKILL_GROUP_LABEL[c.skillGroup]} · queued {c.queued}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </Section>

          {activeCampaign && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Skill group</span>
                <span className="font-medium text-foreground">
                  {SKILL_GROUP_LABEL[activeCampaign.skillGroup]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Priority tier</span>
                <span className="font-medium text-foreground capitalize">
                  {activeCampaign.priorityTier}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Queue depth</span>
                <span className="tabular-nums text-foreground">
                  {activeCampaign.queued.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                    activeCampaign.status === "processing_calls"
                      ? "bg-primary-500/20 text-primary-300"
                      : "bg-warning-500/20 text-warning-300",
                  )}
                >
                  {activeCampaign.status}
                </span>
              </div>
            </div>
          )}

          <Section title="Enrollment overrides (optional)">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Priority tier
                </Label>
                <NativeSelect
                  value={(d.priorityOverride as string) ?? ""}
                  onChange={(v) => update("priorityOverride", v)}
                >
                  <option value="">Use campaign default</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </NativeSelect>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Urgency
                </Label>
                <NativeSelect
                  value={(d.urgencyOverride as string) ?? ""}
                  onChange={(v) => update("urgencyOverride", v)}
                >
                  <option value="">Use campaign default</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                </NativeSelect>
              </div>
            </div>
          </Section>

          <HumanCampaignJourneyExit d={d} update={update} />
        </>
      ) : (
        <HumanCampaignCreateTabs
          d={d}
          update={update}
          tab={tab}
          setTab={setTab}
        />
      )}

      <div className="rounded-md border border-primary-500/30 bg-primary-500/5 p-2.5 text-[10px] text-primary-300/80">
        Audience is inherited from the upstream journey step. Enrollment tagged{" "}
        <code className="rounded bg-black/30 px-1 py-px font-mono">source: journey_[id]</code>{" "}
        · <code className="rounded bg-black/30 px-1 py-px font-mono">source_node: node_[id]</code>.
        Campaigns owns the script + agent-facing config.
      </div>
    </div>
  );
}

/**
 * Tabbed "Create new campaign" panel — mirrors Command's Create-human-campaign
 * dialog (Basics / Audience / Schedule / Messages).
 */
function HumanCampaignCreateTabs({
  d,
  update,
  tab,
  setTab,
}: {
  d: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
  tab: "basics" | "audience" | "schedule" | "messages";
  setTab: (v: "basics" | "audience" | "schedule" | "messages") => void;
}) {
  return (
    <>
      {/* Pause by default toggle (top-right of the create card in Command) */}
      <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-muted/10 px-2.5 py-1.5 text-[11px]">
        <span className="text-foreground">Pause by default</span>
        <Switch
          checked={(d.pauseByDefault as boolean) ?? false}
          onCheckedChange={(v) => update("pauseByDefault", v)}
          size="sm"
        />
      </label>

      {/* Tab strip */}
      <div className="flex items-center gap-1 border-b border-border">
        {(
          [
            { id: "basics", label: "Basics", optional: false },
            { id: "audience", label: "Audience", optional: false },
            { id: "schedule", label: "Schedule", optional: false },
            { id: "messages", label: "Messages", optional: true },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px flex items-center gap-1 border-b-2 px-2 py-1.5 text-[11px] font-medium transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.optional && (
              <span className="rounded bg-muted px-1 py-px text-[9px] uppercase text-muted-foreground">
                Optional
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "basics" && <HumanCampaignBasicsTab d={d} update={update} />}
      {tab === "audience" && <HumanCampaignAudienceTab d={d} update={update} />}
      {tab === "schedule" && <HumanCampaignScheduleTab d={d} update={update} />}
      {tab === "messages" && <HumanCampaignMessagesTab d={d} update={update} />}

      <Link
        href="/campaigns?draft=1"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
      >
        <Wand2 className="h-3 w-3" />
        Open full editor in Campaigns
        <ExternalLink className="h-3 w-3" />
      </Link>
      <HumanCampaignJourneyExit d={d} update={update} />
    </>
  );
}

function HumanCampaignBasicsTab({
  d,
  update,
}: {
  d: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  const dialerId = (d.newDialer as string) ?? "isdn7";
  const dialer = DIALERS.find((x) => x.id === dialerId) ?? DIALERS[0];
  return (
    <div className="space-y-3">
      <Section title="Campaign name *">
        <Input
          data-focus-field="newCampaignName"
          value={(d.newCampaignName as string) ?? ""}
          onChange={(e) => update("newCampaignName", e.target.value)}
          placeholder="Enter campaign name"
          className="h-8 text-xs"
        />
      </Section>
      <Section title="Dialer *">
        <NativeSelect
          value={dialerId}
          onChange={(v) => {
            update("newDialer", v);
            const found = DIALERS.find((x) => x.id === v);
            if (found) update("newGateway", found.gateway);
          }}
        >
          {DIALERS.map((x) => (
            <option key={x.id} value={x.id}>{x.label}</option>
          ))}
        </NativeSelect>
      </Section>
      <Section title="Gateway">
        <Input
          value={(d.newGateway as string) ?? dialer.gateway}
          disabled
          className="h-8 text-xs font-mono opacity-70"
        />
      </Section>
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">Agent Group *</Label>
        <button
          type="button"
          onClick={() =>
            toast.info("User groups", {
              description: "Opens the Agents · Groups management page. Stub in the prototype.",
            })
          }
          className="text-[10px] font-medium text-primary hover:underline"
        >
          Manage user groups
        </button>
      </div>
      <NativeSelect
        value={(d.newAgentGroup as string) ?? ""}
        onChange={(v) => update("newAgentGroup", v)}
      >
        <option value="">Select an agent group</option>
        {AGENT_GROUP_OPTIONS.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </NativeSelect>
      <Section title="Secondary group">
        <NativeSelect
          value={(d.newSecondaryGroup as string) ?? ""}
          onChange={(v) => update("newSecondaryGroup", v)}
        >
          <option value="">Optional — used when the primary group is busy</option>
          {AGENT_GROUP_OPTIONS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </NativeSelect>
      </Section>
      <Section title="Dial Speed *">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={10}
            value={(d.newDialSpeed as number) ?? 3}
            onChange={(e) =>
              update(
                "newDialSpeed",
                Math.max(1, Math.min(10, Number(e.target.value) || 3)),
              )
            }
            className="h-8 w-20 text-center text-xs tabular-nums"
          />
          <span className="text-[10px] text-muted-foreground">
            Concurrent lines per agent (1 = manual, 10 = aggressive predictive).
          </span>
        </div>
      </Section>
    </div>
  );
}

function HumanCampaignAudienceTab({
  d,
  update,
}: {
  d: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  const stages = ((d.newCallingPriority as string[]) ?? DEFAULT_STAGES);
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-primary-500/30 bg-primary-500/5 p-2.5 text-[10px] text-primary-300/80">
        <strong className="text-primary-200">Audience is inherited from the journey.</strong>{" "}
        Every borrower that reaches this node is enrolled — the campaign never re-queries a
        segment or view. Priority order below decides which enrolled deals get dialled first.
      </div>

      <Section title="Calling priority">
        <p className="text-[10px] text-muted-foreground">
          Decides which deals get dialled first. Drag to reorder — top = highest priority.
        </p>
        <div className="mt-2 space-y-1">
          {stages.map((stage, i) => (
            <div
              key={stage}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5 text-[11px]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                {i + 1}
              </span>
              <span className="flex-1 text-foreground">{stage}</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (i === 0) return;
                    const next = [...stages];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    update("newCallingPriority", next);
                  }}
                  disabled={i === 0}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (i === stages.length - 1) return;
                    const next = [...stages];
                    [next[i], next[i + 1]] = [next[i + 1], next[i]];
                    update("newCallingPriority", next);
                  }}
                  disabled={i === stages.length - 1}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function HumanCampaignScheduleTab({
  d,
  update,
}: {
  d: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  const whenToRun = ((d.newWhenToRun as string) ?? "on_enroll") as
    | "on_enroll"
    | "immediate"
    | "scheduled";
  const redialEnabled = (d.newRedialEnabled as boolean) ?? false;
  return (
    <div className="space-y-3">
      <Section title="When to run">
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-muted/10 p-2.5 text-[11px]">
            <input
              type="radio"
              name="when-to-run"
              checked={whenToRun === "on_enroll"}
              onChange={() => update("newWhenToRun", "on_enroll")}
              className="mt-0.5 accent-primary"
            />
            <div>
              <p className="font-medium text-foreground">Enroll as journey fires</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Recommended. Borrowers are queued to the campaign as soon as this node runs.
              </p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-muted/10 p-2.5 text-[11px]">
            <input
              type="radio"
              name="when-to-run"
              checked={whenToRun === "scheduled"}
              onChange={() => update("newWhenToRun", "scheduled")}
              className="mt-0.5 accent-primary"
            />
            <div>
              <p className="font-medium text-foreground">Schedule for later</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Batch enrolled borrowers until the campaign window opens (day/time below).
              </p>
            </div>
          </label>
        </div>
      </Section>

      {whenToRun === "scheduled" && (
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Start
            </Label>
            <Input
              type="date"
              value={(d.newScheduleStart as string) ?? ""}
              onChange={(e) => update("newScheduleStart", e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Daily window
            </Label>
            <Input
              type="time"
              value={(d.newScheduleTime as string) ?? "09:00"}
              onChange={(e) => update("newScheduleTime", e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>
      )}

      <Section title="Redial settings">
        <p className="text-[10px] text-muted-foreground">
          Configure how the dialer handles unanswered and failed calls.
        </p>
        <label className="mt-2 flex cursor-pointer items-center justify-between rounded-md border border-border bg-muted/10 px-3 py-2 text-[11px]">
          <div>
            <p className="font-medium text-foreground">Enable redial / multiple attempts</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              After an unanswered call, retry using the rules below.
            </p>
          </div>
          <Switch
            checked={redialEnabled}
            onCheckedChange={(v) => update("newRedialEnabled", v)}
            size="sm"
          />
        </label>
        {redialEnabled && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Max attempts
              </Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={(d.newRedialMaxAttempts as number) ?? 3}
                onChange={(e) =>
                  update(
                    "newRedialMaxAttempts",
                    Math.max(1, Math.min(5, Number(e.target.value) || 3)),
                  )
                }
                className="mt-1 h-8 text-center text-xs tabular-nums"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Interval (minutes)
              </Label>
              <Input
                type="number"
                min={5}
                value={(d.newRedialInterval as number) ?? 60}
                onChange={(e) =>
                  update("newRedialInterval", Math.max(5, Number(e.target.value) || 60))
                }
                className="mt-1 h-8 text-center text-xs tabular-nums"
              />
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

function HumanCampaignMessagesTab({
  d,
  update,
}: {
  d: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Call Messages</p>
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">Welcome Message</Label>
        <Textarea
          value={(d.newWelcomeMessage as string) ?? ""}
          onChange={(e) => update("newWelcomeMessage", e.target.value)}
          placeholder="This is an important call regarding your account. Please stay on the line."
          className="min-h-[64px] text-[11px]"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">Loop Message</Label>
        <Textarea
          value={(d.newLoopMessage as string) ?? ""}
          onChange={(e) => update("newLoopMessage", e.target.value)}
          placeholder="Please wait while we connect your call to one of our agents"
          className="min-h-[64px] text-[11px]"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">Busy Message</Label>
        <Textarea
          value={(d.newBusyMessage as string) ?? ""}
          onChange={(e) => update("newBusyMessage", e.target.value)}
          placeholder="We're sorry, all of our agents are currently unavailable. We will make sure to call you back as soon as possible. Thank you for your patience."
          className="min-h-[80px] text-[11px]"
        />
      </div>
    </div>
  );
}

function HumanCampaignJourneyExit({
  d,
  update,
}: {
  d: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  const continueMode = ((d.continueMode as string) ?? "immediate") as "immediate" | "wait_for_outcome";
  return (
    <>
      {/* Exit conditions */}
      <Section title="Journey exit conditions">
        <div className="space-y-1.5">
          {[
            { id: "on_ptp_captured", label: "PTP captured" },
            { id: "on_dispute", label: "Dispute raised" },
            { id: "on_callback", label: "Callback requested" },
            { id: "on_not_reachable", label: "Not reachable" },
          ].map((x) => {
            const set = ((d.exitOn as string[]) ?? ["on_ptp_captured", "on_dispute"]).includes(x.id);
            return (
              <label key={x.id} className="flex cursor-pointer items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={set}
                  onChange={(e) => {
                    const cur = (d.exitOn as string[]) ?? ["on_ptp_captured", "on_dispute"];
                    const next = e.target.checked ? [...cur, x.id] : cur.filter((id) => id !== x.id);
                    update("exitOn", next);
                  }}
                  className="h-3 w-3 accent-primary"
                />
                <span className="text-foreground">{x.label}</span>
              </label>
            );
          })}
          <div className="flex items-center gap-2 pt-1 text-[11px]">
            <span className="text-muted-foreground">Timeout after</span>
            <Input
              type="number"
              value={(d.timeoutDays as number) ?? 7}
              onChange={(e) => update("timeoutDays", Number(e.target.value) || 7)}
              className="h-7 w-16 text-center text-xs tabular-nums"
            />
            <span className="text-muted-foreground">days if not called</span>
          </div>
        </div>
      </Section>

      <Section title="Journey continues after">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => update("continueMode", "immediate")}
            className={cn(
              "rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors",
              continueMode === "immediate"
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border bg-muted/10 text-foreground hover:border-neutral-700",
            )}
          >
            <div className="font-medium">Immediate</div>
            <div className="mt-0.5 text-[9px] text-muted-foreground">
              Continue downstream in parallel with the campaign.
            </div>
          </button>
          <button
            type="button"
            onClick={() => update("continueMode", "wait_for_outcome")}
            className={cn(
              "rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors",
              continueMode === "wait_for_outcome"
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border bg-muted/10 text-foreground hover:border-neutral-700",
            )}
          >
            <div className="font-medium">Wait for outcome</div>
            <div className="mt-0.5 text-[9px] text-muted-foreground">
              Pause until campaign resolves; branch on outcome.
            </div>
          </button>
        </div>
      </Section>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Part 2 — Redial policy expansion on Trigger AI Call.
 *
 * Collapsible panel that sits under Callback Handling. Controls:
 *   1. Max attempts (1-5)
 *   2. Retry on outcomes (multi-select)
 *   3. Interval mode: fixed / escalating / custom
 *   4. Interval schedule (varies by mode)
 *   5. Exit conditions (multi-select)
 *
 * Defaults mirror the journey-wide default retry policy from Journey Settings.
 * ══════════════════════════════════════════════════════════════════════════ */

const REDIAL_OUTCOMES: Array<{ id: string; label: string }> = [
  { id: "no_answer", label: "No answer" },
  { id: "busy", label: "Busy signal" },
  { id: "voicemail", label: "Voicemail" },
  { id: "dropped_by_ai", label: "Dropped by AI" },
  { id: "call_failed_technical", label: "Technical failure" },
];

const REDIAL_EXITS: Array<{ id: string; label: string }> = [
  { id: "on_ptp_captured", label: "PTP captured" },
  { id: "on_dispute", label: "Dispute raised" },
  { id: "on_callback", label: "Callback captured" },
  { id: "on_dnc_added", label: "Added to DNC" },
  { id: "on_settlement", label: "Settlement reached" },
];

function RedialPolicySection({
  data,
  update,
}: {
  data: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
  journeyId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const enabled = (data.redialEnabled as boolean) ?? true;
  const maxAttempts = (data.redialMaxAttempts as number) ?? 3;
  const retryOn = (data.redialRetryOn as string[]) ?? ["no_answer", "busy", "voicemail"];
  const intervalMode = ((data.redialIntervalMode as string) ?? "escalating") as
    | "fixed"
    | "escalating"
    | "custom";
  const fixedMinutes = (data.redialFixedMinutes as number) ?? 120;
  const escalatingPreset = ((data.redialEscalatingPreset as string) ?? "gentle") as
    | "gentle"
    | "aggressive";
  const customSchedule = (data.redialCustomSchedule as string) ?? "30m, 2h, 24h";
  const exitOn = (data.redialExitOn as string[]) ?? ["on_ptp_captured", "on_dispute", "on_dnc_added"];
  const redialPhoneSelection =
    (data.redialPhoneSelection as PhoneSelection | undefined) ??
    DEFAULT_PHONE_SELECTION;

  const summary = enabled
    ? `${maxAttempts} attempt${maxAttempts === 1 ? "" : "s"} · ${intervalMode}`
    : "Off";

  return (
    <div className="rounded-lg border border-border bg-card/40">
      <button
        type="button"
        onClick={() => setExpanded((s) => !s)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        aria-expanded={expanded}
      >
        <RefreshCcw className="h-3.5 w-3.5 text-primary-400" />
        <span className="flex-1 text-xs font-semibold text-foreground">Redial Policy</span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
            enabled
              ? "bg-primary-500/15 text-primary-400"
              : "bg-neutral-500/15 text-neutral-400",
          )}
        >
          {summary}
        </span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-border p-3">
          {/* Enable */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">Retry failed calls</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Attempts the call again if the outcome is a retriable one below.
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => update("redialEnabled", v)}
              size="sm"
            />
          </div>

          {enabled && (
            <>
              {/* Max attempts */}
              <div data-focus-field="redialMaxAttempts">
                <Label className="text-[11px] text-muted-foreground">
                  Max attempts (including first call)
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={maxAttempts}
                    onChange={(e) => {
                      const n = Math.min(5, Math.max(1, Number(e.target.value) || 1));
                      update("redialMaxAttempts", n);
                    }}
                    className="h-7 w-16 text-center text-xs tabular-nums"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Hard cap 5 to protect against runaway loops.
                  </span>
                </div>
              </div>

              {/* Numbers used across redial attempts */}
              <div className="rounded-md border border-border bg-background/40 p-2.5">
                <ChannelContactPicker
                  mode="phone"
                  value={redialPhoneSelection}
                  onChange={(next) => update("redialPhoneSelection", next)}
                  title="Numbers tried across attempts"
                  compact
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {describePhoneSelection(redialPhoneSelection)}.
                </p>
              </div>

              {/* Retry outcomes */}
              <div>
                <Label className="text-[11px] text-muted-foreground">Retry on outcomes</Label>
                <div className="mt-1.5 space-y-1">
                  {REDIAL_OUTCOMES.map((o) => {
                    const on = retryOn.includes(o.id);
                    return (
                      <label
                        key={o.id}
                        className="flex cursor-pointer items-center gap-2 text-[11px]"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...retryOn, o.id]
                              : retryOn.filter((id) => id !== o.id);
                            update("redialRetryOn", next);
                          }}
                          className="h-3 w-3 accent-primary"
                        />
                        <span className="text-foreground">{o.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Interval mode */}
              <div>
                <Label className="text-[11px] text-muted-foreground">Interval strategy</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(["fixed", "escalating", "custom"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => update("redialIntervalMode", m)}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-[10px] capitalize transition-colors",
                        intervalMode === m
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border bg-muted/10 text-foreground hover:border-neutral-700",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {intervalMode === "fixed" && (
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="text-muted-foreground">Retry every</span>
                    <Input
                      type="number"
                      min={5}
                      value={fixedMinutes}
                      onChange={(e) =>
                        update("redialFixedMinutes", Math.max(5, Number(e.target.value) || 60))
                      }
                      className="h-7 w-20 text-center text-xs tabular-nums"
                    />
                    <span className="text-muted-foreground">minutes</span>
                  </div>
                )}

                {intervalMode === "escalating" && (
                  <div className="mt-2 space-y-1.5">
                    {(["gentle", "aggressive"] as const).map((preset) => {
                      const active = escalatingPreset === preset;
                      const schedule =
                        preset === "gentle" ? "30m → 2h → 24h" : "10m → 30m → 2h → 8h";
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => update("redialEscalatingPreset", preset)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-[11px] transition-colors",
                            active
                              ? "border-primary/60 bg-primary/10 text-primary"
                              : "border-border bg-muted/10 text-foreground hover:border-neutral-700",
                          )}
                        >
                          <span className="capitalize font-medium">{preset}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {schedule}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {intervalMode === "custom" && (
                  <div className="mt-2">
                    <Input
                      value={customSchedule}
                      onChange={(e) => update("redialCustomSchedule", e.target.value)}
                      placeholder="e.g. 30m, 2h, 24h"
                      className="h-7 text-xs font-mono"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Comma-separated delays: m = minutes, h = hours, d = days. One entry per
                      retry gap; extras are ignored beyond max attempts.
                    </p>
                  </div>
                )}
              </div>

              {/* Exit conditions */}
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Exit redial early on
                </Label>
                <div className="mt-1.5 space-y-1">
                  {REDIAL_EXITS.map((x) => {
                    const on = exitOn.includes(x.id);
                    return (
                      <label
                        key={x.id}
                        className="flex cursor-pointer items-center gap-2 text-[11px]"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...exitOn, x.id]
                              : exitOn.filter((id) => id !== x.id);
                            update("redialExitOn", next);
                          }}
                          className="h-3 w-3 accent-primary"
                        />
                        <span className="text-foreground">{x.label}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  If any exit condition fires between attempts, remaining redials are cancelled and
                  the journey proceeds down the corresponding branch.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Part 6.5 — Role-scoped filter picker.
 *
 * Reads from the filter registry, which annotates each filter with a
 * `requiredRole`. Filters the current CURRENT_ROLE can't see are hidden
 * (with a footer count of how many are gated). Locked filters that would
 * appear but require elevation are shown greyed with a lock icon.
 * ══════════════════════════════════════════════════════════════════════════ */

function RoleScopedFilterPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const visible = getVisibleFilters(CURRENT_ROLE);
  const visibleIds = new Set(visible.map((f: FilterDefinition) => f.id));
  const gatedCount = FILTER_REGISTRY.length - visible.length;
  return (
    <>
      <NativeSelect value={value} onChange={onChange}>
        <option value="">Select field…</option>
        {FILTER_REGISTRY.map((f) => {
          const isVisible = visibleIds.has(f.id);
          return (
            <option key={f.id} value={f.id} disabled={!isVisible}>
              {f.label}
              {!isVisible ? " · restricted" : ""}
            </option>
          );
        })}
      </NativeSelect>
      {gatedCount > 0 && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {gatedCount} filter{gatedCount === 1 ? "" : "s"} require elevated role
          (viewing as <span className="font-mono">{CURRENT_ROLE}</span>).
        </p>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  NodeMessagePreview                                                */
/*                                                                    */
/*  Renders the shared "as the borrower received it" preview against  */
/*  a sample borrower + the resolved template/manual body from this   */
/*  Send node's config. Same component the Composer uses so           */
/*  authors get parity when reviewing a journey end-to-end.           */
/* ─────────────────────────────────────────────────────────────────── */

function NodeMessagePreview({
  data,
  journeyId,
  nodeId,
  nodes,
  edges,
  selectedRunId,
}: {
  data: Record<string, unknown>
  journeyId?: string
  nodeId: string
  nodes?: Node[]
  edges?: Edge[]
  selectedRunId?: string | null
}) {
  const [device, setDevice] = React.useState<"ios" | "android">("ios")

  const actionType = (data.actionType as string) ?? "email"
  const channel = (actionType === "call" ? "email" : actionType) as PreviewChannel

  const composeMode = (data.composeMode as string) ?? "template"
  const template = (data.template as string) ?? ""
  const manualSubject = (data.manualSubject as string) ?? ""
  const manualBodyHtml = (data.manualBodyHtml as string) ?? ""
  const manualBodyText = (data.manualBodyText as string) ?? ""

  // Template mode picks the template's stub body from the composer registry;
  // in prototype terms we render the template label as a stand-in body when
  // the registry doesn't return a match. Manual mode uses the entered body.
  const bodySource =
    composeMode === "manual"
      ? channel === "email" && manualBodyHtml
        ? manualBodyHtml.replace(/<[^>]+>/g, "") // strip HTML for the plain-text preview
        : manualBodyText
      : template
        ? `Template · ${template}\n\nHi {{borrower.first_name}},\n\nThis is a sample rendering of the "${template}" template as the borrower will receive it.`
        : `(no template picked)`

  const subjectSource =
    composeMode === "manual"
      ? manualSubject
      : template
        ? `Reminder — ${template}`
        : ""

  const noTemplate = !template && !manualBodyText && !manualBodyHtml

  return (
    <div className="mt-3 space-y-2 rounded-md border border-border/60 bg-muted/[0.04] p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Preview · as the borrower will receive it
      </div>
      {noTemplate ? (
        <MessagePreview
          channel={channel}
          subject=""
          body=""
          senderId={(data.smsSenderId as string) || "ClearGrid"}
          fromName={(data.fromName as string) || "ClearGrid Collections"}
          fromAddress={(data.fromAddress as string) || "collections@cleargrid.ae"}
          clickTracking={data.smsClickTracking !== false}
          device={device}
          onDeviceChange={setDevice}
        />
      ) : (
        <MessagePreviewWithSampling
          journeyId={journeyId}
          nodeId={nodeId}
          channel={channel}
          subject={subjectSource}
          body={bodySource}
          senderId={(data.smsSenderId as string) || "ClearGrid"}
          fromName={(data.fromName as string) || "ClearGrid Collections"}
          fromAddress={(data.fromAddress as string) || "collections@cleargrid.ae"}
          clickTracking={data.smsClickTracking !== false}
          phoneSelection={data.phoneSelection as PhoneSelection | undefined}
          emailSelection={data.emailSelection as EmailSelection | undefined}
          emailSendMode={(data.emailSendMode as string) ?? "one_per_contact"}
          nodes={nodes}
          edges={edges}
          selectedRunId={selectedRunId ?? null}
          device={device}
          onDeviceChange={setDevice}
        />
      )}
    </div>
  )
}

/* ─────────── AI Call · full config (Project → Agent → Params → Delivery) ─────────── */

function AICallConfig({
  d,
  update,
  multiUpdate,
  journeyId,
}: {
  d: Record<string, unknown>
  update: (field: string, value: unknown) => void
  multiUpdate: (updates: Record<string, unknown>) => void
  journeyId?: string
}) {
  const projectId = (d.clearvoiceProjectId as string) || ""
  const agentId = (d.clearvoiceAgentId as string) || ""
  const project = CLEARVOICE_PROJECTS.find((p) => p.id === projectId)
  const agents = projectId ? CLEARVOICE_AGENTS[projectId] ?? [] : []
  const agent = agents.find((a) => a.id === agentId)

  const [agentQuery, setAgentQuery] = useState("")
  const [projectQuery, setProjectQuery] = useState("")

  // Step 1 — pick a project
  if (!projectId) {
    const filtered = CLEARVOICE_PROJECTS.filter((p) => {
      const q = projectQuery.trim().toLowerCase()
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
    return (
      <div className="space-y-3">
        <div
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          data-focus-field="clearvoiceProjectId"
        >
          Select a ClearVoice Project
        </div>
        <input
          type="text"
          value={projectQuery}
          onChange={(e) => setProjectQuery(e.target.value)}
          placeholder="Search projects by name, id, or tag..."
          className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="space-y-2">
          {filtered.map((proj) => (
            <button
              key={proj.id}
              type="button"
              onClick={() =>
                multiUpdate({
                  clearvoiceProjectId: proj.id,
                  clearvoiceProjectName: proj.name,
                  template: proj.name,
                  // Reset the agent when the project changes.
                  clearvoiceAgentId: "",
                  clearvoiceAgentName: "",
                  // Any staged pool assignment belonged to the previous
                  // project.
                  _stagedPoolAssignment: undefined,
                })
              }
              className="w-full rounded-lg border-2 border-border/50 p-3 text-left transition-all hover:border-border hover:bg-accent/20"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {proj.name}
                  </p>
                  <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">
                    {proj.id}
                  </p>
                </div>
                <span
                  className={cn(
                    "ml-2 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold",
                    proj.status === "live"
                      ? "bg-primary-500/20 text-primary-400"
                      : "bg-neutral-500/20 text-neutral-400",
                  )}
                >
                  {proj.status === "live" ? "Live" : "Draft"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {proj.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-[11px] text-muted-foreground">
              No matching projects.
            </div>
          )}
        </div>
      </div>
    )
  }

  // Step 2 — pick an agent
  if (!agentId) {
    const filtered = agents.filter((a) => {
      const q = agentQuery.trim().toLowerCase()
      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) || a.org.toLowerCase().includes(q)
      )
    })
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() =>
            multiUpdate({
              clearvoiceProjectId: "",
              clearvoiceProjectName: "",
              _stagedPoolAssignment: undefined,
            })
          }
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          <ChevronLeft className="h-3 w-3" />
          Back to projects
        </button>
        <div className="rounded-lg border border-border bg-card/40 p-3">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Project
          </div>
          <div className="mt-1 text-xs font-semibold text-foreground">
            {project?.name}
          </div>
          <div className="mt-0.5 text-[10px] font-mono text-muted-foreground">
            {project?.id}
          </div>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Select an agent
        </div>
        <input
          type="text"
          value={agentQuery}
          onChange={(e) => setAgentQuery(e.target.value)}
          placeholder="Search agents by name or organisation..."
          className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="space-y-2">
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() =>
                multiUpdate({
                  clearvoiceAgentId: a.id,
                  clearvoiceAgentName: a.name,
                })
              }
              className="w-full rounded-lg border-2 border-border/50 p-3 text-left transition-all hover:border-border hover:bg-accent/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground">
                    {a.name}
                  </div>
                  <div className="mt-0.5 text-[10px] font-mono text-muted-foreground">
                    {a.id}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {a.org}
                  </div>
                </div>
                {a.isDefault && (
                  <span className="rounded bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary-400">
                    Default
                  </span>
                )}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-[11px] text-muted-foreground">
              No matching agents on this project.
            </div>
          )}
        </div>
      </div>
    )
  }

  // Step 3 — project + agent picked. Show summary + params + delivery.
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-primary/40 bg-primary/[0.05] p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-primary-400">
              Project · Agent
            </div>
            <div className="mt-1 truncate text-xs font-semibold text-foreground">
              {project?.name} · {agent?.name}
            </div>
            <div className="mt-0.5 truncate text-[10px] font-mono text-muted-foreground">
              {projectId} · {agentId}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() =>
                multiUpdate({
                  clearvoiceAgentId: "",
                  clearvoiceAgentName: "",
                })
              }
              className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted"
            >
              Change agent
            </button>
            <button
              type="button"
              onClick={() =>
                multiUpdate({
                  clearvoiceProjectId: "",
                  clearvoiceProjectName: "",
                  clearvoiceAgentId: "",
                  clearvoiceAgentName: "",
                  _stagedPoolAssignment: undefined,
                })
              }
              className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted"
            >
              Change project
            </button>
          </div>
        </div>
      </div>

      <AICallDialSection
        d={d}
        projectId={projectId}
        projectName={project?.name ?? projectId}
        update={update}
      />

      <AICallCustomParameters d={d} update={update} journeyId={journeyId} />

      <CallbackHandlingSection data={d} update={update} />

      <RedialPolicySection data={d} update={update} journeyId={journeyId} />
    </div>
  )
}

/* ─────────── Send Email · Delivery tab panel ───────────
   Replaces the old "delivery provider is set on Logic tab" blurb with
   the sender profile picker + the Sending domains list. */
function EmailDeliveryPanel({
  d,
  update,
  journeyId: _journeyId,
}: {
  d: Record<string, unknown>
  update: (field: string, value: unknown) => void
  journeyId?: string
}) {
  const senderProfileId = (d.senderProfileId as string | undefined) ?? null
  const profile = senderProfileId ? getSenderProfileById(senderProfileId) ?? null : null
  const profiles = SP_SEED.filter((p) => p.status === "active")
  return (
    <div className="space-y-3">
      <Section title="Sender profile">
        <p className="text-[11px] text-muted-foreground">
          Delivery route and sender identity come from the sender profile below.
        </p>
        <select
          value={senderProfileId ?? ""}
          onChange={(e) => update("senderProfileId", e.target.value || undefined)}
          className="mt-2 h-8 w-full rounded-md border border-input bg-background px-2 text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Pick a sender profile…</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.lenderName} · {p.fromEmail}{" "}
              — {describeProfileRotationHealth(p)}
            </option>
          ))}
        </select>
      </Section>

      {profile && (
        <Section title="Sending domains">
          <SendingDomainsList profileId={profile.id} />
        </Section>
      )}
    </div>
  )
}

/* ─────────── AI Call · Dial section ───────────
   Small journeys often run on a single gateway and don't need a pool.
   This section lets authors pick either path:
     - "Gateway" — pick one gateway directly (aiCallGateway)
     - "Pool"    — route through the project's pool (recommended for
                   anything shared across multiple projects)

   Default: "pool" when no mode has been set and no legacy gateway is
   on the node; "gateway" when a legacy aiCallGateway is present (so an
   existing node keeps its original behaviour).

   Staged pool assignments live on the node as `_stagedPoolAssignment`
   ({ poolId, priority }). The journey save/publish flow applies them via
   assignProjectToPool() in the mock data layer.
   TODO: confirm with backend whether assignment applies on Save or
   Publish. */

interface StagedPoolAssignment {
  poolId: string
  priority: PoolProjectPriority
}

type DialMode = "gateway" | "pool"

function resolveDialMode(d: Record<string, unknown>): DialMode {
  const stored = d.dialMode as DialMode | undefined
  if (stored === "gateway" || stored === "pool") return stored
  // Legacy nodes with an aiCallGateway and no explicit mode default to
  // gateway — don't silently switch their behaviour out from under them.
  if (typeof d.aiCallGateway === "string" && d.aiCallGateway) return "gateway"
  return "pool"
}

function AICallDialSection({
  d,
  projectId,
  projectName,
  update,
}: {
  d: Record<string, unknown>
  projectId: string
  projectName: string
  update: (field: string, value: unknown) => void
}) {
  const mode = resolveDialMode(d)

  return (
    <div className="space-y-3">
      {/* Mode toggle — Gateway or Pool. Both are optional at the node
          level; publish needs ONE of them to point somewhere valid. */}
      <div className="rounded-lg border border-border bg-card/40 p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Dial via
          </div>
          <span className="text-[9.5px] text-muted-foreground">Pool recommended</span>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-md border border-input bg-background p-1">
          <button
            type="button"
            onClick={() => update("dialMode", "gateway")}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-medium",
              mode === "gateway"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Gateway
          </button>
          <button
            type="button"
            onClick={() => update("dialMode", "pool")}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-medium",
              mode === "pool"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Pool
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          {mode === "gateway"
            ? "Single-gateway mode. Skips pool routing — best for small or one-off journeys."
            : "Pool-routed mode. Follows the project's pool so the same project behaves the same across every journey and campaign."}
        </p>
      </div>

      {mode === "gateway" ? (
        <AICallGatewaySection d={d} update={update} />
      ) : (
        <AICallPoolSection
          d={d}
          projectId={projectId}
          projectName={projectName}
          update={update}
        />
      )}
    </div>
  )
}

/* ─────────── AI Call · Gateway section (direct-select) ───────────
   Picks a single gateway from the lender's universe (every pool's
   gateways + standalone ones). Writes `aiCallGateway` on the node. */
function AICallGatewaySection({
  d,
  update,
}: {
  d: Record<string, unknown>
  update: (field: string, value: unknown) => void
}) {
  const [query, setQuery] = useState("")
  const gatewayId = typeof d.aiCallGateway === "string" ? (d.aiCallGateway as string) : ""
  const gateways = listGateways()
  const filtered = gateways.filter((g) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      g.name.toLowerCase().includes(q) ||
      g.id.toLowerCase().includes(q) ||
      (g.poolName ?? "").toLowerCase().includes(q)
    )
  })
  const selected = gateways.find((g) => g.id === gatewayId) ?? null

  return (
    <div
      className="space-y-2 rounded-lg border border-border bg-card/40 p-3"
      data-focus-field="aiCallGateway"
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Gateway
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => update("aiCallGateway", undefined)}
            className="text-[10px] font-medium text-primary hover:underline"
          >
            Change
          </button>
        )}
      </div>

      {selected ? (
        <div className="rounded-md border border-primary/40 bg-primary/[0.05] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold text-foreground">
                {selected.name}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {selected.id}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider",
                selected.pooledAiEnabled
                  ? "bg-primary-500/15 text-primary-300"
                  : "bg-red-500/15 text-red-300",
              )}
            >
              Pooled AI {selected.pooledAiEnabled ? "on" : "off"}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-[10.5px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Concurrency</span>
              <span className="tabular-nums text-foreground">{selected.concurrency}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">In pool</span>
              <span className="truncate text-foreground">
                {selected.poolName ?? "Standalone"}
              </span>
            </div>
          </div>
          {!selected.pooledAiEnabled && (
            <div className="mt-2 flex items-start gap-1.5 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10.5px] text-red-200">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>Pooled AI is off on this gateway. Calls won&apos;t be dialed.</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Pick one gateway to dial through. Best for small journeys that don&apos;t need to
          share capacity with other projects.
        </p>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search gateways…"
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-[11.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="max-h-[260px] space-y-1 overflow-y-auto rounded-md border border-border/40 bg-background/20 p-1.5">
        {filtered.map((g) => {
          const isSelected = g.id === gatewayId
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => update("aiCallGateway", g.id)}
              className={cn(
                "w-full rounded-md border p-2 text-left transition-colors",
                isSelected
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/60 bg-background/40 hover:border-border hover:bg-accent/20",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[11.5px] font-semibold text-foreground">
                    {g.name}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {g.poolName ? `In pool ${g.poolName}` : "Standalone"} ·{" "}
                    {g.concurrency} concurrency
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider",
                    g.pooledAiEnabled
                      ? "bg-primary-500/15 text-primary-300"
                      : "bg-neutral-500/15 text-neutral-300",
                  )}
                >
                  {g.pooledAiEnabled ? "On" : "Off"}
                </span>
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div className="rounded-md border border-dashed border-border/60 p-3 text-center text-[10.5px] text-muted-foreground">
            No gateways match &quot;{query}&quot;.
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────── AI Call · Pool section ───────────
   Pool-routed mode. A pool is picked indirectly: it comes from the
   ClearVoice project the author chose on the Logic tab. This section
   shows the pool read-only in the common case, or an assignment picker
   when the project sits in no pool. */

function AICallPoolSection({
  d,
  projectId,
  projectName,
  update,
}: {
  d: Record<string, unknown>
  projectId: string
  projectName: string
  update: (field: string, value: unknown) => void
}) {
  const livePool = getPoolForProject(projectId)
  const staged = (d._stagedPoolAssignment as StagedPoolAssignment | undefined) ?? null
  const stagedPool = staged ? getPoolById(staged.poolId) : null
  // When a staged assignment is present, render the pool as if it were
  // already live so the author sees the final state they're committing.
  const pool = livePool ?? stagedPool
  const effectivePriority: PoolProjectPriority | null = pool
    ? staged?.priority ?? (livePool ? getProjectPriority(livePool, projectId) : null)
    : null

  if (!projectId) {
    return (
      <div
        className="rounded-lg border border-border bg-card/40 p-3"
        data-focus-field="projectPool"
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pool
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Pick a ClearVoice project on the Logic tab first. The pool comes from the project.
        </p>
      </div>
    )
  }

  if (!pool) {
    return (
      <AICallPoolAssignState
        d={d}
        projectId={projectId}
        projectName={projectName}
        update={update}
        staged={staged}
      />
    )
  }

  return (
    <AICallPoolReadOnly
      pool={pool}
      projectId={projectId}
      projectName={projectName}
      priority={effectivePriority}
      stagedForNewAssignment={Boolean(staged && !livePool)}
    />
  )
}

/** Read-only view for a project already in a pool (the common case).
 *  Also used to preview a staged assignment before save. */
function AICallPoolReadOnly({
  pool,
  projectId,
  projectName,
  priority,
  stagedForNewAssignment,
}: {
  pool: Pool
  projectId: string
  projectName: string
  priority: PoolProjectPriority | null
  stagedForNewAssignment: boolean
}) {
  const today = poolTodayState(pool.id)
  const totalQueued = poolCallsQueued(pool.id)
  const projectCount = pool.projects.length + (stagedForNewAssignment ? 1 : 0)
  const projectQueued = priority
    ? poolProjectQueuedCount(pool.id, projectId, priority)
    : 0
  const pooledConcurrency = poolPooledConcurrency(pool)
  const hasCapacity = poolHasPooledAiCapacity(pool)
  const isPaused = pool.status === "paused"

  return (
    <div
      className="space-y-3 rounded-lg border border-border bg-card/40 p-3"
      data-focus-field="projectPool"
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pool
        </div>
        <Link
          href={poolEditUrl(pool.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10.5px] font-medium text-primary hover:underline"
        >
          Open in Project Pools
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <p className="text-[11px] text-muted-foreground">
        This project is dialed through pool{" "}
        <span className="font-semibold text-foreground">{pool.name}</span>. Pool, priority
        and gateways are managed in Project Pools and apply to every journey and campaign
        that uses this project.
      </p>

      {stagedForNewAssignment && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[10.5px] text-primary-foreground/80">
          Staged assignment — applied when the journey is saved.
        </div>
      )}

      {/* Pool summary card */}
      <div className="rounded-md border border-border bg-background/40 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-foreground">{pool.name}</div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{pool.id}</div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider",
              isPaused
                ? "bg-neutral-500/20 text-neutral-300"
                : "bg-primary-500/20 text-primary-300",
            )}
          >
            {isPaused ? "Paused" : "Active"}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10.5px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Share</span>
            <span className="tabular-nums text-foreground">
              {pool.sharePct}%{" "}
              {pool.effectiveSharePct !== pool.sharePct && (
                <span className="text-muted-foreground">
                  (today {pool.effectiveSharePct}%)
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Today</span>
            <span
              className={cn(
                "tabular-nums",
                today === "capacity_bound"
                  ? "text-warning-300"
                  : today === "draining"
                  ? "text-primary-300"
                  : "text-foreground",
              )}
            >
              {POOL_STATE_LABEL[today]}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Calls queued</span>
            <span className="tabular-nums text-foreground">
              {totalQueued.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Projects</span>
            <span className="tabular-nums text-foreground">{projectCount}</span>
          </div>
        </div>
      </div>

      {/* Edge case: paused pool. */}
      {isPaused && (
        <div className="flex items-start gap-1.5 rounded-md border border-neutral-500/40 bg-neutral-500/10 px-2.5 py-1.5 text-[10.5px] text-neutral-200">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>Pool is paused. Calls stay queued until a pool admin resumes it.</span>
        </div>
      )}

      {/* Edge case: no pooled-AI capacity at all. */}
      {!hasCapacity && (
        <div className="flex items-start gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[10.5px] text-red-200">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            This pool has no pooled-AI capacity. Calls won&apos;t be dialed.
          </span>
        </div>
      )}

      {/* Capacity-bound + Low priority warning. */}
      {today === "capacity_bound" && priority === "low" && hasCapacity && !isPaused && (
        <div className="flex items-start gap-1.5 rounded-md border border-warning-500/40 bg-warning-500/10 px-2.5 py-1.5 text-[10.5px] text-warning-200">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            This pool is capacity-bound today. Normal and Low projects may wait behind High.
          </span>
        </div>
      )}

      {/* This project's row in the pool. */}
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          This project
        </div>
        <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-2.5 py-1.5">
          <div className="min-w-0 truncate text-[11px] text-foreground">{projectName}</div>
          <div className="flex items-center gap-2">
            {priority && (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider",
                  priority === "high"
                    ? "bg-warning-500/20 text-warning-300"
                    : priority === "normal"
                    ? "bg-primary-500/15 text-primary-300"
                    : "bg-neutral-500/15 text-neutral-300",
                )}
              >
                {POOL_PRIORITY_LABEL[priority]}
              </span>
            )}
            <span className="tabular-nums text-[10.5px] text-muted-foreground">
              {projectQueued.toLocaleString()} queued
            </span>
          </div>
        </div>
      </div>

      {/* Gateways table — same columns as the Edit pool page, read-only. */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Gateways
          </div>
          <div className="text-[10px] text-muted-foreground">
            {pool.gateways.length} · {pooledConcurrency} pooled concurrency
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full table-fixed text-[10.5px]">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="w-auto px-2 py-1 text-left font-medium">Gateway</th>
                <th className="w-16 px-2 py-1 text-right font-medium">Concurrency</th>
                <th className="w-20 px-2 py-1 text-right font-medium">Pooled AI</th>
              </tr>
            </thead>
            <tbody>
              {pool.gateways.map((gw) => (
                <tr key={gw.id} className="border-t border-border/60">
                  <td className="truncate px-2 py-1 text-foreground">{gw.name}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-foreground">
                    {gw.concurrency}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider",
                        gw.pooledAiEnabled
                          ? "bg-primary-500/15 text-primary-300"
                          : "bg-neutral-500/15 text-neutral-300",
                      )}
                    >
                      {gw.pooledAiEnabled ? "On" : "Off"}
                    </span>
                  </td>
                </tr>
              ))}
              {pool.gateways.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-2 py-2 text-center text-muted-foreground">
                    No gateways in this pool.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

/** Assign-a-pool state — project sits in no pool. */
function AICallPoolAssignState({
  d: _d,
  projectId,
  projectName,
  update,
  staged,
}: {
  d: Record<string, unknown>
  projectId: string
  projectName: string
  update: (field: string, value: unknown) => void
  staged: StagedPoolAssignment | null
}) {
  const [query, setQuery] = useState("")
  const canManage = canManagePools()
  const pools = listPools()
  const filtered = pools.filter((p) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    )
  })

  const selectedPool = staged ? getPoolById(staged.poolId) : null
  const priority: PoolProjectPriority = staged?.priority ?? "normal"

  return (
    <div
      className="space-y-3 rounded-lg border border-red-500/40 bg-red-500/[0.06] p-3"
      data-focus-field="projectPool"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Pool
      </div>

      <div className="flex items-start gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-200">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          This project isn&apos;t in any pool, so its calls won&apos;t be dialed.
          {canManage ? " Pick a pool to add it." : ""}
        </span>
      </div>

      {!canManage ? (
        <p className="text-[11px] text-muted-foreground">
          Ask a pool admin to add{" "}
          <span className="font-medium text-foreground">{projectName}</span> to a pool.
        </p>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pools…"
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-[11.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="max-h-[260px] space-y-1.5 overflow-y-auto rounded-md border border-border/40 bg-background/20 p-1.5">
            {filtered.map((p) => {
              const selected = selectedPool?.id === p.id
              const today = poolTodayState(p.id)
              const pooledConcurrency = poolPooledConcurrency(p)
              const isPaused = p.status === "paused"
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    update("_stagedPoolAssignment", {
                      poolId: p.id,
                      priority,
                    } satisfies StagedPoolAssignment)
                  }
                  className={cn(
                    "w-full rounded-md border p-2 text-left transition-colors",
                    selected
                      ? "border-primary/60 bg-primary/10"
                      : "border-border/60 bg-background/40 hover:border-border hover:bg-accent/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[11.5px] font-semibold text-foreground">
                        {p.name}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        Share {p.sharePct}% · {POOL_STATE_LABEL[today]}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider",
                        isPaused
                          ? "bg-neutral-500/20 text-neutral-300"
                          : "bg-primary-500/15 text-primary-300",
                      )}
                    >
                      {isPaused ? "Paused" : "Active"}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {p.gateways.length} gateways · {pooledConcurrency} pooled concurrency ·{" "}
                    {p.projects.length} projects
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="rounded-md border border-dashed border-border/60 p-3 text-center text-[10.5px] text-muted-foreground">
                No pools match &quot;{query}&quot;.
              </div>
            )}
          </div>

          {selectedPool && (
            <>
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Priority
                </div>
                <div className="flex gap-1 rounded-md border border-input bg-background p-1">
                  {(["high", "normal", "low"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        update("_stagedPoolAssignment", {
                          poolId: selectedPool.id,
                          priority: p,
                        } satisfies StagedPoolAssignment)
                      }
                      className={cn(
                        "flex-1 rounded px-2 py-1 text-[11px] font-medium capitalize",
                        priority === p
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {POOL_PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10.5px] text-muted-foreground">
                Saving adds{" "}
                <span className="font-medium text-foreground">{projectName}</span> to{" "}
                <span className="font-medium text-foreground">{selectedPool.name}</span> at{" "}
                <span className="font-medium text-foreground">
                  {POOL_PRIORITY_LABEL[priority]}
                </span>
                . It will apply to every journey and campaign that uses this project.
              </p>
              <button
                type="button"
                onClick={() => {
                  // Apply the assignment to the mock data layer and clear
                  // the staged value so the section flips to the
                  // read-only view. TODO: confirm whether this moves to
                  // the journey save/publish pipeline server-side.
                  assignProjectToPool(
                    projectId,
                    selectedPool.id,
                    priority,
                  )
                  update("_stagedPoolAssignment", undefined)
                  toast.success("Pool assigned", {
                    description: `${projectName} → ${selectedPool.name} · ${POOL_PRIORITY_LABEL[priority]}`,
                  })
                }}
                className="w-full rounded-md border border-primary bg-primary/90 px-2 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary"
              >
                Apply assignment
              </button>
            </>
          )}
        </>
      )}

    </div>
  )
}

/* ─────────── AI Call · Custom Parameters ───────────
   Multi-phone selection for the `phone` parameter is added in a later edit
   via the shared <ChannelContactPicker>. */

/** Default parameter list detected from a ClearVoice project's prompts. */
const AI_CALL_DEFAULT_PARAMS: Array<{
  name: string
  hint: string
  suggestedField: string
}> = [
  { name: "phone", hint: "Number(s) to dial", suggestedField: "borrower.phone" },
  { name: "FirstName", hint: "Greeting first name", suggestedField: "borrower.first_name" },
  { name: "LastName", hint: "Surname", suggestedField: "borrower.last_name" },
  { name: "Lender", hint: "Lender name to mention", suggestedField: "deal.lender_name" },
  { name: "amount", hint: "Outstanding balance", suggestedField: "deal.outstanding" },
]

const AI_CALL_MAP_MODES = [
  { id: "borrower_field", label: "Map from field" },
  { id: "static", label: "Static value" },
] as const

/** For the special `phone` parameter we add a third mode on top of the standard two. */
const PHONE_PARAM_MODES = [
  { id: "borrower_field", label: "Map from field" },
  { id: "multi_phone", label: "Multiple numbers" },
  { id: "static", label: "Static value" },
] as const

type ParamMode = "borrower_field" | "static" | "multi_phone"
interface ParamMapping {
  mode: ParamMode
  value: string
  phoneSelection?: PhoneSelection
}

function AICallCustomParameters({
  d,
  update,
}: {
  d: Record<string, unknown>
  update: (field: string, value: unknown) => void
  journeyId?: string
}) {
  const mappings =
    (d.paramMappings as Record<string, ParamMapping>) ?? {}
  const setMapping = (name: string, patch: Partial<ParamMapping>) => {
    const current: ParamMapping = mappings[name] ?? {
      mode: "borrower_field",
      value: "",
    }
    update("paramMappings", { ...mappings, [name]: { ...current, ...patch } })
  }

  return (
    <div
      className="rounded-lg border border-border bg-card/40 p-3"
      data-focus-field="paramMappings"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Custom Parameters
      </div>
      <p className="mt-1 text-[10.5px] text-muted-foreground">
        Detected from the selected agent&apos;s prompts. Resolved per-borrower
        at run-time — map each to a borrower / deal field, or pin a static
        value. For the <span className="text-foreground font-medium">phone</span>{" "}
        parameter you can pick multiple numbers so the agent cascades through
        them on failure.
      </p>
      <div className="mt-3 space-y-3">
        {AI_CALL_DEFAULT_PARAMS.map((p) => {
          const isPhone = p.name === "phone"
          const m: ParamMapping = mappings[p.name] ?? {
            mode: "borrower_field",
            value: p.suggestedField,
          }
          const modes = isPhone ? PHONE_PARAM_MODES : AI_CALL_MAP_MODES
          return (
            <div key={p.name}>
              <div className="flex items-center gap-1.5">
                <span className="text-[11.5px] font-medium text-foreground">
                  {p.name}
                </span>
                <span className="ml-auto text-[9.5px] text-muted-foreground">
                  {p.hint}
                </span>
              </div>
              <div className="mt-1.5 grid gap-1.5 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)]">
                <select
                  value={m.mode}
                  onChange={(e) =>
                    setMapping(p.name, { mode: e.target.value as ParamMode })
                  }
                  className="h-8 rounded-md border border-input bg-background px-2 text-[11.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {modes.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {m.mode === "multi_phone" ? (
                  <div className="rounded-md border border-primary/40 bg-primary/[0.03] px-2.5 py-2">
                    <ChannelContactPicker
                      mode="phone"
                      value={m.phoneSelection ?? DEFAULT_PHONE_SELECTION}
                      onChange={(next) =>
                        setMapping(p.name, { phoneSelection: next })
                      }
                      compact
                    />
                  </div>
                ) : m.mode === "borrower_field" ? (
                  <select
                    value={m.value || p.suggestedField}
                    onChange={(e) =>
                      setMapping(p.name, { value: e.target.value })
                    }
                    className="h-8 rounded-md border border-input bg-background px-2 text-[11.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="borrower.first_name">borrower.first_name</option>
                    <option value="borrower.last_name">borrower.last_name</option>
                    <option value="borrower.name">borrower.name</option>
                    <option value="borrower.phone">borrower.phone</option>
                    <option value="borrower.work_phone">borrower.work_phone</option>
                    <option value="borrower.email">borrower.email</option>
                    <option value="deal.lender_name">deal.lender_name</option>
                    <option value="deal.outstanding">deal.outstanding</option>
                    <option value="deal.due_date">deal.due_date</option>
                    <option value="deal.product">deal.product</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={m.value}
                    onChange={(e) =>
                      setMapping(p.name, { value: e.target.value })
                    }
                    placeholder="e.g. Mashreq"
                    className="h-8 rounded-md border border-input bg-background px-2 text-[11.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────── Recipients control (change 2) ───────────
   Shared helper that lets authors switch between "Command borrower" (the
   current default) and "From uploaded file" (resolves recipients from the
   nearest upstream Excel upload trigger). Rendered inside the SMS, Email,
   AI call and Human campaign node config branches.

   TODO (backend contract): the node data carries `recipientSource` plus
   `recipientPhoneColumn` / `recipientEmailColumn` (column ids); the send
   pipeline is expected to resolve recipients from the uploaded file rows
   when source is "upload". No backend wiring is done in this prototype. */
function RecipientsControl({
  d,
  update,
  nodes,
  edges,
  nodeId,
  channel,
}: {
  d: Record<string, unknown>
  update: (field: string, value: unknown) => void
  nodes: Array<{ id: string; data?: Record<string, unknown> }>
  edges: Array<{ source: string; target: string }>
  nodeId: string
  /** phone  = SMS / AI call / Human call; email = Email. */
  channel: "phone" | "email"
}) {
  const columns = findUpstreamExcelColumns(nodes, edges, nodeId) ?? null
  const canUseUpload = columns !== null && columns.length > 0
  const source = ((d.recipientSource as string) ?? "borrower") as "borrower" | "upload"
  const columnField = channel === "phone" ? "recipientPhoneColumn" : "recipientEmailColumn"
  const columnId = (d[columnField] as string | undefined) ?? ""
  // Narrow column suggestions by kind so phone channels don't surface the
  // email column by default.
  const suggested = columns?.filter((c) =>
    channel === "phone"
      ? c.kind === "phone" || c.kind === "text"
      : c.kind === "email" || c.kind === "text",
  ) ?? []
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Recipients</Label>
      <div className="grid grid-cols-2 gap-1 rounded-md border border-input bg-background p-1">
        <button
          type="button"
          onClick={() => update("recipientSource", "borrower")}
          className={cn(
            "rounded px-2 py-1 text-[11px] font-medium",
            source === "borrower"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          Command borrower
        </button>
        <button
          type="button"
          disabled={!canUseUpload}
          title={
            !canUseUpload
              ? "Add an Excel Upload trigger upstream to enable this option."
              : undefined
          }
          onClick={() => update("recipientSource", "upload")}
          className={cn(
            "rounded px-2 py-1 text-[11px] font-medium",
            source === "upload"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            !canUseUpload && "cursor-not-allowed opacity-40",
          )}
        >
          From uploaded file
        </button>
      </div>
      {source === "upload" && canUseUpload && (
        <div className="rounded-md border border-border bg-background/60 p-2.5 space-y-1.5">
          <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">
            {channel === "phone" ? "Phone column *" : "Email column *"}
          </div>
          <select
            value={columnId}
            onChange={(e) => update(columnField, e.target.value || undefined)}
            className={cn(
              "h-8 w-full rounded border border-input bg-background px-2 text-[12px] outline-none focus-visible:border-ring",
              !columnId && "text-muted-foreground",
            )}
          >
            <option value="">Select a column from the upload</option>
            {suggested.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.kind}
              </option>
            ))}
          </select>
          {!columnId && (
            <div className="text-[10px] text-warning-300">
              Pick a column, or the send pipeline has nothing to resolve.
            </div>
          )}
        </div>
      )}
      {source === "upload" && !canUseUpload && (
        <div className="rounded-md border border-warning-500/40 bg-warning-500/[0.05] px-2.5 py-1.5 text-[10.5px] text-warning-300">
          The upstream Excel Upload trigger was removed. Switch back to Command
          borrower or add an upload trigger upstream.
        </div>
      )}
    </div>
  )
}

/* ─────────── Send Webhook action config ───────────
   Lets authors POST a payload to an external URL when a borrower reaches
   this node. Minimal shape in the prototype — URL, method, headers,
   JSON body, retry policy. Values persist on node.data so the send
   pipeline can read them at execution time.
   TODO (backend contract): webhookMethod + webhookUrl + webhookHeaders +
   webhookBodyJson + webhookRetryOnFailure + webhookRetryMaxAttempts +
   webhookTimeoutSec; execution worker signs the request (HMAC) and
   retries with exponential backoff on 5xx / timeout. */
function WebhookActionConfig({
  d,
  update,
}: {
  d: Record<string, unknown>;
  update: (field: string, value: unknown) => void;
}) {
  const method = ((d.webhookMethod as string) ?? "POST") as "POST" | "PUT" | "PATCH";
  const url = (d.webhookUrl as string) ?? "";
  const headers =
    (d.webhookHeaders as Array<{ key: string; value: string }> | undefined) ?? [];
  const body = (d.webhookBodyJson as string) ?? "";
  const retry = (d.webhookRetryOnFailure as boolean) ?? true;
  const maxAttempts = (d.webhookRetryMaxAttempts as number) ?? 3;
  const timeoutSec = (d.webhookTimeoutSec as number) ?? 10;
  const setHeader = (i: number, patch: Partial<{ key: string; value: string }>) => {
    const next = headers.map((h, idx) => (idx === i ? { ...h, ...patch } : h));
    update("webhookHeaders", next);
  };
  const addHeader = () =>
    update("webhookHeaders", [...headers, { key: "", value: "" }]);
  const removeHeader = (i: number) =>
    update(
      "webhookHeaders",
      headers.filter((_, idx) => idx !== i),
    );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Method
          </Label>
          <select
            value={method}
            onChange={(e) => update("webhookMethod", e.target.value)}
            className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[12px] outline-none focus-visible:border-ring"
          >
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
          </select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            URL *
          </Label>
          <Input
            value={url}
            onChange={(e) => update("webhookUrl", e.target.value)}
            placeholder="https://api.example.com/hooks/journey"
            className="mt-1 h-8 font-mono text-[11.5px]"
          />
        </div>
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Headers
        </Label>
        <div className="mt-1 space-y-1.5">
          {headers.map((h, i) => (
            <div key={i} className="flex gap-1.5">
              <Input
                value={h.key}
                onChange={(e) => setHeader(i, { key: e.target.value })}
                placeholder="Header"
                className="h-7 w-32 font-mono text-[11px]"
              />
              <Input
                value={h.value}
                onChange={(e) => setHeader(i, { value: e.target.value })}
                placeholder="value"
                className="h-7 flex-1 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={() => removeHeader(i)}
                aria-label="Remove header"
                className="rounded border border-border bg-background p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addHeader}
            className="w-full rounded border border-dashed border-border bg-muted/20 px-2 py-1 text-[10.5px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
          >
            + Add header
          </button>
        </div>
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Body (JSON)
        </Label>
        <textarea
          value={body}
          onChange={(e) => update("webhookBodyJson", e.target.value)}
          placeholder='{"borrower_id": "{{borrower.id}}"}'
          className="mt-1 min-h-[160px] w-full rounded-md border border-input bg-background p-2 font-mono text-[11.5px] outline-none focus-visible:border-ring"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Supports{" "}
          <span className="font-mono">{"{{borrower.*}}"}</span> and upload-column
          variables when the audience comes from an uploaded list.
        </p>
      </div>

      <div className="rounded-md border border-border bg-background/60 p-2.5 space-y-2">
        <label className="flex cursor-pointer items-start gap-2 text-[11.5px]">
          <input
            type="checkbox"
            checked={retry}
            onChange={(e) => update("webhookRetryOnFailure", e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 accent-primary"
          />
          <div>
            <div className="font-medium text-foreground">
              Retry on failure / timeout
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Exponential backoff on 5xx responses and network errors.
            </div>
          </div>
        </label>
        {retry && (
          <div className="flex items-center gap-2 text-[11.5px]">
            <span className="text-muted-foreground">Max attempts</span>
            <input
              type="number"
              min={1}
              max={10}
              value={maxAttempts}
              onChange={(e) =>
                update(
                  "webhookRetryMaxAttempts",
                  Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                )
              }
              className="h-7 w-16 rounded border border-input bg-background px-2 text-center tabular-nums outline-none focus-visible:border-ring"
            />
          </div>
        )}
        <div className="flex items-center gap-2 text-[11.5px]">
          <span className="text-muted-foreground">Timeout</span>
          <input
            type="number"
            min={1}
            max={60}
            value={timeoutSec}
            onChange={(e) =>
              update(
                "webhookTimeoutSec",
                Math.max(1, Math.min(60, Number(e.target.value) || 1)),
              )
            }
            className="h-7 w-16 rounded border border-input bg-background px-2 text-center tabular-nums outline-none focus-visible:border-ring"
          />
          <span className="text-muted-foreground">seconds</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Excel Upload trigger config ───────────
   The Excel Upload entry node lets authors drop a contact list onto the
   journey without defining a segment. This panel shows:
     • the currently attached file (name + row count)
     • an "upload / replace" button that in the prototype re-mocks a parse
     • the parsed columns, each with a kind pill and remove button, plus
       inline rename and a lightweight "Add column" fallback.
   The columns persist on node.data.uploadColumns so downstream helpers
   (findUpstreamExcelColumns, RecipientsControl) can list them.
   TODO (backend contract): real file ingest returns {fileName, rowCount,
   columns:[{id,name,kind}]}; replace mockReparse() with the upload. */

const MOCK_FILE_VARIANTS: Array<{
  fileName: string;
  rowCount: number;
  columns: Array<{ id: string; name: string; kind: "text" | "phone" | "email" | "number" | "date" }>;
}> = [
  {
    fileName: "borrowers.xlsx",
    rowCount: 128,
    columns: [
      { id: "col-name", name: "name", kind: "text" },
      { id: "col-phone", name: "phone", kind: "phone" },
      { id: "col-email", name: "email", kind: "email" },
      { id: "col-amount_due", name: "amount_due", kind: "number" },
      { id: "col-due_date", name: "due_date", kind: "date" },
    ],
  },
  {
    fileName: "q4_overdue_batch.csv",
    rowCount: 342,
    columns: [
      { id: "col-first_name", name: "first_name", kind: "text" },
      { id: "col-mobile", name: "mobile", kind: "phone" },
      { id: "col-email_primary", name: "email_primary", kind: "email" },
      { id: "col-dpd", name: "dpd", kind: "number" },
      { id: "col-outstanding", name: "outstanding", kind: "number" },
      { id: "col-last_promise_date", name: "last_promise_date", kind: "date" },
    ],
  },
];

function ExcelUploadConfig({
  d,
  update,
}: {
  d: Record<string, unknown>;
  update: (field: string, value: unknown) => void;
}) {
  const fileName = (d.uploadFileName as string) ?? "";
  const rowCount = (d.uploadRowCount as number) ?? 0;
  const columns =
    (d.uploadColumns as Array<{ id: string; name: string; kind: string }> | undefined) ?? [];
  const hasFile = Boolean(fileName);

  const applyMock = (variantIndex: number) => {
    const v = MOCK_FILE_VARIANTS[variantIndex % MOCK_FILE_VARIANTS.length];
    update("uploadFileName", v.fileName);
    update("uploadRowCount", v.rowCount);
    update("uploadColumns", v.columns);
    toast.success(`Parsed ${v.fileName}`, {
      description: `${v.rowCount.toLocaleString()} rows · ${v.columns.length} columns`,
    });
  };

  const onUploadClick = () => {
    // Prototype: no real file picker — cycle between the mock variants so
    // authors can see what a different-shape upload would look like.
    const nextIndex = hasFile && fileName === MOCK_FILE_VARIANTS[0].fileName ? 1 : 0;
    applyMock(nextIndex);
  };

  const removeFile = () => {
    update("uploadFileName", "");
    update("uploadRowCount", 0);
    update("uploadColumns", []);
  };

  const renameColumn = (id: string, name: string) => {
    update(
      "uploadColumns",
      columns.map((c) => (c.id === id ? { ...c, name } : c)),
    );
  };

  const setColumnKind = (id: string, kind: string) => {
    update(
      "uploadColumns",
      columns.map((c) => (c.id === id ? { ...c, kind } : c)),
    );
  };

  const removeColumn = (id: string) => {
    update(
      "uploadColumns",
      columns.filter((c) => c.id !== id),
    );
  };

  const addColumn = () => {
    const id = `col-${Date.now().toString(36)}`;
    update("uploadColumns", [...columns, { id, name: "new_column", kind: "text" }]);
  };

  return (
    <Section title="Upload">
      <div className="space-y-2">
        {hasFile ? (
          <div className="rounded-md border border-border bg-background/60 p-2.5">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileSpreadsheet className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-foreground">
                  {fileName}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {rowCount.toLocaleString()} rows · {columns.length} columns
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                aria-label="Remove file"
                className="rounded border border-border bg-background p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <button
              type="button"
              onClick={onUploadClick}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-border bg-muted/20 px-2 py-1.5 text-[10.5px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            >
              <UploadIcon className="h-3 w-3" />
              Replace file
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onUploadClick}
            className="flex w-full flex-col items-center gap-1 rounded-md border border-dashed border-border bg-muted/10 px-3 py-5 text-[11px] text-muted-foreground hover:border-primary/60 hover:bg-primary/5 hover:text-foreground"
          >
            <UploadIcon className="h-4 w-4" />
            <span>Click to upload Excel or CSV</span>
            <span className="text-[10px] opacity-70">
              Headers become downstream variables
            </span>
          </button>
        )}
      </div>

      {hasFile && columns.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">
            Parsed columns
          </div>
          {columns.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <Input
                value={c.name}
                onChange={(e) => renameColumn(c.id, e.target.value)}
                className="h-7 flex-1 font-mono text-[11px]"
              />
              <select
                value={c.kind}
                onChange={(e) => setColumnKind(c.id, e.target.value)}
                className="h-7 w-[76px] rounded border border-input bg-background px-1 text-[10.5px] outline-none focus-visible:border-ring"
              >
                <option value="text">text</option>
                <option value="phone">phone</option>
                <option value="email">email</option>
                <option value="number">number</option>
                <option value="date">date</option>
              </select>
              <button
                type="button"
                onClick={() => removeColumn(c.id)}
                aria-label={`Remove ${c.name}`}
                className="rounded border border-border bg-background p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addColumn}
            className="w-full rounded border border-dashed border-border bg-muted/20 px-2 py-1 text-[10.5px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
          >
            + Add column
          </button>
          <p className="text-[10px] text-muted-foreground">
            Downstream Email / SMS / AI call nodes can pick a column as the
            recipient instead of the Command borrower.
          </p>
        </div>
      )}
    </Section>
  );
}
