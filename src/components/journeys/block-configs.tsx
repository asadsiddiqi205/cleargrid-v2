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

export interface BlockConfigFormProps {
  data: D;
  update: (key: string, value: unknown) => void;
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

export function EventTriggerForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Event trigger" helper="Start the journey when a user performs a specific event.">
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
          <FieldLabel>Frequency</FieldLabel>
          <NS value={(data.frequency as string) ?? "once"} onChange={(v) => update("frequency", v)}>
            <option value="once">Once</option>
            <option value="every">Every time</option>
          </NS>
        </div>
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
      </div>
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
  return (
    <SectionCard title="Profile attribute change" helper="Start when a profile attribute changes.">
      <div>
        <FieldLabel>Attribute</FieldLabel>
        <NS value={(data.attribute as string) ?? ""} onChange={(v) => update("attribute", v)}>
          <option value="">Select attribute...</option>
          {ATTRIBUTES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </NS>
      </div>
      <div>
        <FieldLabel>Operator</FieldLabel>
        <NS value={(data.operator as string) ?? "changes"} onChange={(v) => update("operator", v)}>
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
    </SectionCard>
  );
}

export function DateTimeTriggerForm({ data, update }: BlockConfigFormProps) {
  const mode = (data.dateMode as string) ?? "specific";
  return (
    <SectionCard title="Date / time trigger" helper="Run on a specific date/time or a recurring schedule.">
      <div>
        <FieldLabel>Mode</FieldLabel>
        <NS value={mode} onChange={(v) => update("dateMode", v)}>
          <option value="specific">Specific date</option>
          <option value="recurring">Recurring</option>
        </NS>
      </div>
      {mode === "specific" ? (
        <div>
          <FieldLabel>Date & time</FieldLabel>
          <Input
            type="datetime-local"
            value={(data.dateTime as string) ?? ""}
            onChange={(e) => update("dateTime", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>Day of week</FieldLabel>
            <NS value={(data.dayOfWeek as string) ?? "Mon"} onChange={(v) => update("dayOfWeek", v)}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </NS>
          </div>
          <div>
            <FieldLabel>Time</FieldLabel>
            <Input
              type="time"
              value={(data.timeOfDay as string) ?? "09:00"}
              onChange={(e) => update("timeOfDay", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>
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

export function ActionPathSplitForm({ data, update }: BlockConfigFormProps) {
  return (
    <SectionCard title="Action path split" helper="Route based on which action the user took.">
      <div>
        <FieldLabel>Action type</FieldLabel>
        <NS value={(data.actionCheck as string) ?? "click"} onChange={(v) => update("actionCheck", v)}>
          <option value="click">Clicked</option>
          <option value="open">Opened</option>
          <option value="dismiss">Dismissed</option>
          <option value="none">No action</option>
        </NS>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Window</FieldLabel>
          <Input
            type="number"
            value={(data.actionWindow as number) ?? 24}
            onChange={(e) => update("actionWindow", Number(e.target.value))}
            className="h-7 text-xs"
            min={1}
          />
        </div>
        <div>
          <FieldLabel>Unit</FieldLabel>
          <NS value={(data.actionWindowUnit as string) ?? "hours"} onChange={(v) => update("actionWindowUnit", v)}>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </NS>
        </div>
      </div>
    </SectionCard>
  );
}

export function HasDoneEventForm({ data, update }: BlockConfigFormProps) {
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
      <div className="grid grid-cols-3 gap-2">
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
        <div>
          <FieldLabel>Min count</FieldLabel>
          <Input
            type="number"
            value={(data.minCount as number) ?? 1}
            onChange={(e) => update("minCount", Number(e.target.value))}
            className="h-7 text-xs"
            min={1}
          />
        </div>
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
  return (
    <SectionCard title="Best channel" helper="Pick the best reachable channel using a sort criterion.">
      <div>
        <FieldLabel>Sort by</FieldLabel>
        <NS value={(data.sortBy as string) ?? "open_rate"} onChange={(v) => update("sortBy", v)}>
          <option value="open_rate">Highest open rate</option>
          <option value="recent">Recent activity</option>
          <option value="response">Response rate</option>
          <option value="conversion">Conversion rate</option>
        </NS>
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
  return (
    <SectionCard title="Wait for profile change" helper="Block users until a profile attribute changes.">
      <div>
        <FieldLabel>Attribute</FieldLabel>
        <NS value={(data.attribute as string) ?? ""} onChange={(v) => update("attribute", v)}>
          <option value="">Select attribute...</option>
          {ATTRIBUTES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </NS>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Timeout (h)</FieldLabel>
          <Input
            type="number"
            value={(data.timeout as number) ?? 24}
            onChange={(e) => update("timeout", Number(e.target.value))}
            className="h-7 text-xs"
            min={1}
          />
        </div>
        <div>
          <FieldLabel>Fallback</FieldLabel>
          <NS value={(data.fallback as string) ?? "continue"} onChange={(v) => update("fallback", v)}>
            <option value="continue">Continue</option>
            <option value="exit">Exit journey</option>
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
          <FieldLabel>Duration</FieldLabel>
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
          </NS>
        </div>
      </div>
      <label className="flex items-center justify-between">
        <span className="text-xs text-foreground">Allow manual resume</span>
        <Switch
          checked={(data.allowManualResume as boolean) ?? true}
          onCheckedChange={(val) => update("allowManualResume", val)}
          size="sm"
        />
      </label>
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
          sum === 100 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
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
        <FieldLabel>Outcome tag</FieldLabel>
        <NS value={(data.outcome as string) ?? "Completed"} onChange={(v) => update("outcome", v)}>
          <option value="Completed">Completed</option>
          <option value="Converted">Converted</option>
          <option value="Exhausted">Exhausted</option>
          <option value="Unresponsive">Unresponsive</option>
          <option value="Exited">Exited</option>
        </NS>
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
  return (
    <SectionCard title="Consent / DNC" helper="Manage consent flags per channel.">
      <div>
        <FieldLabel>Channel</FieldLabel>
        <NS value={(data.consentChannel as string) ?? "email"} onChange={(v) => update("consentChannel", v)}>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="call">Voice</option>
          <option value="all">All channels</option>
        </NS>
      </div>
      <div>
        <FieldLabel>State</FieldLabel>
        <NS value={(data.consentState as string) ?? "granted"} onChange={(v) => update("consentState", v)}>
          <option value="granted">Granted</option>
          <option value="revoked">Revoked</option>
        </NS>
      </div>
      <div>
        <FieldLabel>Reason</FieldLabel>
        <Input
          value={(data.consentReason as string) ?? ""}
          onChange={(e) => update("consentReason", e.target.value)}
          className="h-7 text-xs"
          placeholder="User requested"
        />
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

    // channels (not covered by rich legacy forms)
    send_push: MobilePushForm,
    send_web_push: WebPushForm,
    show_inapp: InAppMessageForm,
    show_onsite: OnsiteContentForm,
    send_rich_media: RichMediaForm,
    notify_internal: NotifyInternalForm,

    // conditions
    decision_split: DecisionSplitForm,
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
    traffic_split: TrafficSplitForm,
    end_journey: EndJourneyForm,

    // data
    context_variable: ContextVariableForm,
    update_variable: UpdateVariableForm,
    update_profile: UpdateProfileForm,
    tag_management: TagManagementForm,
    consent_management: ConsentManagementForm,
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
