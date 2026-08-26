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
  ExternalLink,
  RefreshCcw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Lock,
  Blocks,
} from "lucide-react";
import { getBlockType, getBlockCategory } from "@/data/journeys";
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
import { borrowers } from "@/data/borrowers";
import { getRichTemplate } from "@/data/rich-email-templates";
import { NodeAnalyticsTab } from "@/components/journeys/node-analytics-tab";
import { BarChart3 } from "lucide-react";

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
];

const AGENT_TEAMS = [
  "General Collections",
  "High Value",
  "Arabic Speaking",
  "Legal",
];

const OUTCOME_TAGS = ["Completed", "Converted", "Exhausted", "Unresponsive"];

const WINNER_CRITERIA = ["Conversion Rate", "Open Rate", "Reply Rate"];

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
          <Section title="Name">
            <Input
              value={(d.label as string) ?? ""}
              onChange={(e) => update("label", e.target.value)}
              className="h-7 text-xs"
              placeholder="Node name..."
            />
          </Section>
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
            <Section title="Provider / sender">
              <p className="text-[11px] text-muted-foreground">
                Delivery provider and sender ID are set inside the Logic tab for this action.
                See <span className="font-medium text-foreground">From</span> /{" "}
                <span className="font-medium text-foreground">Sender ID</span> /{" "}
                <span className="font-medium text-foreground">Provider</span>.
              </p>
            </Section>
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
                        value={(d.manualSubject as string) ?? ""}
                        onChange={(e) => update("manualSubject", e.target.value)}
                        placeholder="Use {{borrower.first_name}} for personalization"
                        className="h-8 text-xs"
                      />
                    </Section>
                    <Section title="HTML body">
                      <textarea
                        value={(d.manualBodyHtml as string) ?? ""}
                        onChange={(e) => update("manualBodyHtml", e.target.value)}
                        placeholder="<p>Hi {{borrower.first_name}},</p>"
                        className="min-h-[80px] w-full rounded-md border border-input bg-transparent p-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                      />
                    </Section>
                    <Section title="Plain-text fallback">
                      <textarea
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
            ) && <NodeMessagePreview data={d} />}

            {/* ---- Start AI Call — ClearVoice project picker ---- */}
            {(d.actionType as string) === "call" && (
              <div className="space-y-3">
                <Section title="Select a ClearVoice Project">
                  <div className="space-y-2" data-focus-field="clearvoiceProjectId">
                    {CLEARVOICE_PROJECTS.map((proj) => {
                      const selected = (d.clearvoiceProjectId as string) === proj.id;
                      return (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            update("clearvoiceProjectId", proj.id);
                            update("clearvoiceProjectName", proj.name);
                            update("template", proj.name);
                          }}
                          className={cn(
                            "w-full rounded-lg border-2 p-3 text-left transition-all",
                            selected
                              ? "border-primary bg-primary/10"
                              : "border-border/50 hover:border-border hover:bg-accent/20"
                          )}
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
                                  : "bg-neutral-500/20 text-neutral-400"
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
                      );
                    })}
                  </div>
                </Section>

                {/* Callback Handling (collapsible) */}
                <CallbackHandlingSection
                  data={d}
                  update={update}
                />

                {/* Part 2 — Redial policy (collapsible) */}
                <RedialPolicySection data={d} update={update} />
              </div>
            )}

            {/* ---- Part 5: Trigger Human Campaign ---- */}
            {(d.actionType as string) === "human_campaign" && (
              <HumanCampaignConfig d={d} update={update} />
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
        {/*  SPLIT A/B CONFIG                                            */}
        {/* ============================================================ */}
        {hasLegacyRichConfig && node.type === "split" && (
          <>
            <Section title="Variant Split">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Number of variants</Label>
                  <NativeSelect
                    value={String((d.variantCount as number) ?? 2)}
                    onChange={(v) => {
                      const count = Number(v);
                      const updates: Record<string, unknown> = { variantCount: count };
                      if (count === 2) {
                        updates.splitA = 50;
                        updates.splitB = 50;
                      } else if (count === 3) {
                        updates.splitA = 34;
                        updates.splitB = 33;
                        updates.splitC = 33;
                      } else if (count === 4) {
                        updates.splitA = 25;
                        updates.splitB = 25;
                        updates.splitC = 25;
                        updates.splitD = 25;
                      }
                      multiUpdate(updates);
                    }}
                  >
                    <option value="2">2 variants</option>
                    <option value="3">3 variants</option>
                    <option value="4">4 variants</option>
                  </NativeSelect>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-blue-400">Variant A (%)</Label>
                    <Input
                      type="number"
                      value={(d.splitA as number) ?? 50}
                      onChange={(e) => {
                        const a = Math.max(0, Math.min(100, Number(e.target.value)));
                        update("splitA", a);
                      }}
                      className="h-7 text-xs"
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-purple-400">Variant B (%)</Label>
                    <Input
                      type="number"
                      value={(d.splitB as number) ?? 50}
                      onChange={(e) => {
                        const b = Math.max(0, Math.min(100, Number(e.target.value)));
                        update("splitB", b);
                      }}
                      className="h-7 text-xs"
                      min={0}
                      max={100}
                    />
                  </div>
                </div>

                {((d.variantCount as number) ?? 2) >= 3 && (
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs text-warning-400">Variant C (%)</Label>
                      <Input
                        type="number"
                        value={(d.splitC as number) ?? 0}
                        onChange={(e) => update("splitC", Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="h-7 text-xs"
                        min={0}
                        max={100}
                      />
                    </div>
                    {((d.variantCount as number) ?? 2) >= 4 && (
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs text-rose-400">Variant D (%)</Label>
                        <Input
                          type="number"
                          value={(d.splitD as number) ?? 0}
                          onChange={(e) => update("splitD", Math.max(0, Math.min(100, Number(e.target.value))))}
                          className="h-7 text-xs"
                          min={0}
                          max={100}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Sum indicator */}
                {(() => {
                  const vc = (d.variantCount as number) ?? 2;
                  const sum = ((d.splitA as number) ?? 0) + ((d.splitB as number) ?? 0)
                    + (vc >= 3 ? ((d.splitC as number) ?? 0) : 0)
                    + (vc >= 4 ? ((d.splitD as number) ?? 0) : 0);
                  return (
                    <div className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      sum === 100 ? "bg-primary-500/10 text-primary-400" : "bg-error-500/10 text-error-400"
                    }`}>
                      Total: {sum}%{sum !== 100 && " (must equal 100%)"}
                    </div>
                  );
                })()}
              </div>
            </Section>

            <Section title="Auto-Optimization">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={(d.optimizeAfter as number) ?? 100}
                    onChange={(e) => update("optimizeAfter", Number(e.target.value))}
                    className="h-7 w-20 text-xs"
                    min={10}
                  />
                  <span className="text-xs text-muted-foreground">conversions</span>
                </div>
                <NativeSelect
                  value={(d.winnerCriteria as string) ?? "Conversion Rate"}
                  onChange={(v) => update("winnerCriteria", v)}
                >
                  {WINNER_CRITERIA.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </NativeSelect>
              </div>
            </Section>
          </>
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
            <NodeAnalyticsTab
              journeyId={journeyId}
              runId={selectedRunId ?? null}
              nodeId={node.id}
              nodeLabel={(d.label as string) ?? node.id}
              nodeType={node.type ?? "action"}
              blockType={d.blockType as string | undefined}
            />
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
                    {c.name} · {SKILL_GROUP_LABEL[c.skillGroup]} · queue {c.queueDepth}
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
                  {activeCampaign.queueDepth.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                    activeCampaign.status === "active"
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

function NodeMessagePreview({ data }: { data: Record<string, unknown> }) {
  const [device, setDevice] = React.useState<"ios" | "android">("ios")
  const [borrowerId, setBorrowerId] = React.useState<string>(borrowers[0].id)
  const borrower = borrowers.find((b) => b.id === borrowerId) ?? borrowers[0]

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

  const rendered = renderVars(bodySource, borrower)
  const subject = renderVars(subjectSource, borrower)

  return (
    <div className="mt-3 space-y-2 rounded-md border border-border/60 bg-muted/[0.04] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          As the borrower received it
        </div>
        <BorrowerSearchPicker value={borrowerId} onChange={setBorrowerId} />
      </div>

      <MessagePreview
        channel={channel}
        subject={subject}
        body={rendered}
        recipientPhone={borrower.phone}
        recipientName={borrower.name}
        senderId={(data.smsSenderId as string) || "ClearGrid"}
        fromName={(data.fromName as string) || "ClearGrid Collections"}
        fromAddress={(data.fromAddress as string) || "collections@cleargrid.ae"}
        clickTracking={data.smsClickTracking !== false}
        device={device}
        onDeviceChange={setDevice}
      />
    </div>
  )
}

/**
 * BorrowerSearchPicker — small popover with a searchable input that scans
 * every seeded borrower (name / id / phone / product). Used in the Send-node
 * preview so authors can preview against ANY audience borrower, not just
 * the first six.
 */
function BorrowerSearchPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const active = borrowers.find((b) => b.id === value) ?? borrowers[0]
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return borrowers.slice(0, 30)
    return borrowers.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.phone.includes(q) ||
        b.emiratesId.includes(q) ||
        b.product.toLowerCase().includes(q),
    ).slice(0, 30)
  }, [query])
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 items-center gap-1 rounded border border-input bg-transparent px-1.5 text-[10px] text-foreground outline-none hover:border-ring focus-visible:border-ring dark:bg-input/30"
      >
        <span className="max-w-[9rem] truncate">{active.name}</span>
        <ChevronDown className="h-2.5 w-2.5 opacity-70" />
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-[240px] rounded-md border border-border bg-popover shadow-md">
            <div className="border-b border-border p-1.5">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, phone, product…"
                className="h-7 w-full rounded border border-input bg-transparent px-2 text-[11px] outline-none focus-visible:border-ring dark:bg-input/30"
              />
            </div>
            <ul className="max-h-64 overflow-y-auto py-1">
              {filtered.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(b.id)
                      setOpen(false)
                      setQuery("")
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-2 py-1 text-left text-[11px] hover:bg-muted/60",
                      b.id === value && "bg-primary/10",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-foreground">{b.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {b.dpdBucket} DPD · {b.product}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-2 py-2 text-center text-[11px] text-muted-foreground">
                  No matches
                </li>
              )}
            </ul>
            <p className="border-t border-border px-2 py-1 text-[9px] text-muted-foreground">
              Journey audience preview · pick any borrower to render
            </p>
          </div>
        </>
      )}
    </div>
  )
}

/** Minimal mustache-style variable renderer, used only for the preview. */
function renderVars(text: string, b: { name: string; phone: string; outstanding: number; product: string }): string {
  if (!text) return ""
  const first = b.name.split(" ")[0] ?? b.name
  return text
    .replace(/\{\{\s*borrower\.first_name\s*\}\}/g, first)
    .replace(/\{\{\s*borrower\.name\s*\}\}/g, b.name)
    .replace(/\{\{\s*borrower\.phone\s*\}\}/g, b.phone)
    .replace(/\{\{\s*borrower\.outstanding\s*\}\}/g, `AED ${b.outstanding.toLocaleString()}`)
    .replace(/\{\{\s*borrower\.product\s*\}\}/g, b.product)
    .replace(/\{\{\s*first_name\s*\}\}/g, first)
    .replace(/\{\{\s*amount\s*\}\}/g, `AED ${b.outstanding.toLocaleString()}`)
}

