/**
 * Part 6.4 — Event trigger catalog.
 *
 * Metadata for every event surfaced in the Event Trigger dropdown. Powers
 * the inline info-icon tooltips ("What triggers this event", origin, payload
 * fields).
 *
 * Hardcoded here for the prototype. Production reads from a real event
 * registry.
 */

export type EventOrigin = "webhook" | "portal_action" | "sdk_event" | "ai_call_event" | "system"

export interface EventPayloadField {
  name: string
  type: "string" | "number" | "boolean" | "iso_date" | "object"
  description?: string
}

export interface EventTriggerDefinition {
  id: string
  label: string
  origin: EventOrigin
  description: string
  payload: EventPayloadField[]
}

const IDENTITY_FIELDS: EventPayloadField[] = [
  { name: "deal_id", type: "string", description: "The deal instance the event applies to." },
  { name: "borrower_id", type: "string" },
  { name: "lender_id", type: "string" },
  { name: "occurred_at", type: "iso_date" },
]

export const EVENT_TRIGGER_CATALOG: EventTriggerDefinition[] = [
  {
    id: "payment_received",
    label: "Payment Received",
    origin: "webhook",
    description:
      "Fires when a payment webhook is received from a payment gateway (Checkout.com, Amazon PS, or a bank direct debit).",
    payload: [
      ...IDENTITY_FIELDS,
      { name: "amount", type: "number", description: "Amount received in the deal's currency." },
      { name: "currency", type: "string", description: "ISO 4217, e.g. AED, SAR." },
      { name: "payment_method", type: "string", description: "card / bank_transfer / wallet." },
      { name: "reference", type: "string", description: "Gateway reference id." },
    ],
  },
  {
    id: "payment_failed",
    label: "Payment Failed",
    origin: "webhook",
    description:
      "Fires when a payment attempt fails at the gateway. Also fires for direct-debit dishonour returns.",
    payload: [
      ...IDENTITY_FIELDS,
      { name: "reason_code", type: "string" },
      { name: "attempted_amount", type: "number" },
    ],
  },
  {
    id: "ptp_captured",
    label: "PTP Captured",
    origin: "ai_call_event",
    description: "Fires when an AI Call node captures a promise-to-pay from the borrower.",
    payload: [
      ...IDENTITY_FIELDS,
      { name: "ptp_date", type: "iso_date" },
      { name: "ptp_amount", type: "number" },
      { name: "channel", type: "string", description: "voice / whatsapp / chat" },
    ],
  },
  {
    id: "ptp_broken",
    label: "PTP Broken",
    origin: "system",
    description:
      "Fires when a previously captured PTP passes its ptp_date without a matching payment being received.",
    payload: [
      ...IDENTITY_FIELDS,
      { name: "ptp_amount", type: "number" },
      { name: "ptp_date", type: "iso_date" },
      { name: "days_since_ptp", type: "number" },
    ],
  },
  {
    id: "dispute_raised",
    label: "Dispute Raised",
    origin: "ai_call_event",
    description:
      "Fires when an AI Call node detects a dispute from the borrower, or the borrower opens a dispute via the portal.",
    payload: [
      ...IDENTITY_FIELDS,
      { name: "dispute_reason", type: "string" },
      { name: "captured_by", type: "string", description: "ai_call / portal / manual." },
    ],
  },
  {
    id: "callback_requested",
    label: "Callback Requested",
    origin: "ai_call_event",
    description:
      "Fires when an AI Call node captures a callback intent from the borrower. Populates callback_date / callback_time on the deal.",
    payload: [
      ...IDENTITY_FIELDS,
      { name: "callback_date", type: "iso_date" },
      { name: "callback_time", type: "string", description: "HH:mm in borrower's local tz." },
    ],
  },
  {
    id: "dnc_added",
    label: "DNC Added",
    origin: "portal_action",
    description:
      "Fires when the borrower's primary channel is added to DNC — via portal opt-out link, an inbound STOP, or an ops action.",
    payload: [
      ...IDENTITY_FIELDS,
      { name: "channel", type: "string", description: "email / sms / whatsapp / phone." },
      { name: "source", type: "string", description: "portal / inbound / ops." },
    ],
  },
  {
    id: "attribute_changed",
    label: "Attribute Changed",
    origin: "system",
    description:
      "Fires when a specified borrower/deal attribute changes value. Used by Segment Membership and Profile Attribute Change triggers.",
    payload: [
      ...IDENTITY_FIELDS,
      { name: "attribute", type: "string" },
      { name: "previous_value", type: "string" },
      { name: "new_value", type: "string" },
    ],
  },
  {
    id: "settlement_accepted",
    label: "Settlement Accepted",
    origin: "portal_action",
    description: "Fires when the borrower accepts a settlement offer via the borrower portal.",
    payload: [
      ...IDENTITY_FIELDS,
      { name: "settlement_amount", type: "number" },
      { name: "discount_pct", type: "number" },
    ],
  },
  {
    id: "inbound_message",
    label: "Inbound Message",
    origin: "webhook",
    description:
      "Fires when the borrower sends an inbound email, SMS, or WhatsApp. Feeds Inbound Message triggers + Command Processing.",
    payload: [
      ...IDENTITY_FIELDS,
      { name: "channel", type: "string", description: "email / sms / whatsapp." },
      { name: "body", type: "string" },
      { name: "intent", type: "string", description: "Detected intent, e.g. dispute / ptp / opt_out." },
    ],
  },
  {
    id: "incoming_call",
    label: "Incoming Call",
    origin: "webhook",
    description:
      "Fires when an inbound call is received on a lender line and matched to a known borrower.",
    payload: [
      ...IDENTITY_FIELDS,
      { name: "from_number", type: "string" },
      { name: "answered_by", type: "string", description: "ai / human_agent / voicemail." },
    ],
  },
]

export function getEventDefinition(id: string): EventTriggerDefinition | undefined {
  return EVENT_TRIGGER_CATALOG.find((e) => e.id === id)
}
