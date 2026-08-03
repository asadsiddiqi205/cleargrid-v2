"use client";

/**
 * Block-specific configuration forms for the Journey Builder.
 *
 * Rather than duplicating huge tree of JSX in the right-panel, we render a
 * per-block-type mini form here. Every form is stateless from the caller's
 * perspective — it just takes `data` and an `update(key, value)` callback.
 *
 * These configs intentionally don't wire up to any backend — they are UX
 * scaffolding for the dev team. Fields mirror the shapes requested in the
 * task brief (task 37).
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import * as React from "react";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Shared atoms                                                       */
/* ------------------------------------------------------------------ */

function SectionCard({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <Card size="sm" className="bg-muted/10">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {helper && (
          <p className="text-[10px] leading-relaxed text-muted-foreground/80">{helper}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2.5">{children}</CardContent>
    </Card>
  );
}

function NS({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-full rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50"
    >
      {children}
    </select>
  );
}

function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1 flex items-center gap-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {children}
      </Label>
      {hint && (
        <span title={hint} className="text-muted-foreground/50">
          <Info className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type D = Record<string, unknown>;

/**
 * Upstream-action context: when a node is wired into the graph, the panel
 * passes in the immediate predecessor action node (if any). Used today by
 * Action Path Split to render the correct branch vocabulary, but threaded
 * generically so other condition nodes can use it later.
 */
export type UpstreamActionType = "email" | "sms" | "whatsapp" | "call" | null;

export interface BlockConfigFormProps {
  data: D;
  update: (key: string, value: unknown) => void;
  upstreamActionType?: UpstreamActionType;
}

/* ------------------------------------------------------------------ */
/*  Mock lookups (UI only)                                             */
/* ------------------------------------------------------------------ */

const EVENTS = [
  "Payment Failed",
  "Email Opened",
  "PTP Made",
  "SMS Replied",
  "Payment Received",
  "Login",
];

const SEGMENTS = [
  "High DPD UAE Borrowers",
  "PTP Broken Promise",
  "Low Risk Active Accounts",
  "Arabic Speaking Escalations",
  "New Overdue",
];

const ATTRIBUTES = [
  "dpd",
  "outstanding_amount",
  "payment_status",
  "risk_segment",
  "credit_score",
  "country",
];

const OPERATORS = [
  { k: "equals", v: "Equals" },
  { k: "not_equals", v: "Not equals" },
  { k: "greater_than", v: "Greater than" },
  { k: "less_than", v: "Less than" },
  { k: "between", v: "Between" },
  { k: "contains", v: "Contains" },
];

const JOURNEYS = [
  "High DPD Collection Flow",
  "Broken Promise Follow-up",
  "Early Delinquency Nudge",
  "Settlement Offer Outreach",
];

const CATALOGS = ["Offers Catalog", "Product Catalog", "Branch Catalog", "Agent Directory"];

const TAG_GROUPS = ["risk_tier", "segment", "language", "channel_pref", "campaign"];

/* ------------------------------------------------------------------ */
/*  ===== TRIGGERS ===== (9)                                          */
/* ------------------------------------------------------------------ */

// Collections event catalogue (v1 spec) — overrides the generic EVENTS list
// for the Event Trigger form only. Will move to canonical event registry once
// the data layer lands.
const COLLECTIONS_EVENTS = [
  "pay_in_full_success",
  "pay_in_full_clicked",
  "schedule_payment_success",
  "schedule_payment_clicked",
  "payment_plan_success",
  "payment_plan_clicked",
  "account_settlement_success",
  "account_settlement_clicked",
  "paid_to_lender_partial",
  "dob_verified",
  "land_on_dob_verification_page",
  "id_number_verified",
  "borrower_account_login",
  "borrower_account_login_all",
  "consent_form_i_accept_clicked",
  "promise_to_pay_clicked",
];

export function EventTriggerForm({ data, update }: BlockConfigFormProps) {
  const frequency = (data.frequency as string) ?? "every";
  return (
    <SectionCard title="Event trigger" helper="Start the journey when a user performs a specific event.">
      <div>
        <FieldLabel>Event</FieldLabel>
        <NS value={(data.event as string) ?? ""} onChange={(v) => update("event", v)}>
          <option value="">Select event...</option>
          {COLLECTIONS_EVENTS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </NS>
      </div>
      <div>
        <FieldLabel>Frequency</FieldLabel>
        <NS value={frequency} onChange={(v) => update("frequency", v)}>
          <option value="first">On first occurrence</option>
          <option value="every">On every occurrence</option>
          <option value="nth">On Nth occurrence within window</option>
        </NS>
      </div>
      {frequency === "nth" && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <FieldLabel>Nth</FieldLabel>
            <Input
              type="number"
              value={(data.nthOccurrence as number) ?? 2}
              onChange={(e) => update("nthOccurrence", Number(e.target.value))}
              className="h-7 text-xs"
              min={1}
            />
          </div>
          <div>
            <FieldLabel>Window</FieldLabel>
            <Input
              type="number"
              value={(data.window as number) ?? 7}
              onChange={(e) => update("window", Number(e.target.value))}
              className="h-7 text-xs"
              min={1}
            />
          </div>
          <div>
            <FieldLabel>Unit</FieldLabel>
            <NS value={(data.windowUnit as string) ?? "days"} onChange={(v) => update("windowUnit", v)}>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </NS>
          </div>
        </div>
      )}
      {frequency === "every" && (
        <div>
          <FieldLabel>Cooldown (hours)</FieldLabel>
          <Input
            type="number"
            value={(data.cooldown as number) ?? 0}
            onChange={(e) => update("cooldown", Number(e.target.value))}
            className="h-7 text-xs"
            min={0}
          />
        </div>
      )}
      <div>
        <FieldLabel>Source</FieldLabel>
        <NS value={(data.source as string) ?? "any"} onChange={(v) => update("source", v)}>
          <option value="any">Any source</option>
          <option value="web">Web</option>
          <option value="mobile">Mobile</option>
          <option value="api">API</option>
        </NS>
      </div>
    </SectionCard>
  );
}

export function SegmentMembershipForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Segment membership" helper="Start when a user enters or exits a segment.">
      <div>
        <FieldLabel>Segment</FieldLabel>
        <NS value={(data.segment as string) ?? ""} onChange={(v) => update("segment", v)}>
          <option value="">Select segment...</option>
          {SEGMENTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NS>
      </div>
      <div>
        <FieldLabel>Trigger on</FieldLabel>
        <NS value={(data.triggerOn as string) ?? "enter"} onChange={(v) => update("triggerOn", v)}>
          <option value="enter">Enters segment</option>
          <option value="exit">Exits segment</option>
          <option value="both">Both</option>
        </NS>
      </div>
    </SectionCard>
  );
}

export function ProfileChangeTriggerForm({ data, update }: BlockConfigFormProps) {
  const attrId = (data.attributeId as string) ?? "";
  const attr = CATEGORICAL_ATTRIBUTES.find((a) => a.id === attrId);

  // Group categorical attributes for the dropdown (mirrors DecisionSplitForm).
  const grouped = React.useMemo(() => {
    const m = new Map<string, typeof CATEGORICAL_ATTRIBUTES>();
    CATEGORICAL_ATTRIBUTES.forEach((a) => {
      if (!m.has(a.group)) m.set(a.group, []);
      m.get(a.group)!.push(a);
    });
    return Array.from(m.entries());
  }, []);

  // NOTE: when the data layer lands, operators should be typed per-attribute:
  //   numeric  -> equals, not_equals, gt, lt, gte, lte, between, changes
  //   date     -> equals, before, after, between, changes
  //   boolean  -> is_true, is_false, changes
  // For v1 we only carry categorical attributes here, so the operator set is
  // restricted to the four below.
  const operator = (data.operator as string) ?? "is";

  return (
    <SectionCard title="Profile attribute change" helper="Start when a profile attribute changes.">
      <div>
        <FieldLabel>Attribute</FieldLabel>
        <NS value={attrId} onChange={(v) => update("attributeId", v)}>
          <option value="">Pick an attribute...</option>
          {grouped.map(([group, items]) => (
            <optgroup key={group} label={group}>
              {items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </optgroup>
          ))}
        </NS>
      </div>
      {attr ? (
        <>
          <div>
            <FieldLabel>Operator</FieldLabel>
            <NS value={operator} onChange={(v) => update("operator", v)}>
              <option value="is">is</option>
              <option value="is_not">is not</option>
              <option value="is_in">is in</option>
              <option value="is_not_in">is not in</option>
            </NS>
          </div>
          <div>
            <FieldLabel>Value</FieldLabel>
            <NS value={(data.value as string) ?? ""} onChange={(v) => update("value", v)}>
              <option value="">Select value...</option>
              {attr.values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </NS>
          </div>
        </>
      ) : (
        <>
          <div>
            <FieldLabel>Operator</FieldLabel>
            <NS value={operator} onChange={(v) => update("operator", v)}>
              <option value="equals">Equals</option>
              <option value="increases">Increases</option>
              <option value="decreases">Decreases</option>
              <option value="changes">Any change</option>
            </NS>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>From (optional)</FieldLabel>
              <Input
                value={(data.fromValue as string) ?? ""}
                onChange={(e) => update("fromValue", e.target.value)}
                className="h-7 text-xs"
                placeholder="any"
              />
            </div>
            <div>
              <FieldLabel>To</FieldLabel>
              <Input
                value={(data.toValue as string) ?? ""}
                onChange={(e) => update("toValue", e.target.value)}
                className="h-7 text-xs"
                placeholder="e.g. 60"
              />
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}

// Stub list of date-typed attributes for relative date triggers.
// Will be replaced by a typed attribute catalogue once the data layer lands.
const DATE_ATTRIBUTES = [
  { id: "cf_due_date", label: "Due Date" },
  { id: "cf_ptp_date", label: "Promise-to-Pay Date" },
  { id: "cf_submit_date", label: "Account Submit Date" },
  { id: "cf_last_payment_date", label: "Last Payment Date" },
  { id: "cf_visa_expiry_date", label: "Visa Expiry Date" },
];

export function DateTimeTriggerForm({ data, update }: BlockConfigFormProps) {
  const mode = (data.dateMode as string) ?? "specific";
  const recurringCadence = (data.recurringCadence as string) ?? "daily";
  const weekDays = (data.weekDays as string[]) ?? [];
  const toggleWeekDay = (d: string) => {
    const next = weekDays.includes(d) ? weekDays.filter((x) => x !== d) : [...weekDays, d];
    update("weekDays", next);
  };
  return (
    <SectionCard title="Date / time trigger" helper="Run on a specific date/time, a recurring schedule, or relative to a borrower date attribute.">
      <div>
        <FieldLabel>Mode</FieldLabel>
        <NS value={mode} onChange={(v) => update("dateMode", v)}>
          <option value="specific">Specific date</option>
          <option value="recurring">Recurring</option>
          <option value="relative">Relative to attribute</option>
        </NS>
      </div>

      {mode === "specific" && (
        <div>
          <FieldLabel>Date & time</FieldLabel>
          <Input
            type="datetime-local"
            value={(data.dateTime as string) ?? ""}
            onChange={(e) => update("dateTime", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      )}

      {mode === "recurring" && (
        <>
          <div>
            <FieldLabel>Cadence</FieldLabel>
            <NS value={recurringCadence} onChange={(v) => update("recurringCadence", v)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </NS>
          </div>

          {recurringCadence === "weekly" && (
            <div>
              <FieldLabel>Days of week</FieldLabel>
              <div className="flex flex-wrap gap-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleWeekDay(d)}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      weekDays.includes(d)
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {recurringCadence === "monthly" && (
            <div>
              <FieldLabel>Day of month</FieldLabel>
              <NS value={(data.monthDay as string) ?? "1"} onChange={(v) => update("monthDay", v)}>
                {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value="last">Last day of month</option>
              </NS>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Start date</FieldLabel>
              <Input
                type="date"
                value={(data.startDate as string) ?? ""}
                onChange={(e) => update("startDate", e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <FieldLabel>End date (optional)</FieldLabel>
              <Input
                type="date"
                value={(data.endDate as string) ?? ""}
                onChange={(e) => update("endDate", e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Time of day</FieldLabel>
            <Input
              type="time"
              value={(data.timeOfDay as string) ?? "09:00"}
              onChange={(e) => update("timeOfDay", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </>
      )}

      {mode === "relative" && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel>Direction</FieldLabel>
              <NS
                value={(data.relativeDirection as string) ?? "before"}
                onChange={(v) => update("relativeDirection", v)}
              >
                <option value="before">Before</option>
                <option value="after">After</option>
              </NS>
            </div>
            <div>
              <FieldLabel>Amount</FieldLabel>
              <Input
                type="number"
                value={(data.relativeAmount as number) ?? 1}
                onChange={(e) => update("relativeAmount", Number(e.target.value))}
                className="h-7 text-xs"
                min={0}
              />
            </div>
            <div>
              <FieldLabel>Unit</FieldLabel>
              <NS
                value={(data.relativeUnit as string) ?? "days"}
                onChange={(v) => update("relativeUnit", v)}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </NS>
            </div>
          </div>
          <div>
            <FieldLabel>Anchor attribute</FieldLabel>
            <NS
              value={(data.anchorAttribute as string) ?? ""}
              onChange={(v) => update("anchorAttribute", v)}
            >
              <option value="">Select date attribute...</option>
              {DATE_ATTRIBUTES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </NS>
          </div>
        </>
      )}

      <div>
        <FieldLabel>Timezone</FieldLabel>
        <NS value={(data.timezone as string) ?? "UTC"} onChange={(v) => update("timezone", v)}>
          <option value="UTC">UTC</option>
          <option value="Asia/Dubai">Asia/Dubai (GST)</option>
          <option value="Asia/Riyadh">Asia/Riyadh</option>
          <option value="Europe/London">Europe/London</option>
        </NS>
      </div>
    </SectionCard>
  );
}

export function SpecificUsersForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Specific users" helper="Upload a CSV or paste a list of identifiers.">
      <div className="flex gap-2">
        <button
          type="button"
          className="flex h-7 flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-[11px] text-muted-foreground hover:bg-muted/40"
        >
          Upload CSV
        </button>
      </div>
      <div>
        <FieldLabel>Or paste IDs (one per line)</FieldLabel>
        <Textarea
          value={(data.userIds as string) ?? ""}
          onChange={(e) => update("userIds", e.target.value)}
          className="min-h-[70px] font-mono text-[10px]"
          placeholder="borrower_001&#10;borrower_002"
        />
      </div>
    </SectionCard>
  );
}

export function GeofenceTriggerForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Geofence" helper="Start when a user enters, exits, or dwells in a location.">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Latitude</FieldLabel>
          <Input
            value={(data.lat as string) ?? ""}
            onChange={(e) => update("lat", e.target.value)}
            className="h-7 text-xs"
            placeholder="25.2048"
          />
        </div>
        <div>
          <FieldLabel>Longitude</FieldLabel>
          <Input
            value={(data.lng as string) ?? ""}
            onChange={(e) => update("lng", e.target.value)}
            className="h-7 text-xs"
            placeholder="55.2708"
          />
        </div>
      </div>
      <div>
        <FieldLabel>Radius (meters)</FieldLabel>
        <Input
          type="number"
          value={(data.radius as number) ?? 500}
          onChange={(e) => update("radius", Number(e.target.value))}
          className="h-7 text-xs"
          min={50}
        />
      </div>
      <div>
        <FieldLabel>Trigger on</FieldLabel>
        <NS value={(data.geoTriggerOn as string) ?? "enter"} onChange={(v) => update("geoTriggerOn", v)}>
          <option value="enter">Enter</option>
          <option value="exit">Exit</option>
          <option value="dwell">Dwell (&gt; 5 min)</option>
        </NS>
      </div>
    </SectionCard>
  );
}

export function InboundMessageTriggerForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Inbound message" helper="Start when the user sends an inbound message.">
      <div>
        <FieldLabel>Channel</FieldLabel>
        <NS value={(data.channel as string) ?? "email"} onChange={(v) => update("channel", v)}>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </NS>
      </div>
      <div>
        <FieldLabel>Keyword filter (optional)</FieldLabel>
        <Input
          value={(data.keywords as string) ?? ""}
          onChange={(e) => update("keywords", e.target.value)}
          className="h-7 text-xs"
          placeholder="stop, pay, help"
        />
      </div>
      <div>
        <FieldLabel>From specific address (optional)</FieldLabel>
        <Input
          value={(data.fromAddress as string) ?? ""}
          onChange={(e) => update("fromAddress", e.target.value)}
          className="h-7 text-xs"
          placeholder="+971..."
        />
      </div>
    </SectionCard>
  );
}

export function IncomingCallTriggerForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Incoming call" helper="Start when an inbound call arrives.">
      <div>
        <FieldLabel>From number (optional)</FieldLabel>
        <Input
          value={(data.fromNumber as string) ?? ""}
          onChange={(e) => update("fromNumber", e.target.value)}
          className="h-7 text-xs"
          placeholder="+971501234567"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Country</FieldLabel>
          <NS value={(data.callerCountry as string) ?? "any"} onChange={(v) => update("callerCountry", v)}>
            <option value="any">Any</option>
            <option value="AE">United Arab Emirates</option>
            <option value="SA">Saudi Arabia</option>
            <option value="EG">Egypt</option>
          </NS>
        </div>
        <div>
          <FieldLabel>Time of day</FieldLabel>
          <NS value={(data.timeOfDayFilter as string) ?? "any"} onChange={(v) => update("timeOfDayFilter", v)}>
            <option value="any">Any time</option>
            <option value="business">Business hours</option>
            <option value="off">Off hours</option>
          </NS>
        </div>
      </div>
    </SectionCard>
  );
}

// Stub list of existing journeys for the "Specific journeys" picker.
// Will be replaced by a query to the journeys list when the data layer lands.
const STUB_JOURNEYS = [
  { id: "high-dpd", name: "High DPD Collection Flow" },
  { id: "broken-promise", name: "Broken Promise Follow-up" },
  { id: "new-overdue", name: "New Overdue Reminder" },
  { id: "early-delinquency", name: "Early Delinquency Nudge" },
  { id: "settlement-offer", name: "Settlement Offer Outreach" },
];

export function JourneyHandoffEntryForm({ data, update }: BlockConfigFormProps) {
  const mode = (data.acceptFrom as string) ?? "all";
  const sourceJourneys = (data.sourceJourneys as string[]) ?? [];

  const toggleJourney = (id: string) => {
    const next = sourceJourneys.includes(id)
      ? sourceJourneys.filter((j) => j !== id)
      : [...sourceJourneys, id];
    update("sourceJourneys", next);
  };

  return (
    <SectionCard
      title="Journey Handoff Entry"
      helper="Accept borrowers handed off from other journeys. Runs in parallel with the journey's normal Trigger node."
    >
      <div>
        <FieldLabel>Accept from</FieldLabel>
        <NS value={mode} onChange={(v) => update("acceptFrom", v)}>
          <option value="all">All journeys</option>
          <option value="specific">Specific journeys</option>
        </NS>
      </div>

      {mode === "specific" && (
        <div>
          <FieldLabel>Source journeys</FieldLabel>
          <div className="space-y-1 rounded-md border border-border bg-muted/20 p-2">
            {STUB_JOURNEYS.map((j) => (
              <label
                key={j.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-foreground hover:bg-accent/30"
              >
                <input
                  type="checkbox"
                  checked={sourceJourneys.includes(j.id)}
                  onChange={() => toggleJourney(j.id)}
                  className="h-3.5 w-3.5 accent-[var(--primary)]"
                />
                <span className="flex-1">{j.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{j.id}</span>
              </label>
            ))}
          </div>
          {sourceJourneys.length === 0 && (
            <p className="mt-1 text-[10px] text-warning-400">Select at least one source journey.</p>
          )}
        </div>
      )}

      <div>
        <FieldLabel>Source variables</FieldLabel>
        <div className="rounded-md border border-border bg-muted/20 p-2 text-[11px] text-muted-foreground">
          <p>These variables will be available to downstream nodes:</p>
          <ul className="mt-1.5 space-y-0.5">
            <li>
              <span className="font-mono text-foreground">source_journey_id</span>
            </li>
            <li>
              <span className="font-mono text-foreground">source_outcome</span>
            </li>
            <li className="text-muted-foreground/80">
              Any forwarded variables from the source journey
            </li>
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}

export function ExternalSourceTriggerForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="External source" helper="Start from an external webhook, API, or file import.">
      <div>
        <FieldLabel>Webhook URL</FieldLabel>
        <div className="flex items-center rounded-lg border border-input bg-muted/40 px-2">
          <code className="flex-1 truncate font-mono text-[10px] text-muted-foreground">
            https://api.cleargrid.io/hooks/{(data.webhookId as string) ?? "abc123"}
          </code>
        </div>
      </div>
      <div>
        <FieldLabel>Expected payload schema</FieldLabel>
        <Textarea
          value={(data.payloadSchema as string) ?? ""}
          onChange={(e) => update("payloadSchema", e.target.value)}
          className="min-h-[80px] font-mono text-[10px]"
          placeholder='{ "user_id": "string", "event": "string" }'
        />
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  ===== CHANNELS ===== (other than email/sms/wa/call which         */
/*  already have rich forms in node-config-panel.tsx)                 */
/* ------------------------------------------------------------------ */

export function MobilePushForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Mobile push" helper="Send a push notification to iOS / Android apps.">
      <div>
        <FieldLabel>Title</FieldLabel>
        <Input
          value={(data.pushTitle as string) ?? ""}
          onChange={(e) => update("pushTitle", e.target.value)}
          className="h-7 text-xs"
          placeholder="Payment reminder"
        />
      </div>
      <div>
        <FieldLabel>Body</FieldLabel>
        <Textarea
          value={(data.pushBody as string) ?? ""}
          onChange={(e) => update("pushBody", e.target.value)}
          className="min-h-[60px] text-xs"
          placeholder="Your payment of {amount} is due..."
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Image URL</FieldLabel>
          <Input
            value={(data.pushImage as string) ?? ""}
            onChange={(e) => update("pushImage", e.target.value)}
            className="h-7 text-xs"
            placeholder="https://..."
          />
        </div>
        <div>
          <FieldLabel>Action URL</FieldLabel>
          <Input
            value={(data.pushAction as string) ?? ""}
            onChange={(e) => update("pushAction", e.target.value)}
            className="h-7 text-xs"
            placeholder="app://pay"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Sound</FieldLabel>
          <NS value={(data.pushSound as string) ?? "default"} onChange={(v) => update("pushSound", v)}>
            <option value="default">Default</option>
            <option value="alert">Alert</option>
            <option value="none">Silent</option>
          </NS>
        </div>
        <div>
          <FieldLabel>Badge count</FieldLabel>
          <Input
            type="number"
            value={(data.pushBadge as number) ?? 1}
            onChange={(e) => update("pushBadge", Number(e.target.value))}
            className="h-7 text-xs"
            min={0}
          />
        </div>
      </div>
    </SectionCard>
  );
}

export function WebPushForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Web push" helper="Send a browser push notification.">
      <div>
        <FieldLabel>Title</FieldLabel>
        <Input
          value={(data.webPushTitle as string) ?? ""}
          onChange={(e) => update("webPushTitle", e.target.value)}
          className="h-7 text-xs"
        />
      </div>
      <div>
        <FieldLabel>Body</FieldLabel>
        <Textarea
          value={(data.webPushBody as string) ?? ""}
          onChange={(e) => update("webPushBody", e.target.value)}
          className="min-h-[60px] text-xs"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Image</FieldLabel>
          <Input
            value={(data.webPushImage as string) ?? ""}
            onChange={(e) => update("webPushImage", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <FieldLabel>Action URL</FieldLabel>
          <Input
            value={(data.webPushAction as string) ?? ""}
            onChange={(e) => update("webPushAction", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      </div>
      <div>
        <FieldLabel>TTL (seconds)</FieldLabel>
        <Input
          type="number"
          value={(data.webPushTtl as number) ?? 86400}
          onChange={(e) => update("webPushTtl", Number(e.target.value))}
          className="h-7 text-xs"
          min={60}
        />
      </div>
    </SectionCard>
  );
}

export function InAppMessageForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="In-app message" helper="Display an in-app overlay to matching users.">
      <div>
        <FieldLabel>Template</FieldLabel>
        <NS value={(data.inappTemplate as string) ?? ""} onChange={(v) => update("inappTemplate", v)}>
          <option value="">Pick template...</option>
          <option value="banner_top">Banner (top)</option>
          <option value="modal_center">Modal (center)</option>
          <option value="slide_in">Slide-in (corner)</option>
        </NS>
      </div>
      <div>
        <FieldLabel>Target page</FieldLabel>
        <Input
          value={(data.inappPage as string) ?? ""}
          onChange={(e) => update("inappPage", e.target.value)}
          className="h-7 text-xs"
          placeholder="/dashboard"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Delay (s)</FieldLabel>
          <Input
            type="number"
            value={(data.inappDelay as number) ?? 0}
            onChange={(e) => update("inappDelay", Number(e.target.value))}
            className="h-7 text-xs"
            min={0}
          />
        </div>
        <div>
          <FieldLabel>Position</FieldLabel>
          <NS value={(data.inappPosition as string) ?? "center"} onChange={(v) => update("inappPosition", v)}>
            <option value="top">Top</option>
            <option value="center">Center</option>
            <option value="bottom">Bottom</option>
          </NS>
        </div>
      </div>
    </SectionCard>
  );
}

export function OnsiteContentForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="On-site content" helper="Inject personalised content into a DOM element.">
      <div>
        <FieldLabel>Selector</FieldLabel>
        <Input
          value={(data.selector as string) ?? ""}
          onChange={(e) => update("selector", e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder=".hero-banner"
        />
      </div>
      <div>
        <FieldLabel>Content type</FieldLabel>
        <NS value={(data.contentType as string) ?? "html"} onChange={(v) => update("contentType", v)}>
          <option value="html">HTML</option>
          <option value="image">Image</option>
          <option value="text">Plain text</option>
        </NS>
      </div>
      <div>
        <FieldLabel>Content</FieldLabel>
        <Textarea
          value={(data.onsiteContent as string) ?? ""}
          onChange={(e) => update("onsiteContent", e.target.value)}
          className="min-h-[60px] font-mono text-[10px]"
        />
      </div>
    </SectionCard>
  );
}

export function RichMediaForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Rich media" helper="Send an MMS with image, caption and up to 3 CTAs.">
      <div>
        <FieldLabel>Media URL</FieldLabel>
        <Input
          value={(data.mediaUrl as string) ?? ""}
          onChange={(e) => update("mediaUrl", e.target.value)}
          className="h-7 text-xs"
          placeholder="https://..."
        />
      </div>
      <div>
        <FieldLabel>Caption</FieldLabel>
        <Textarea
          value={(data.caption as string) ?? ""}
          onChange={(e) => update("caption", e.target.value)}
          className="min-h-[50px] text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel>CTA buttons</FieldLabel>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={((data[`ctaLabel${i}`] as string) ?? "")}
              onChange={(e) => update(`ctaLabel${i}`, e.target.value)}
              className="h-7 text-xs"
              placeholder={`Button ${i + 1} label`}
            />
            <Input
              value={((data[`ctaUrl${i}`] as string) ?? "")}
              onChange={(e) => update(`ctaUrl${i}`, e.target.value)}
              className="h-7 text-xs"
              placeholder="https://"
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function NotifyInternalForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Notify internal team" helper="Send an internal notification to teammates.">
      <div>
        <FieldLabel>Notification type</FieldLabel>
        <NS value={(data.notifyType as string) ?? "slack"} onChange={(v) => update("notifyType", v)}>
          <option value="slack">Slack</option>
          <option value="email">Email</option>
          <option value="inapp">In-app</option>
        </NS>
      </div>
      <div>
        <FieldLabel>Recipients</FieldLabel>
        <Input
          value={(data.recipients as string) ?? ""}
          onChange={(e) => update("recipients", e.target.value)}
          className="h-7 text-xs"
          placeholder="#collections or user@..."
        />
      </div>
      <div>
        <FieldLabel>Message</FieldLabel>
        <Textarea
          value={(data.notifyMessage as string) ?? ""}
          onChange={(e) => update("notifyMessage", e.target.value)}
          className="min-h-[50px] text-xs"
          placeholder="New PTP from {borrower.name}"
        />
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  ===== CONDITIONS ===== (non-legacy)                               */
/* ------------------------------------------------------------------ */

// Categorical attribute catalogue — branches are auto-derived from these
// enum values. Stubbed here for v1; will be replaced by the canonical
// borrower attribute catalogue once the data layer lands.
// See Section 7 of the v1 spec for the source of truth on attribute names.
export const CATEGORICAL_ATTRIBUTES: { id: string; label: string; group: string; values: string[] }[] = [
  // AI Callback (deal-level)
  // Stub — registered by slice 1 in production
  { id: "callback_requested", label: "Callback requested", group: "AI Callback", values: ["true", "false"] },
  { id: "callback_date", label: "Callback date", group: "AI Callback", values: [] },
  { id: "callback_time", label: "Callback time", group: "AI Callback", values: [] },
  // Risk & Collections
  { id: "dpd_bucket_label", label: "DPD Bucket", group: "Risk & Collections", values: ["0-30", "31-60", "61-90", "91-180", "180+"] },
  { id: "risk_segment", label: "Risk Segment", group: "Risk & Collections", values: ["Early", "Mid", "Late", "Legal"] },
  { id: "engagement_tier", label: "Engagement Tier", group: "Risk & Collections", values: ["Hot", "Warm", "Cold"] },
  { id: "last_journey_outcome", label: "Last Journey Outcome", group: "Risk & Collections", values: ["Converted", "Exited", "Timed Out", "Errored"] },
  // Communications / Consent
  { id: "consent_status", label: "Consent Status", group: "Consent", values: ["Full", "Restricted", "Blocked"] },
  { id: "preferred_channel", label: "Preferred Channel", group: "Consent", values: ["Voice", "Email", "SMS"] },
  { id: "contactability_score", label: "Contactability Score", group: "Consent", values: ["High", "Medium", "Low"] },
  // Borrower Identity
  { id: "language", label: "Language", group: "Borrower Identity", values: ["English", "Arabic", "Urdu", "Hindi", "Filipino"] },
  { id: "country", label: "Country", group: "Borrower Identity", values: ["UAE", "KSA", "Other"] },
];

export function DecisionSplitForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Decision split" helper="Route users based on a boolean check.">
      <div>
        <FieldLabel>Field</FieldLabel>
        <NS value={(data.field as string) ?? ""} onChange={(v) => update("field", v)}>
          <option value="">Pick a field...</option>
          {ATTRIBUTES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </NS>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Operator</FieldLabel>
          <NS value={(data.operator as string) ?? "equals"} onChange={(v) => update("operator", v)}>
            {OPERATORS.map((o) => (
              <option key={o.k} value={o.k}>
                {o.v}
              </option>
            ))}
          </NS>
        </div>
        <div>
          <FieldLabel>Value</FieldLabel>
          <Input
            value={(data.value as string) ?? ""}
            onChange={(e) => update("value", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Yes label</FieldLabel>
          <Input
            value={(data.yesLabel as string) ?? "Yes"}
            onChange={(e) => update("yesLabel", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <FieldLabel>No label</FieldLabel>
          <Input
            value={(data.noLabel as string) ?? "No"}
            onChange={(e) => update("noLabel", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      </div>
    </SectionCard>
  );
}

export function AudienceSplitForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Audience split" helper="Route users across up to 5 segments. First match wins.">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i}>
          <FieldLabel>{`Branch ${String.fromCharCode(65 + i)} segment`}</FieldLabel>
          <NS
            value={(data[`segment${i}`] as string) ?? ""}
            onChange={(v) => update(`segment${i}`, v)}
          >
            <option value="">— skip —</option>
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NS>
        </div>
      ))}
    </SectionCard>
  );
}

// Branch vocabulary per upstream action type. "No response" is always last
// and fires after the wait window expires.
const ACTION_PATH_BRANCHES: Record<Exclude<UpstreamActionType, null>, string[]> = {
  email: ["Delivered", "Bounced", "Opened", "Clicked", "Replied", "Unsubscribed", "No response"],
  sms: ["Delivered", "Failed", "Replied", "Opted out", "No response"],
  whatsapp: ["Delivered", "Read", "Replied", "Failed", "Opted out", "No response"],
  call: [
    "PTP captured",
    "Dispute raised",
    "Callback requested",
    "Connected (other)",
    "Voicemail",
    "No answer / unreachable",
    "Technical failure",
    "No response",
  ],
};

const ACTION_PATH_LABEL: Record<Exclude<UpstreamActionType, null>, string> = {
  email: "Send Email",
  sms: "Send SMS",
  whatsapp: "Send WhatsApp",
  call: "Trigger AI Call",
};

export function ActionPathSplitForm({ data, update, upstreamActionType }: BlockConfigFormProps) {
  const hasUpstream = upstreamActionType !== null && upstreamActionType !== undefined;
  const branches = hasUpstream ? ACTION_PATH_BRANCHES[upstreamActionType] : [];

  // Persist the selected branch set in node data so the canvas / branch labels
  // can render even without the panel open.
  React.useEffect(() => {
    if (hasUpstream && branches.length > 0) {
      const persisted = data.branchLabels as string[] | undefined;
      const same = persisted && persisted.length === branches.length && persisted.every((b, i) => b === branches[i]);
      if (!same) {
        update("branchLabels", branches);
        update("branches", branches.length);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upstreamActionType]);

  return (
    <SectionCard
      title="Action path split"
      helper="Branches are driven by the outcome of the upstream action node, with a wait window before falling through to No response."
    >
      <div>
        <FieldLabel>Upstream action</FieldLabel>
        {hasUpstream ? (
          <div className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground">
            {ACTION_PATH_LABEL[upstreamActionType]}
          </div>
        ) : (
          <div className="rounded-md border border-error-500/40 bg-error-500/10 px-2 py-1.5 text-xs text-error-300">
            Action Path Split must follow an action node.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Wait window</FieldLabel>
          <Input
            type="number"
            value={(data.actionWindow as number) ?? 1}
            onChange={(e) => {
              const v = Math.min(Math.max(Number(e.target.value) || 1, 1), 14);
              update("actionWindow", v);
            }}
            className="h-7 text-xs"
            min={1}
            max={14}
          />
        </div>
        <div>
          <FieldLabel>Unit</FieldLabel>
          <NS value={(data.actionWindowUnit as string) ?? "days"} onChange={(v) => update("actionWindowUnit", v)}>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </NS>
        </div>
      </div>

      {hasUpstream && (
        <div>
          <FieldLabel>Branches ({branches.length})</FieldLabel>
          <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-muted/20 p-2">
            {branches.map((b) => (
              <span
                key={b}
                className="inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-foreground"
              >
                {b}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            One outgoing edge per branch. &quot;No response&quot; fires after the wait window expires.
          </p>
        </div>
      )}
    </SectionCard>
  );
}

export function HasDoneEventForm({ data, update }: BlockConfigFormProps) {
  const frequencyOp = (data.frequencyOp as string) ?? "at_least";
  return (
    <SectionCard title="Has done event" helper="Check whether a user performed an event recently.">
      <div>
        <FieldLabel>Event</FieldLabel>
        <NS value={(data.event as string) ?? ""} onChange={(v) => update("event", v)}>
          <option value="">Select event...</option>
          {EVENTS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </NS>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Window</FieldLabel>
          <Input
            type="number"
            value={(data.window as number) ?? 7}
            onChange={(e) => update("window", Number(e.target.value))}
            className="h-7 text-xs"
            min={1}
          />
        </div>
        <div>
          <FieldLabel>Unit</FieldLabel>
          <NS value={(data.windowUnit as string) ?? "days"} onChange={(v) => update("windowUnit", v)}>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </NS>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_90px] gap-2">
        <div>
          <FieldLabel>Frequency</FieldLabel>
          <NS value={frequencyOp} onChange={(v) => update("frequencyOp", v)}>
            <option value="at_least">At least N occurrences</option>
            <option value="exactly">Exactly N occurrences</option>
            <option value="at_most">At most N occurrences</option>
          </NS>
        </div>
        <div>
          <FieldLabel>N</FieldLabel>
          <Input
            type="number"
            value={(data.frequencyN as number) ?? 1}
            onChange={(e) => update("frequencyN", Number(e.target.value))}
            className="h-7 text-xs"
            min={1}
          />
        </div>
      </div>
      <div>
        <FieldLabel>Payload filter (optional)</FieldLabel>
        <Input
          value={(data.payloadFilter as string) ?? ""}
          onChange={(e) => update("payloadFilter", e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder='e.g. amount > 100'
        />
      </div>
    </SectionCard>
  );
}

export function ProfileCheckForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Profile attribute check" helper="Branch across 3 paths: Match A / Match B / No match.">
      <div>
        <FieldLabel>Field</FieldLabel>
        <NS value={(data.field as string) ?? ""} onChange={(v) => update("field", v)}>
          <option value="">Pick attribute...</option>
          {ATTRIBUTES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </NS>
      </div>
      <div>
        <FieldLabel>Match A: value</FieldLabel>
        <Input
          value={(data.matchA as string) ?? ""}
          onChange={(e) => update("matchA", e.target.value)}
          className="h-7 text-xs"
        />
      </div>
      <div>
        <FieldLabel>Match B: value</FieldLabel>
        <Input
          value={(data.matchB as string) ?? ""}
          onChange={(e) => update("matchB", e.target.value)}
          className="h-7 text-xs"
        />
      </div>
    </SectionCard>
  );
}

export function ReachabilityCheckForm({ data, update }: BlockConfigFormProps) {
  const channels = (data.channels as string[]) ?? [];
  const toggle = (ch: string) => {
    const next = channels.includes(ch) ? channels.filter((c) => c !== ch) : [...channels, ch];
    update("channels", next);
  };
  return (
    <SectionCard title="Reachability check" helper="Check which channels this user is reachable on.">
      {["Email", "SMS", "WhatsApp", "Voice"].map((ch) => (
        <label key={ch} className="flex items-center gap-2 text-xs text-foreground">
          <Checkbox
            checked={channels.includes(ch.toLowerCase())}
            onCheckedChange={() => toggle(ch.toLowerCase())}
          />
          {ch}
        </label>
      ))}
    </SectionCard>
  );
}

export function BestChannelForm({ data, update }: BlockConfigFormProps) {
  const CHANNEL_OPTIONS = ["Email", "SMS", "WhatsApp", "AI Call"];
  const eligibleChannels =
    (data.eligibleChannels as string[]) ?? ["Email", "SMS", "WhatsApp", "AI Call"];
  const toggleChannel = (ch: string) => {
    const next = eligibleChannels.includes(ch)
      ? eligibleChannels.filter((c) => c !== ch)
      : [...eligibleChannels, ch];
    update("eligibleChannels", next);
  };

  const SCORING_INPUTS: { name: string; description: string }[] = [
    { name: "preferred_channel", description: "primary scoring input" },
    { name: "contactability_score", description: "secondary scoring input" },
    { name: "consent_status", description: "hard gate; channel excluded if not Full" },
    { name: "is_phone_reachable", description: "per-channel reachability gates" },
    { name: "is_email_reachable", description: "per-channel reachability gates" },
    { name: "is_sms_reachable", description: "per-channel reachability gates" },
  ];

  return (
    <SectionCard
      title="Best channel"
      helper="Pick the best reachable channel using preferred_channel + contactability_score, gated by consent and reachability."
    >
      <div>
        <FieldLabel>Eligible channels</FieldLabel>
        <div className="flex flex-wrap gap-1">
          {CHANNEL_OPTIONS.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => toggleChannel(ch)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                eligibleChannels.includes(ch)
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          One outgoing edge per selected channel, plus a &quot;No reachable channel&quot; fallback.
        </p>
        {eligibleChannels.length === 0 && (
          <p className="mt-1 text-[10px] text-warning-400">Select at least one channel.</p>
        )}
      </div>
      <div>
        <FieldLabel>Scoring uses these attributes</FieldLabel>
        <div className="space-y-1 rounded-md border border-border bg-muted/20 p-2">
          {SCORING_INPUTS.map((s) => (
            <div key={s.name} className="flex items-baseline gap-2 text-[11px]">
              <span className="font-mono text-foreground">{s.name}</span>
              <span className="text-muted-foreground">— {s.description}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

export function InboundEvaluatorForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Inbound response evaluator" helper="Branch on inbound message sentiment & keywords.">
      <div>
        <FieldLabel>Sentiment buckets</FieldLabel>
        <p className="text-[10px] text-muted-foreground">
          This block has fixed outputs: Positive / Neutral / Negative / Angry.
        </p>
      </div>
      <div>
        <FieldLabel>Keyword filter (optional)</FieldLabel>
        <Input
          value={(data.keywords as string) ?? ""}
          onChange={(e) => update("keywords", e.target.value)}
          className="h-7 text-xs"
          placeholder="stop, refund, complaint"
        />
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  ===== FLOW CONTROLS ===== (beyond basic wait)                    */
/* ------------------------------------------------------------------ */

export function WaitUntilDateForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Wait until date" helper="Hold users until a specific date / time.">
      <div>
        <FieldLabel>Date</FieldLabel>
        <Input
          type="date"
          value={(data.untilDate as string) ?? ""}
          onChange={(e) => update("untilDate", e.target.value)}
          className="h-7 text-xs"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Time</FieldLabel>
          <Input
            type="time"
            value={(data.untilTime as string) ?? "09:00"}
            onChange={(e) => update("untilTime", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <FieldLabel>Timezone</FieldLabel>
          <NS value={(data.timezone as string) ?? "UTC"} onChange={(v) => update("timezone", v)}>
            <option value="UTC">UTC</option>
            <option value="Asia/Dubai">Asia/Dubai</option>
            <option value="Asia/Riyadh">Asia/Riyadh</option>
          </NS>
        </div>
      </div>
    </SectionCard>
  );
}

export function WaitTimeSlotsForm({ data, update }: BlockConfigFormProps) {
  const days = (data.activeDays as string[]) ?? ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const toggle = (d: string) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    update("activeDays", next);
  };
  return (
    <SectionCard title="Wait for time slots" helper="Only progress within allowed day / time windows.">
      <div>
        <FieldLabel>Active days</FieldLabel>
        <div className="flex flex-wrap gap-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                days.includes(d)
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>From</FieldLabel>
          <Input
            type="time"
            value={(data.slotFrom as string) ?? "09:00"}
            onChange={(e) => update("slotFrom", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <FieldLabel>To</FieldLabel>
          <Input
            type="time"
            value={(data.slotTo as string) ?? "18:00"}
            onChange={(e) => update("slotTo", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      </div>
    </SectionCard>
  );
}

export function WaitForEventForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Wait for event" helper="Block users until an event occurs, or timeout hits.">
      <div>
        <FieldLabel>Event</FieldLabel>
        <NS value={(data.event as string) ?? ""} onChange={(v) => update("event", v)}>
          <option value="">Select event...</option>
          {EVENTS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </NS>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Timeout</FieldLabel>
          <Input
            type="number"
            value={(data.timeout as number) ?? 24}
            onChange={(e) => update("timeout", Number(e.target.value))}
            className="h-7 text-xs"
            min={1}
          />
        </div>
        <div>
          <FieldLabel>Unit</FieldLabel>
          <NS value={(data.timeoutUnit as string) ?? "hours"} onChange={(v) => update("timeoutUnit", v)}>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </NS>
        </div>
      </div>
    </SectionCard>
  );
}

export function WaitProfileChangeForm({ data, update }: BlockConfigFormProps) {
  const watchAttribute = (data.watchAttribute as string) ?? "";

  const grouped = React.useMemo(() => {
    const m = new Map<string, typeof CATEGORICAL_ATTRIBUTES>();
    CATEGORICAL_ATTRIBUTES.forEach((a) => {
      if (!m.has(a.group)) m.set(a.group, []);
      m.get(a.group)!.push(a);
    });
    return Array.from(m.entries());
  }, []);

  return (
    <SectionCard
      title="Wait for profile change"
      helper="Two outgoing edges: 'Changed' and 'No change (timeout)'."
    >
      <div>
        <FieldLabel>Attribute</FieldLabel>
        <NS value={watchAttribute} onChange={(v) => update("watchAttribute", v)}>
          <option value="">Pick an attribute...</option>
          {grouped.map(([group, items]) => (
            <optgroup key={group} label={group}>
              {items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </optgroup>
          ))}
        </NS>
        {!watchAttribute && (
          <p className="mt-1 text-[10px] text-warning-400">Required.</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Timeout</FieldLabel>
          <Input
            type="number"
            value={(data.timeout as number) ?? 7}
            onChange={(e) => update("timeout", Number(e.target.value))}
            className="h-7 text-xs"
            min={1}
          />
        </div>
        <div>
          <FieldLabel>Unit</FieldLabel>
          <NS value={(data.timeoutUnit as string) ?? "days"} onChange={(v) => update("timeoutUnit", v)}>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </NS>
        </div>
      </div>
    </SectionCard>
  );
}

export function PauseHoldForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Pause / hold" helper="Explicit pause — resume manually or after a duration.">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Pause duration</FieldLabel>
          <Input
            type="number"
            value={(data.pauseDuration as number) ?? 24}
            onChange={(e) => update("pauseDuration", Number(e.target.value))}
            className="h-7 text-xs"
            min={1}
          />
        </div>
        <div>
          <FieldLabel>Unit</FieldLabel>
          <NS value={(data.pauseUnit as string) ?? "hours"} onChange={(v) => update("pauseUnit", v)}>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
          </NS>
        </div>
      </div>
      <div>
        <label className="flex items-center justify-between">
          <span className="text-xs text-foreground">Allow manual resume</span>
          <Switch
            checked={(data.allowManualResume as boolean) ?? true}
            onCheckedChange={(val) => update("allowManualResume", val)}
            size="sm"
          />
        </label>
        <p className="mt-1 text-[10px] text-muted-foreground">
          When on, an agent or admin can release the hold from the journey monitoring view
          before the timer expires.
        </p>
      </div>
    </SectionCard>
  );
}

export function TrafficSplitForm({ data, update }: BlockConfigFormProps) {
  const n = (data.splitCount as number) ?? 2;
  const splits = (data.splits as number[]) ?? Array(n).fill(Math.floor(100 / n));
  const sum = splits.reduce((a, b) => a + b, 0);
  const updateSplit = (i: number, val: number) => {
    const next = [...splits];
    next[i] = Math.max(0, Math.min(100, val));
    update("splits", next);
  };
  return (
    <SectionCard title="Traffic split" helper="Randomly distribute users across up to 5 paths.">
      <div>
        <FieldLabel>Number of paths</FieldLabel>
        <NS
          value={String(n)}
          onChange={(v) => {
            const count = Number(v);
            const even = Math.floor(100 / count);
            update("splitCount", count);
            update("splits", Array(count).fill(even));
          }}
        >
          {[2, 3, 4, 5].map((x) => (
            <option key={x} value={x}>{`${x} paths`}</option>
          ))}
        </NS>
      </div>
      {splits.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-16 text-[10px] text-muted-foreground">
            Path {String.fromCharCode(65 + i)}
          </span>
          <Input
            type="number"
            value={s}
            onChange={(e) => updateSplit(i, Number(e.target.value))}
            className="h-7 text-xs"
            min={0}
            max={100}
          />
          <span className="text-[10px] text-muted-foreground">%</span>
        </div>
      ))}
      <div
        className={`rounded px-2 py-1 text-center text-[10px] font-medium ${
          sum === 100 ? "bg-primary-500/10 text-primary-400" : "bg-error-500/10 text-error-400"
        }`}
      >
        Total: {sum}%{sum !== 100 && " (must equal 100%)"}
      </div>
    </SectionCard>
  );
}

export function EndJourneyForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="End journey" helper="Tag the outcome when the user exits the journey.">
      <div>
        <FieldLabel>Outcome</FieldLabel>
        <NS value={(data.outcome as string) ?? "Exited"} onChange={(v) => update("outcome", v)}>
          <option value="Converted">Converted</option>
          <option value="Exited">Exited</option>
          <option value="Timed Out">Timed Out</option>
          <option value="Errored">Errored</option>
        </NS>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Records why this journey exited. Aligns with the{" "}
          <span className="font-mono text-foreground">last_journey_outcome</span> attribute.
        </p>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  ===== DATA / STATE =====                                          */
/* ------------------------------------------------------------------ */

export function ContextVariableForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Context variable" helper="Create a journey-scoped variable.">
      <div>
        <FieldLabel>Variable name</FieldLabel>
        <Input
          value={(data.varName as string) ?? ""}
          onChange={(e) => update("varName", e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder="attempt_count"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Type</FieldLabel>
          <NS value={(data.varType as string) ?? "string"} onChange={(v) => update("varType", v)}>
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="json">JSON</option>
          </NS>
        </div>
        <div>
          <FieldLabel>Initial value</FieldLabel>
          <Input
            value={(data.varInitial as string) ?? ""}
            onChange={(e) => update("varInitial", e.target.value)}
            className="h-7 text-xs font-mono"
          />
        </div>
      </div>
    </SectionCard>
  );
}

export function UpdateVariableForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Update variable" helper="Update a journey variable using an expression.">
      <div>
        <FieldLabel>Variable</FieldLabel>
        <Input
          value={(data.varName as string) ?? ""}
          onChange={(e) => update("varName", e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder="attempt_count"
        />
      </div>
      <div>
        <FieldLabel>New value / expression</FieldLabel>
        <Textarea
          value={(data.varExpression as string) ?? ""}
          onChange={(e) => update("varExpression", e.target.value)}
          className="min-h-[50px] font-mono text-[10px]"
          placeholder="{attempt_count} + 1"
        />
      </div>
    </SectionCard>
  );
}

export function UpdateProfileForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Update profile" helper="Persist a value onto the customer profile.">
      <div>
        <FieldLabel>Profile field</FieldLabel>
        <NS value={(data.profileField as string) ?? ""} onChange={(v) => update("profileField", v)}>
          <option value="">Select field...</option>
          {ATTRIBUTES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </NS>
      </div>
      <div>
        <FieldLabel>New value</FieldLabel>
        <Input
          value={(data.newValue as string) ?? ""}
          onChange={(e) => update("newValue", e.target.value)}
          className="h-7 text-xs"
          placeholder="e.g. high_risk"
        />
      </div>
    </SectionCard>
  );
}

export function TagManagementForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Tag management" helper="Add or remove a tag/label on the profile.">
      <div>
        <FieldLabel>Action</FieldLabel>
        <NS value={(data.tagAction as string) ?? "add"} onChange={(v) => update("tagAction", v)}>
          <option value="add">Add tag</option>
          <option value="remove">Remove tag</option>
        </NS>
      </div>
      <div>
        <FieldLabel>Tag group</FieldLabel>
        <NS value={(data.tagGroup as string) ?? ""} onChange={(v) => update("tagGroup", v)}>
          <option value="">Select group...</option>
          {TAG_GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </NS>
      </div>
      <div>
        <FieldLabel>Tag value</FieldLabel>
        <Input
          value={(data.tagValue as string) ?? ""}
          onChange={(e) => update("tagValue", e.target.value)}
          className="h-7 text-xs"
          placeholder="e.g. tier_gold"
        />
      </div>
    </SectionCard>
  );
}

export function ConsentManagementForm({ data, update }: BlockConfigFormProps) {
  const CHANNEL_OPTIONS = ["Email", "SMS", "WhatsApp", "AI Call"];
  const DNC_SOURCE_OPTIONS = ["Lender DNC", "Regulatory DNC", "Internal DNC"];
  const VIOLATION_ACTIONS: { k: string; label: string }[] = [
    { k: "exit", label: "Exit journey" },
    { k: "fallback", label: "Route to fallback branch" },
    { k: "skip", label: "Skip this step" },
  ];

  const channelScope =
    (data.channelScope as string[]) ?? ["Email", "SMS", "WhatsApp", "AI Call"];
  const dncSources = (data.dncSources as string[]) ?? ["Regulatory DNC"];
  const violationAction = (data.violationAction as string) ?? "exit";

  const toggleChannel = (ch: string) => {
    const next = channelScope.includes(ch)
      ? channelScope.filter((c) => c !== ch)
      : [...channelScope, ch];
    update("channelScope", next);
  };
  const toggleDnc = (src: string) => {
    const next = dncSources.includes(src)
      ? dncSources.filter((c) => c !== src)
      : [...dncSources, src];
    update("dncSources", next);
  };

  return (
    <SectionCard
      title="Consent / DNC"
      helper="Two outgoing edges: 'Allowed' and 'Blocked / Exit'. Choosing 'Route to fallback branch' adds a third edge labelled 'Consent blocked'."
    >
      <div>
        <FieldLabel>Channel scope</FieldLabel>
        <div className="flex flex-wrap gap-1">
          {CHANNEL_OPTIONS.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => toggleChannel(ch)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                channelScope.includes(ch)
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Required consent state</FieldLabel>
        <NS
          value={(data.requiredConsent as string) ?? "Full"}
          onChange={(v) => update("requiredConsent", v)}
        >
          <option value="Full">Full</option>
          <option value="Restricted (must include)">Restricted (must include)</option>
        </NS>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Channel passes the gate only if borrower consent is at least this level.
        </p>
      </div>

      <div>
        <FieldLabel>DNC list source</FieldLabel>
        <div className="flex flex-wrap gap-1">
          {DNC_SOURCE_OPTIONS.map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => toggleDnc(src)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                dncSources.includes(src)
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Action on violation</FieldLabel>
        <div className="flex flex-wrap gap-1">
          {VIOLATION_ACTIONS.map((a) => (
            <button
              key={a.k}
              type="button"
              onClick={() => update("violationAction", a.k)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                violationAction === a.k
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

export function CatalogLookupForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Catalog lookup" helper="Retrieve a value from a reference catalog.">
      <div>
        <FieldLabel>Catalog</FieldLabel>
        <NS value={(data.catalog as string) ?? ""} onChange={(v) => update("catalog", v)}>
          <option value="">Select catalog...</option>
          {CATALOGS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NS>
      </div>
      <div>
        <FieldLabel>Lookup field</FieldLabel>
        <Input
          value={(data.lookupField as string) ?? ""}
          onChange={(e) => update("lookupField", e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder="offer_id"
        />
      </div>
      <div>
        <FieldLabel>Default value</FieldLabel>
        <Input
          value={(data.lookupDefault as string) ?? ""}
          onChange={(e) => update("lookupDefault", e.target.value)}
          className="h-7 text-xs"
        />
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  ===== INTEGRATIONS =====                                          */
/* ------------------------------------------------------------------ */

export function CallApiForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Call API / Webhook" helper="Call an external system and branch on Success/Timeout.">
      <div className="grid grid-cols-[1fr_90px] gap-2">
        <div>
          <FieldLabel>URL</FieldLabel>
          <Input
            value={(data.url as string) ?? ""}
            onChange={(e) => update("url", e.target.value)}
            className="h-7 text-xs"
            placeholder="https://api.example.com"
          />
        </div>
        <div>
          <FieldLabel>Method</FieldLabel>
          <NS value={(data.method as string) ?? "POST"} onChange={(v) => update("method", v)}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </NS>
        </div>
      </div>
      <div>
        <FieldLabel>Headers (JSON)</FieldLabel>
        <Textarea
          value={(data.headers as string) ?? ""}
          onChange={(e) => update("headers", e.target.value)}
          className="min-h-[50px] font-mono text-[10px]"
          placeholder='{ "Authorization": "Bearer ..." }'
        />
      </div>
      <div>
        <FieldLabel>Body template</FieldLabel>
        <Textarea
          value={(data.body as string) ?? ""}
          onChange={(e) => update("body", e.target.value)}
          className="min-h-[50px] font-mono text-[10px]"
          placeholder='{ "user_id": "{borrower.id}" }'
        />
      </div>
      <div>
        <FieldLabel>Timeout (ms)</FieldLabel>
        <Input
          type="number"
          value={(data.timeout as number) ?? 5000}
          onChange={(e) => update("timeout", Number(e.target.value))}
          className="h-7 text-xs"
          min={500}
        />
      </div>
    </SectionCard>
  );
}

export function JourneyHandoffForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Journey handoff" helper="Hand off the user to another journey.">
      <div>
        <FieldLabel>Target journey</FieldLabel>
        <NS value={(data.targetJourney as string) ?? ""} onChange={(v) => update("targetJourney", v)}>
          <option value="">Select journey...</option>
          {JOURNEYS.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </NS>
      </div>
      <label className="flex items-center justify-between">
        <span className="text-xs text-foreground">Exit current journey after handoff</span>
        <Switch
          checked={(data.exitAfter as boolean) ?? true}
          onCheckedChange={(val) => update("exitAfter", val)}
          size="sm"
        />
      </label>
    </SectionCard>
  );
}

export function AudienceSyncForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Audience sync" helper="Sync the user to an ad platform or external audience.">
      <div>
        <FieldLabel>Destination</FieldLabel>
        <NS value={(data.destination as string) ?? "meta"} onChange={(v) => update("destination", v)}>
          <option value="meta">Meta Ads</option>
          <option value="google">Google Ads</option>
          <option value="tiktok">TikTok Ads</option>
          <option value="snowflake">Snowflake</option>
        </NS>
      </div>
      <div>
        <FieldLabel>Sync mode</FieldLabel>
        <NS value={(data.syncMode as string) ?? "add"} onChange={(v) => update("syncMode", v)}>
          <option value="add">Add to audience</option>
          <option value="remove">Remove from audience</option>
        </NS>
      </div>
    </SectionCard>
  );
}

export function CustomActionForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Custom action" helper="Invoke a reusable business action registered in your workspace.">
      <div>
        <FieldLabel>Action ID</FieldLabel>
        <Input
          value={(data.actionId as string) ?? ""}
          onChange={(e) => update("actionId", e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder="generate_ptp_link"
        />
      </div>
      <div>
        <FieldLabel>Parameters (JSON)</FieldLabel>
        <Textarea
          value={(data.params as string) ?? ""}
          onChange={(e) => update("params", e.target.value)}
          className="min-h-[70px] font-mono text-[10px]"
          placeholder='{ "amount": "{outstanding_amount}" }'
        />
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  ===== CONVERSATIONAL =====                                        */
/* ------------------------------------------------------------------ */

export function TransferChatForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Transfer to chat agent" helper="Hand the conversation to a live chat agent.">
      <div>
        <FieldLabel>Team</FieldLabel>
        <NS value={(data.team as string) ?? "general"} onChange={(v) => update("team", v)}>
          <option value="general">General</option>
          <option value="high_value">High value</option>
          <option value="arabic">Arabic speaking</option>
          <option value="legal">Legal</option>
        </NS>
      </div>
      <div>
        <FieldLabel>Priority</FieldLabel>
        <NS value={(data.priority as string) ?? "Medium"} onChange={(v) => update("priority", v)}>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </NS>
      </div>
      <div>
        <FieldLabel>Wait message</FieldLabel>
        <Input
          value={(data.waitMessage as string) ?? ""}
          onChange={(e) => update("waitMessage", e.target.value)}
          className="h-7 text-xs"
          placeholder="An agent will be with you shortly"
        />
      </div>
    </SectionCard>
  );
}

export function TransferCallForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Transfer to call agent" helper="Warm-transfer the call to a live agent.">
      <div>
        <FieldLabel>Team</FieldLabel>
        <NS value={(data.team as string) ?? "general"} onChange={(v) => update("team", v)}>
          <option value="general">General</option>
          <option value="high_value">High value</option>
          <option value="arabic">Arabic speaking</option>
        </NS>
      </div>
      <div>
        <FieldLabel>Required skills</FieldLabel>
        <Input
          value={(data.skills as string) ?? ""}
          onChange={(e) => update("skills", e.target.value)}
          className="h-7 text-xs"
          placeholder="arabic, collections_l2"
        />
      </div>
      <div>
        <FieldLabel>Max wait (s)</FieldLabel>
        <Input
          type="number"
          value={(data.maxWait as number) ?? 60}
          onChange={(e) => update("maxWait", Number(e.target.value))}
          className="h-7 text-xs"
          min={5}
        />
      </div>
    </SectionCard>
  );
}

export function TransferVoiceAppForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Transfer to voice app" helper="Route the call into a voice application / IVR.">
      <div>
        <FieldLabel>App ID</FieldLabel>
        <Input
          value={(data.appId as string) ?? ""}
          onChange={(e) => update("appId", e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder="voiceapp_collections_ivr"
        />
      </div>
      <div>
        <FieldLabel>Initial parameters (JSON)</FieldLabel>
        <Textarea
          value={(data.initialParams as string) ?? ""}
          onChange={(e) => update("initialParams", e.target.value)}
          className="min-h-[60px] font-mono text-[10px]"
        />
      </div>
    </SectionCard>
  );
}

export function StartChatbotForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Start chatbot" helper="Move the user into a chatbot session.">
      <div>
        <FieldLabel>Bot ID</FieldLabel>
        <Input
          value={(data.botId as string) ?? ""}
          onChange={(e) => update("botId", e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder="collections_bot"
        />
      </div>
      <div>
        <FieldLabel>Initial state</FieldLabel>
        <Input
          value={(data.initialState as string) ?? ""}
          onChange={(e) => update("initialState", e.target.value)}
          className="h-7 text-xs"
          placeholder="greet_overdue"
        />
      </div>
      <div>
        <FieldLabel>Variables to pass (JSON)</FieldLabel>
        <Textarea
          value={(data.botVars as string) ?? ""}
          onChange={(e) => update("botVars", e.target.value)}
          className="min-h-[60px] font-mono text-[10px]"
          placeholder='{ "dpd": "{account.dpd}" }'
        />
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  ===== AI & OPTIMIZATION =====                                     */
/* ------------------------------------------------------------------ */

export function AIAgentForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="AI agent step" helper="Run an AI agent with a prompt and route based on the output.">
      <div>
        <FieldLabel>Agent type</FieldLabel>
        <NS value={(data.agentType as string) ?? "classifier"} onChange={(v) => update("agentType", v)}>
          <option value="classifier">Classifier</option>
          <option value="generator">Generator</option>
          <option value="summarizer">Summarizer</option>
          <option value="tool_user">Tool-using agent</option>
        </NS>
      </div>
      <div>
        <FieldLabel>Prompt template</FieldLabel>
        <Textarea
          value={(data.prompt as string) ?? ""}
          onChange={(e) => update("prompt", e.target.value)}
          className="min-h-[70px] text-xs"
          placeholder="Classify this borrower's response: {inbound.text}"
        />
      </div>
      <div>
        <FieldLabel>Max tokens</FieldLabel>
        <Input
          type="number"
          value={(data.maxTokens as number) ?? 256}
          onChange={(e) => update("maxTokens", Number(e.target.value))}
          className="h-7 text-xs"
          min={32}
        />
      </div>
    </SectionCard>
  );
}

export function ContentOptimizerForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Content optimizer" helper="Automatically pick the best-performing creative variant.">
      <div>
        <FieldLabel>Content variants (one per line)</FieldLabel>
        <Textarea
          value={(data.variants as string) ?? ""}
          onChange={(e) => update("variants", e.target.value)}
          className="min-h-[80px] text-xs"
          placeholder="Friendly nudge&#10;Urgent reminder&#10;Settlement offer"
        />
      </div>
      <div>
        <FieldLabel>Optimization metric</FieldLabel>
        <NS value={(data.metric as string) ?? "conversion"} onChange={(v) => update("metric", v)}>
          <option value="conversion">Conversion rate</option>
          <option value="open">Open rate</option>
          <option value="click">Click rate</option>
          <option value="reply">Reply rate</option>
        </NS>
      </div>
    </SectionCard>
  );
}

export function ExperimentForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Experiment / A-B test" helper="Run a rigorous experiment with control group.">
      <div>
        <FieldLabel>Variants (up to 4)</FieldLabel>
        <div className="space-y-1.5">
          {[0, 1, 2, 3].map((i) => (
            <Input
              key={i}
              value={((data[`variant${i}`] as string) ?? "")}
              onChange={(e) => update(`variant${i}`, e.target.value)}
              className="h-7 text-xs"
              placeholder={`Variant ${String.fromCharCode(65 + i)}`}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Sample size</FieldLabel>
          <Input
            type="number"
            value={(data.sampleSize as number) ?? 1000}
            onChange={(e) => update("sampleSize", Number(e.target.value))}
            className="h-7 text-xs"
            min={10}
          />
        </div>
        <div>
          <FieldLabel>Confidence %</FieldLabel>
          <Input
            type="number"
            value={(data.confidence as number) ?? 95}
            onChange={(e) => update("confidence", Number(e.target.value))}
            className="h-7 text-xs"
            min={50}
            max={99}
          />
        </div>
      </div>
    </SectionCard>
  );
}

export function FeatureFlagForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Feature flag" helper="Assign or evaluate a feature flag for this user.">
      <div>
        <FieldLabel>Flag name</FieldLabel>
        <Input
          value={(data.flagName as string) ?? ""}
          onChange={(e) => update("flagName", e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder="new_dunning_flow"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Default</FieldLabel>
          <NS value={(data.flagDefault as string) ?? "off"} onChange={(v) => update("flagDefault", v)}>
            <option value="on">On</option>
            <option value="off">Off</option>
          </NS>
        </div>
        <div>
          <FieldLabel>Rollout %</FieldLabel>
          <Input
            type="number"
            value={(data.rollout as number) ?? 50}
            onChange={(e) => update("rollout", Number(e.target.value))}
            className="h-7 text-xs"
            min={0}
            max={100}
          />
        </div>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  ===== EXIT / GOVERNANCE =====                                     */
/* ------------------------------------------------------------------ */

export function GlobalExitForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Global exit trigger manager" helper="Users matching these conditions are removed immediately.">
      <div>
        <FieldLabel>Exit conditions</FieldLabel>
        <Textarea
          value={(data.exitConditions as string) ?? ""}
          onChange={(e) => update("exitConditions", e.target.value)}
          className="min-h-[70px] text-xs"
          placeholder="payment_received AND dpd = 0"
        />
      </div>
      <label className="flex items-center justify-between">
        <span className="text-xs text-foreground">Override all node-level rules</span>
        <Switch
          checked={(data.overrideAll as boolean) ?? true}
          onCheckedChange={(val) => update("overrideAll", val)}
          size="sm"
        />
      </label>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Dispatch                                                           */
/* ------------------------------------------------------------------ */

/**
 * Given a blockType id, return the specific config form component.
 * Returns null if the block has no specialised form (caller should show
 * an "empty state" or a legacy rich config).
 */
export function getBlockConfigForm(
  blockType: string | undefined
): React.ComponentType<BlockConfigFormProps> | null {
  if (!blockType) return null;
  const map: Record<string, React.ComponentType<BlockConfigFormProps>> = {
    // triggers
    event_trigger: EventTriggerForm,
    segment_trigger: SegmentMembershipForm,
    profile_change_trigger: ProfileChangeTriggerForm,
    datetime_trigger: DateTimeTriggerForm,
    specific_users_trigger: SpecificUsersForm,
    geofence_trigger: GeofenceTriggerForm,
    inbound_message_trigger: InboundMessageTriggerForm,
    incoming_call_trigger: IncomingCallTriggerForm,
    external_source_trigger: ExternalSourceTriggerForm,
    journey_handoff_entry: JourneyHandoffEntryForm,

    // channels (not covered by rich legacy forms)
    send_push: MobilePushForm,
    send_web_push: WebPushForm,
    show_inapp: InAppMessageForm,
    show_onsite: OnsiteContentForm,
    send_rich_media: RichMediaForm,
    notify_internal: NotifyInternalForm,

    // conditions
    decision_split: DecisionSplitForm,
    // Conditional Switch (Command block) — reuses Profile-Check-style multi-branch form
    conditional_switch: ProfileCheckForm,
    audience_split: AudienceSplitForm,
    action_path: ActionPathSplitForm,
    has_done_event: HasDoneEventForm,
    profile_check: ProfileCheckForm,
    reachability_check: ReachabilityCheckForm,
    best_channel: BestChannelForm,
    inbound_evaluator: InboundEvaluatorForm,

    // flow controls
    wait_until_date: WaitUntilDateForm,
    wait_time_slots: WaitTimeSlotsForm,
    wait_for_event: WaitForEventForm,
    wait_profile_change: WaitProfileChangeForm,
    pause: PauseHoldForm,
    // Command's Pause / Hold (renamed from the descoped `pause` type)
    pause_hold: PauseHoldForm,
    traffic_split: TrafficSplitForm,
    end_journey: EndJourneyForm,

    // data
    context_variable: ContextVariableForm,
    update_variable: UpdateVariableForm,
    update_profile: UpdateProfileForm,
    tag_management: TagManagementForm,
    consent_management: ConsentManagementForm,
    // Command splits Consent/DNC into two: DNC Gate (a condition) + Add to DNC (a mutation).
    dnc_gate: ReachabilityCheckForm,
    add_to_dnc: ConsentManagementForm,
    catalog_lookup: CatalogLookupForm,

    // integrations
    call_api: CallApiForm,
    flow_handoff: JourneyHandoffForm,
    audience_sync: AudienceSyncForm,
    custom_action: CustomActionForm,

    // conversational
    transfer_chat: TransferChatForm,
    transfer_call: TransferCallForm,
    transfer_voice_app: TransferVoiceAppForm,
    start_chatbot: StartChatbotForm,

    // ai
    ai_agent: AIAgentForm,
    content_optimizer: ContentOptimizerForm,
    experiment: ExperimentForm,
    feature_flag: FeatureFlagForm,

    // exit
    global_exit: GlobalExitForm,
  };
  return map[blockType] ?? null;
}
