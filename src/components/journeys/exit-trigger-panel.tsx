"use client";

import * as React from "react";
import { X, Plus, Trash2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  type ExitTrigger,
  type ExitTriggerOutcome,
  type ExitTriggerConditionGroup,
  EXIT_TRIGGER_EVENT_CATALOG,
  EXIT_TRIGGER_ATTRIBUTE_CATALOG,
  EXIT_TRIGGER_OUTCOME_META,
} from "@/data/journeys";
import { segments as availableSegments } from "@/data/segments";

interface Props {
  open: boolean;
  initial: ExitTrigger | null;
  onSave: (trigger: ExitTrigger) => void;
  onCancel: () => void;
}

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  number: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "greater_than", label: "greater than" },
    { value: "less_than", label: "less than" },
    { value: "between", label: "between" },
  ],
  enum: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "is_one_of", label: "is one of" },
  ],
  boolean: [
    { value: "is_true", label: "is true" },
    { value: "is_false", label: "is false" },
  ],
  string: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "contains", label: "contains" },
  ],
};

let _id = 1;
const uid = () => `cond-${Date.now()}-${++_id}`;

export function ExitTriggerPanel({ open, initial, onSave, onCancel }: Props) {
  const [type, setType] = React.useState<ExitTrigger["type"] | "">("");
  const [outcome, setOutcome] = React.useState<ExitTriggerOutcome | "">("");

  // Type-specific state
  const [eventId, setEventId] = React.useState("");
  const [eventFilters, setEventFilters] = React.useState<ExitTriggerConditionGroup>({ joinOperator: "AND", conditions: [] });
  const [borrowerFilters, setBorrowerFilters] = React.useState<ExitTriggerConditionGroup>({ joinOperator: "AND", conditions: [] });

  const [direction, setDirection] = React.useState<"enters" | "exits">("enters");
  const [segmentId, setSegmentId] = React.useState("");

  const [attributeId, setAttributeId] = React.useState("");
  const [attrOperator, setAttrOperator] = React.useState("");
  const [attrValue, setAttrValue] = React.useState("");

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  /* Hydrate from `initial` */
  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    if (initial) {
      setType(initial.type);
      setOutcome(initial.outcome);
      if (initial.type === "event") {
        const c = initial.config as { event_id: string; event_filters?: ExitTriggerConditionGroup; borrower_filters?: ExitTriggerConditionGroup };
        setEventId(c.event_id);
        setEventFilters(c.event_filters || { joinOperator: "AND", conditions: [] });
        setBorrowerFilters(c.borrower_filters || { joinOperator: "AND", conditions: [] });
      } else if (initial.type === "segment") {
        const c = initial.config as { direction: "enters" | "exits"; segment_id: string };
        setDirection(c.direction);
        setSegmentId(c.segment_id);
      } else if (initial.type === "attribute") {
        const c = initial.config as { attribute_id: string; condition?: { operator: string; value: string } };
        setAttributeId(c.attribute_id);
        setAttrOperator(c.condition?.operator || "");
        setAttrValue(c.condition?.value || "");
      }
    } else {
      setType("");
      setOutcome("");
      setEventId("");
      setEventFilters({ joinOperator: "AND", conditions: [] });
      setBorrowerFilters({ joinOperator: "AND", conditions: [] });
      setDirection("enters");
      setSegmentId("");
      setAttributeId("");
      setAttrOperator("");
      setAttrValue("");
    }
  }, [open, initial]);

  const selectedAttribute = EXIT_TRIGGER_ATTRIBUTE_CATALOG.find((a) => a.id === attributeId);
  const attrOperators = selectedAttribute ? OPERATORS_BY_TYPE[selectedAttribute.type] || [] : [];

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!type) e.type = "Select an Exit Trigger type";
    if (!outcome) e.outcome = "Select an outcome";
    if (type === "event" && !eventId) e.eventId = "Select an event";
    if (type === "segment" && !segmentId) e.segmentId = "Select a segment";
    if (type === "attribute" && !attributeId) e.attributeId = "Select an attribute";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const id = initial?.id || `et-${Date.now()}`;
    let trigger: ExitTrigger;
    if (type === "event") {
      trigger = {
        id, type: "event", outcome: outcome as ExitTriggerOutcome,
        config: {
          event_id: eventId,
          ...(eventFilters.conditions.length > 0 ? { event_filters: eventFilters } : {}),
          ...(borrowerFilters.conditions.length > 0 ? { borrower_filters: borrowerFilters } : {}),
        },
      };
    } else if (type === "segment") {
      trigger = { id, type: "segment", outcome: outcome as ExitTriggerOutcome, config: { direction, segment_id: segmentId } };
    } else {
      trigger = {
        id, type: "attribute", outcome: outcome as ExitTriggerOutcome,
        config: {
          attribute_id: attributeId,
          ...(attrOperator ? { condition: { operator: attrOperator, value: attrValue } } : {}),
        },
      };
    }
    onSave(trigger);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <SheetContent side="right" className="flex w-[480px] flex-col p-0 sm:max-w-[480px]">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>{initial ? "Edit Exit Trigger" : "Add Exit Trigger"}</SheetTitle>
          <SheetDescription>
            Borrowers will exit the journey the moment this condition becomes true.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Exit Trigger Type
            </Label>
            <select
              value={type || ""}
              onChange={(e) => { setType(e.target.value as ExitTrigger["type"] | ""); setErrors({ ...errors, type: "" }); }}
              className={cn(
                "h-9 w-full rounded-lg border bg-transparent px-2.5 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                errors.type ? "border-destructive" : "border-input focus-visible:border-ring"
              )}
            >
              <option value="">Select an Exit Trigger type</option>
              <option value="event">When user does an event</option>
              <option value="segment">When user enters or exits a segment</option>
              <option value="attribute">When user&apos;s profile attribute changes</option>
            </select>
            {errors.type && <p className="text-[10px] text-destructive">{errors.type}</p>}
          </div>

          {/* Type-specific config */}
          {type === "attribute" && (
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Attribute Change</h4>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-foreground">Attribute</Label>
                <select
                  value={attributeId || ""}
                  onChange={(e) => { setAttributeId(e.target.value); setAttrOperator(""); setAttrValue(""); setErrors({ ...errors, attributeId: "" }); }}
                  className={cn(
                    "h-8 w-full rounded-lg border bg-transparent px-2 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                    errors.attributeId ? "border-destructive" : "border-input focus-visible:border-ring"
                  )}
                >
                  <option value="">Select attribute...</option>
                  {["Borrower", "Financial", "Reachability", "Communications"].map((group) => {
                    const items = EXIT_TRIGGER_ATTRIBUTE_CATALOG.filter((a) => a.group === group);
                    if (!items.length) return null;
                    return (
                      <optgroup key={group} label={group}>
                        {items.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
                {errors.attributeId && <p className="text-[10px] text-destructive">{errors.attributeId}</p>}
              </div>

              {selectedAttribute && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-foreground">
                    Condition <span className="text-muted-foreground/60">(optional)</span>
                  </Label>
                  <p className="text-[10px] text-muted-foreground/80">
                    Leave empty to fire on any change. Or fire only when the attribute changes <em>to</em> a matching value.
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={attrOperator || ""}
                      onChange={(e) => setAttrOperator(e.target.value)}
                      className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    >
                      <option value="">No condition (any change)</option>
                      {attrOperators.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </select>
                    {attrOperator && attrOperator !== "is_true" && attrOperator !== "is_false" && (
                      <AttributeValueInput
                        attribute={selectedAttribute}
                        value={attrValue}
                        onChange={setAttrValue}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {type === "segment" && (
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Segment Membership</h4>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-foreground">Direction</Label>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-input bg-muted/20 p-0.5">
                  {(["enters", "exits"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDirection(d)}
                      className={cn(
                        "h-7 rounded-md text-xs font-medium capitalize transition-colors",
                        direction === d
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {d} segment
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-foreground">Segment</Label>
                <select
                  value={segmentId || ""}
                  onChange={(e) => { setSegmentId(e.target.value); setErrors({ ...errors, segmentId: "" }); }}
                  className={cn(
                    "h-8 w-full rounded-lg border bg-transparent px-2 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                    errors.segmentId ? "border-destructive" : "border-input focus-visible:border-ring"
                  )}
                >
                  <option value="">Select segment...</option>
                  {availableSegments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {errors.segmentId && <p className="text-[10px] text-destructive">{errors.segmentId}</p>}
              </div>
            </div>
          )}

          {type === "event" && (
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Event</h4>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-foreground">Event</Label>
                <select
                  value={eventId || ""}
                  onChange={(e) => { setEventId(e.target.value); setErrors({ ...errors, eventId: "" }); }}
                  className={cn(
                    "h-8 w-full rounded-lg border bg-transparent px-2 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                    errors.eventId ? "border-destructive" : "border-input focus-visible:border-ring"
                  )}
                >
                  <option value="">Select event...</option>
                  {EXIT_TRIGGER_EVENT_CATALOG.map((ev) => <option key={ev.id} value={ev.id}>{ev.label}</option>)}
                </select>
                {errors.eventId && <p className="text-[10px] text-destructive">{errors.eventId}</p>}
              </div>

              <ConditionGroupEditor
                label="Event Filters"
                helper="Evaluated against the event's payload. Optional."
                group={eventFilters}
                onChange={setEventFilters}
                kind="event"
              />

              <ConditionGroupEditor
                label="Borrower Filters"
                helper="Evaluated against borrower attributes when the event fires. Optional."
                group={borrowerFilters}
                onChange={setBorrowerFilters}
                kind="borrower"
              />
            </div>
          )}

          {/* Outcome — always at the bottom */}
          {type && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Outcome on Exit
              </Label>
              <select
                value={outcome || ""}
                onChange={(e) => { setOutcome(e.target.value as ExitTriggerOutcome | ""); setErrors({ ...errors, outcome: "" }); }}
                className={cn(
                  "h-9 w-full rounded-lg border bg-transparent px-2.5 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                  errors.outcome ? "border-destructive" : "border-input focus-visible:border-ring"
                )}
              >
                <option value="">Select outcome...</option>
                {(Object.keys(EXIT_TRIGGER_OUTCOME_META) as ExitTriggerOutcome[]).map((o) => (
                  <option key={o} value={o}>{EXIT_TRIGGER_OUTCOME_META[o].label}</option>
                ))}
              </select>
              {errors.outcome && <p className="text-[10px] text-destructive">{errors.outcome}</p>}
              <p className="text-[10px] text-muted-foreground/80">
                This outcome will be written to <code className="rounded bg-muted/40 px-1 text-[10px]">last_journey_outcome</code> for borrowers who exit via this trigger.
              </p>
            </div>
          )}
        </div>

        <SheetFooter className="flex flex-row justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Exit Trigger
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ----------- Attribute value input (type-aware) ----------- */
function AttributeValueInput({
  attribute,
  value,
  onChange,
}: {
  attribute: typeof EXIT_TRIGGER_ATTRIBUTE_CATALOG[number];
  value: string;
  onChange: (v: string) => void;
}) {
  if (attribute.type === "enum" && attribute.options) {
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        <option value="">Select value...</option>
        {attribute.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (attribute.type === "number") {
    return <Input type="number" className="h-8 flex-1 text-xs" placeholder="Value" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  return <Input className="h-8 flex-1 text-xs" placeholder="Value" value={value} onChange={(e) => onChange(e.target.value)} />;
}

/* ----------- Condition group editor ----------- */
function ConditionGroupEditor({
  label,
  helper,
  group,
  onChange,
  kind,
}: {
  label: string;
  helper?: string;
  group: ExitTriggerConditionGroup;
  onChange: (g: ExitTriggerConditionGroup) => void;
  kind: "event" | "borrower";
}) {
  const fieldChoices = kind === "borrower"
    ? EXIT_TRIGGER_ATTRIBUTE_CATALOG.map((a) => ({ id: a.id, label: a.label }))
    : [
        { id: "channel", label: "channel" },
        { id: "amount", label: "amount" },
        { id: "currency", label: "currency" },
        { id: "source", label: "source" },
        { id: "agent_id", label: "agent_id" },
      ];

  function addCondition() {
    onChange({
      ...group,
      conditions: [...group.conditions, { id: uid(), fieldId: "", operator: "equals", value: "" }],
    });
  }
  function removeCondition(id: string) {
    onChange({ ...group, conditions: group.conditions.filter((c) => c.id !== id) });
  }
  function updateCondition(id: string, patch: Partial<ExitTriggerConditionGroup["conditions"][number]>) {
    onChange({ ...group, conditions: group.conditions.map((c) => c.id === id ? { ...c, ...patch } : c) });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[11px] text-foreground">{label}</Label>
          {helper && <p className="text-[10px] leading-snug text-muted-foreground/80">{helper}</p>}
        </div>
        <button
          type="button"
          onClick={addCondition}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {group.conditions.length > 0 && (
        <>
          {group.conditions.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Join with</span>
              <div className="grid grid-cols-2 gap-0.5 rounded-md border border-input bg-muted/20 p-0.5">
                {(["AND", "OR"] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => onChange({ ...group, joinOperator: op })}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors",
                      group.joinOperator === op
                        ? "bg-background text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {group.conditions.map((cond, i) => (
              <React.Fragment key={cond.id}>
                {i > 0 && (
                  <div className="text-center text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {group.joinOperator}
                  </div>
                )}
                <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-background/40 p-1.5">
                  <select
                    value={cond.fieldId || ""}
                    onChange={(e) => updateCondition(cond.id, { fieldId: e.target.value })}
                    className="h-7 flex-1 rounded border border-input bg-transparent px-1.5 text-[11px] outline-none focus-visible:border-ring dark:bg-input/30"
                  >
                    <option value="">Field...</option>
                    {fieldChoices.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(cond.id, { operator: e.target.value })}
                    className="h-7 rounded border border-input bg-transparent px-1.5 text-[11px] outline-none focus-visible:border-ring dark:bg-input/30"
                  >
                    <option value="equals">equals</option>
                    <option value="not_equals">not equals</option>
                    <option value="greater_than">greater than</option>
                    <option value="less_than">less than</option>
                    <option value="contains">contains</option>
                  </select>
                  <Input
                    className="h-7 flex-1 text-[11px]"
                    placeholder="Value"
                    value={cond.value}
                    onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeCondition(cond.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ----------- List row (used by Journey Settings) ----------- */
export function ExitTriggerRow({
  trigger,
  onEdit,
  onRemove,
}: {
  trigger: ExitTrigger;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const summary = summarize(trigger);
  const outcomeMeta = EXIT_TRIGGER_OUTCOME_META[trigger.outcome];

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 transition-colors hover:border-border">
      <Badge variant="outline" className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {trigger.type}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] text-foreground leading-snug">{summary}</p>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide"
        style={{ backgroundColor: `color-mix(in oklch, ${outcomeMeta.color}, transparent 80%)`, color: outcomeMeta.color }}
      >
        {outcomeMeta.label}
      </span>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <span className="text-base leading-none">⋯</span>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 w-28 rounded-lg border border-border bg-popover py-1 shadow-lg">
              <button onClick={() => { setMenuOpen(false); onEdit(); }} className="block w-full px-3 py-1 text-left text-[11px] text-foreground hover:bg-muted">Edit</button>
              <button onClick={() => { setMenuOpen(false); onRemove(); }} className="block w-full px-3 py-1 text-left text-[11px] text-destructive hover:bg-destructive/10">Remove</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function summarize(t: ExitTrigger): string {
  if (t.type === "event") {
    const c = t.config as { event_id: string; event_filters?: ExitTriggerConditionGroup; borrower_filters?: ExitTriggerConditionGroup };
    const fc = (c.event_filters?.conditions.length || 0) + (c.borrower_filters?.conditions.length || 0);
    return `When user does event \`${c.event_id || "—"}\`${fc > 0 ? ` (${fc} filter${fc > 1 ? "s" : ""})` : ""}`;
  }
  if (t.type === "segment") {
    const c = t.config as { direction: "enters" | "exits"; segment_id: string };
    const seg = availableSegments.find((s) => s.id === c.segment_id);
    return `When user ${c.direction} segment \`${seg?.name || c.segment_id || "—"}\``;
  }
  const c = t.config as { attribute_id: string; condition?: { operator: string; value: string } };
  if (c.condition) return `When \`${c.attribute_id}\` changes to \`${c.condition.value || ""}\``;
  return `When \`${c.attribute_id}\` changes`;
}

/* Compare two triggers for duplicate detection (ignoring id) */
export function exitTriggersEqual(a: ExitTrigger, b: ExitTrigger): boolean {
  if (a.type !== b.type) return false;
  if (a.outcome !== b.outcome) return false;
  return JSON.stringify(a.config) === JSON.stringify(b.config);
}
