"use client";

import { useCallback, useState } from "react";
import type { Node } from "@xyflow/react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { getBlockType, getBlockCategory } from "@/data/journeys";
import { cn } from "@/lib/utils";
import { getBlockConfigForm } from "@/components/journeys/block-configs";

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

const CALL_SCRIPTS = [
  "Standard Collection",
  "PTP Follow-up",
  "Settlement Negotiation",
  "Payment Confirmation",
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
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function NodeConfigPanel({ node, onClose, onUpdate }: NodeConfigPanelProps) {
  const d = (node?.data ?? {}) as Record<string, unknown>;

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

  // Active tab in the right config panel (6 tabs)
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

  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col border-l border-border bg-card/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{headerLabel}</h3>
          {blockCategory && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-medium",
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
            <TabsTrigger value="variables" className="flex-none px-2 text-[10px]">
              <VariableIcon className="h-3 w-3" />
              Vars
            </TabsTrigger>
            <TabsTrigger value="branches" className="flex-none px-2 text-[10px]">
              <GitBranch className="h-3 w-3" />
              Branches
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex-none px-2 text-[10px]">
              <SendIcon className="h-3 w-3" />
              Delivery
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex-none px-2 text-[10px]">
              <SlidersHorizontal className="h-3 w-3" />
              Advanced
            </TabsTrigger>
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

        {/* Variables tab — placeholder per-journey vars */}
        <TabsContent value="variables" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <p className="text-[11px] text-muted-foreground">
            Journey-scoped variables available to this node.
          </p>
          <div className="space-y-1.5">
            {[
              { name: "borrower.name", type: "string" },
              { name: "borrower.total_overdue", type: "number" },
              { name: "account.dpd", type: "number" },
            ].map((v) => (
              <div
                key={v.name}
                className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-2 py-1.5"
              >
                <span className="font-mono text-[10px] text-foreground">{`{${v.name}}`}</span>
                <span className="text-[9px] text-muted-foreground">{v.type}</span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-3 w-3" />
            Add variable
          </Button>
        </TabsContent>

        {/* Branches tab */}
        <TabsContent value="branches" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {isBranchNode ? (
            <>
              <p className="text-[11px] text-muted-foreground">
                Configure each output port for this branching block.
              </p>
              {((d.ports as string[]) ?? defaultBranches(node, block)).map((label, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-2 py-1.5"
                >
                  <span className="text-xs text-foreground">{label}</span>
                  <button className="text-muted-foreground hover:text-red-400">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="h-3 w-3" />
                Add branch
              </Button>
            </>
          ) : (
            <EmptyTabState
              icon={<GitBranch className="h-5 w-5" />}
              title="No branches"
              message="This block has a single output. Use a Decision Split or Audience Split to add branches."
            />
          )}
        </TabsContent>

        {/* Delivery tab */}
        <TabsContent value="delivery" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {isActionNode ? (
            <>
              <Section title="Frequency cap">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={(d.freqCount as number) ?? 3}
                    onChange={(e) => update("freqCount", Number(e.target.value))}
                    className="h-7 text-xs"
                    min={0}
                  />
                  <NativeSelect
                    value={(d.freqWindow as string) ?? "week"}
                    onChange={(v) => update("freqWindow", v)}
                  >
                    <option value="day">per day</option>
                    <option value="week">per week</option>
                    <option value="month">per month</option>
                  </NativeSelect>
                </div>
              </Section>
              <Section title="Quiet hours / DND">
                <label className="flex items-center justify-between">
                  <span className="text-xs text-foreground">Respect DND window</span>
                  <Switch
                    checked={(d.respectDnd as boolean) ?? true}
                    onCheckedChange={(val) => update("respectDnd", val)}
                    size="sm"
                  />
                </label>
              </Section>
              <Section title="Queueing">
                <NativeSelect
                  value={(d.queueing as string) ?? "immediate"}
                  onChange={(v) => update("queueing", v)}
                >
                  <option value="immediate">Send immediately</option>
                  <option value="batch">Batch in queue</option>
                </NativeSelect>
              </Section>
            </>
          ) : (
            <EmptyTabState
              icon={<SendIcon className="h-5 w-5" />}
              title="Not a delivery step"
              message="Delivery settings only apply to channel/action blocks like Send Email, Send SMS or AI Call."
            />
          )}
        </TabsContent>

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
          <BlockConfigComponent data={d} update={update} />
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
                <NativeSelect
                  value={(d.event as string) ?? ""}
                  onChange={(v) => update("event", v)}
                >
                  <option value="">Select event...</option>
                  {EVENTS.map((ev) => (
                    <option key={ev} value={ev}>{ev}</option>
                  ))}
                </NativeSelect>
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
                  <NativeSelect
                    value={(d.field as string) ?? ""}
                    onChange={(v) => update("field", v)}
                  >
                    <option value="">Select field...</option>
                    <option value="dpd">Days Past Due (DPD)</option>
                    <option value="outstanding_amount">Outstanding Amount</option>
                    <option value="payment_status">Payment Status</option>
                    <option value="risk_segment">Risk Segment</option>
                  </NativeSelect>
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
                  <NativeSelect
                    value={(d.event as string) ?? ""}
                    onChange={(v) => update("event", v)}
                  >
                    <option value="">Select event...</option>
                    {EVENTS.map((ev) => (
                      <option key={ev} value={ev}>{ev}</option>
                    ))}
                  </NativeSelect>
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
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-400">Yes path</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="text-xs text-red-400">No path</span>
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
                <Section title="Email Template">
                  <NativeSelect
                    value={(d.template as string) ?? ""}
                    onChange={(v) => update("template", v)}
                  >
                    <option value="">Select template...</option>
                    {EMAIL_TEMPLATES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </NativeSelect>
                </Section>
                {(d.template as string) && EMAIL_PREVIEWS[d.template as string] && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Preview</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
                      {EMAIL_PREVIEWS[d.template as string]}
                    </p>
                  </div>
                )}
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

            {/* ---- Send SMS ---- */}
            {(d.actionType as string) === "sms" && (
              <>
                <Section title="SMS Template">
                  <NativeSelect
                    value={(d.template as string) ?? ""}
                    onChange={(v) => update("template", v)}
                  >
                    <option value="">Select template...</option>
                    {SMS_TEMPLATES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </NativeSelect>
                </Section>
                {(d.template as string) && SMS_CHAR_COUNTS[d.template as string] && (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Character count</span>
                    <span className={`text-xs font-medium ${
                      SMS_CHAR_COUNTS[d.template as string] > 160 ? "text-amber-400" : "text-emerald-400"
                    }`}>
                      {SMS_CHAR_COUNTS[d.template as string]}/160
                    </span>
                  </div>
                )}
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

            {/* ---- Start AI Call ---- */}
            {(d.actionType as string) === "call" && (
              <>
                <Section title="Call Script">
                  <NativeSelect
                    value={(d.template as string) ?? ""}
                    onChange={(v) => update("template", v)}
                  >
                    <option value="">Select script...</option>
                    {CALL_SCRIPTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </NativeSelect>
                </Section>
                <Section title="Voice">
                  <NativeSelect
                    value={(d.voice as string) ?? "Male"}
                    onChange={(v) => update("voice", v)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </NativeSelect>
                </Section>
                <Section title="Language">
                  <NativeSelect
                    value={(d.language as string) ?? "English"}
                    onChange={(v) => update("language", v)}
                  >
                    <option value="English">English</option>
                    <option value="Arabic">Arabic</option>
                  </NativeSelect>
                </Section>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Max Attempts</Label>
                  <Input
                    type="number"
                    value={(d.maxAttempts as number) ?? 3}
                    onChange={(e) => update("maxAttempts", Number(e.target.value))}
                    className="h-7 text-xs"
                    min={1}
                    max={10}
                  />
                </div>
              </>
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
                <div className="space-y-1.5">
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
                      <Label className="text-xs text-amber-400">Variant C (%)</Label>
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
                      sum === 100 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
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
      </Tabs>
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
