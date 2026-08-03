/**
 * Journey blueprints — pre-built node graphs that hydrate the Journey Builder
 * canvas when the user lands from the Composer or a funnel-segment CTA.
 *
 * Each blueprint returns nodes + edges ready to be merged into React Flow.
 * The shapes match the existing canvas (node `type`: trigger | action |
 * decision | delay | endJourney; node `data` fields documented per kind).
 */

import { MarkerType } from "@xyflow/react"
import type { Edge, Node } from "@xyflow/react"

export type BlueprintId =
  | "none"
  | "reminder_3step"
  | "ptp_recovery"
  | "settlement_push"
  | "funnel"

export interface BlueprintOptions {
  /** Composed message channel — drives the first Send node's actionType. */
  channel?: "email" | "sms" | "whatsapp"
  /** Template name to display on the first Send node. */
  templateName?: string
  /** Audience description, used on the Trigger node. */
  audienceLabel?: string
  /** Funnel segment label, only used by the "funnel" blueprint. */
  segmentLabel?: string
}

/* ─────────── helpers ─────────── */

let _nodeCounter = 0
function nid(prefix: string): string {
  _nodeCounter += 1
  return `bp-${prefix}-${_nodeCounter}-${Math.random().toString(36).slice(2, 6)}`
}

function edge(source: string, target: string, label?: string): Edge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    type: "smoothstep",
    animated: true,
    label,
    style: { stroke: "var(--chart-2)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--chart-2)" },
  }
}

const channelLabel = {
  email: "Send Email",
  sms: "Send SMS",
  whatsapp: "Send WhatsApp",
}

/* ─────────── builder ─────────── */

export function buildBlueprint(
  blueprint: BlueprintId,
  opts: BlueprintOptions = {},
): { nodes: Node[]; edges: Edge[] } {
  const channel = opts.channel ?? "email"
  const templateName = opts.templateName ?? "Composer Draft"
  const audienceLabel = opts.audienceLabel ?? "Composer audience"
  const segmentLabel = opts.segmentLabel

  switch (blueprint) {
    case "none":
    case "funnel":
      return buildSimple({ channel, templateName, audienceLabel, segmentLabel })
    case "reminder_3step":
      return buildReminder3Step({ channel, templateName, audienceLabel })
    case "ptp_recovery":
      return buildPtpRecovery({ channel, templateName, audienceLabel })
    case "settlement_push":
      return buildSettlementPush({ channel, templateName, audienceLabel })
    default:
      return buildSimple({ channel, templateName, audienceLabel })
  }
}

/* ─────────── simple (trigger → send) ─────────── */

function buildSimple(opts: {
  channel: "email" | "sms" | "whatsapp"
  templateName: string
  audienceLabel: string
  segmentLabel?: string
}): { nodes: Node[]; edges: Edge[] } {
  const t = nid("trigger")
  const s = nid("send")
  const nodes: Node[] = [
    {
      id: t,
      type: "trigger",
      position: { x: 120, y: 200 },
      data: {
        label: opts.segmentLabel ? `Segment: ${opts.segmentLabel}` : "Segment Entry",
        description: opts.audienceLabel,
        triggerType: "segment_entry",
      },
    },
    {
      id: s,
      type: "action",
      position: { x: 460, y: 200 },
      data: {
        label: channelLabel[opts.channel],
        description: opts.templateName,
        actionType: opts.channel,
        template: opts.templateName,
      },
    },
  ]
  return { nodes, edges: [edge(t, s)] }
}

/* ─────────── 3-step reminder cadence ─────────── */

function buildReminder3Step(opts: {
  channel: "email" | "sms" | "whatsapp"
  templateName: string
  audienceLabel: string
}): { nodes: Node[]; edges: Edge[] } {
  const t = nid("trigger")
  const s1 = nid("send")
  const wait1 = nid("wait")
  const s2 = nid("send")
  const wait2 = nid("wait")
  const s3 = nid("send")
  const exit = nid("end")

  const nodes: Node[] = [
    {
      id: t,
      type: "trigger",
      position: { x: 80, y: 200 },
      data: {
        label: "Segment Entry",
        description: opts.audienceLabel,
        triggerType: "segment_entry",
      },
    },
    {
      id: s1,
      type: "action",
      position: { x: 360, y: 200 },
      data: {
        label: channelLabel[opts.channel],
        description: `${opts.templateName} (Day 0)`,
        actionType: opts.channel,
        template: opts.templateName,
      },
    },
    {
      id: wait1,
      type: "delay",
      position: { x: 640, y: 200 },
      data: { label: "Wait 3 days", duration: 3, unit: "days" },
    },
    {
      id: s2,
      type: "action",
      position: { x: 920, y: 200 },
      data: {
        label: "Send SMS",
        description: "Short reminder",
        actionType: "sms",
        template: `${opts.templateName} — SMS variant`,
      },
    },
    {
      id: wait2,
      type: "delay",
      position: { x: 1200, y: 200 },
      data: { label: "Wait 2 days", duration: 2, unit: "days" },
    },
    {
      id: s3,
      type: "action",
      position: { x: 1480, y: 200 },
      data: {
        label: channelLabel[opts.channel],
        description: "Final reminder",
        actionType: opts.channel,
        template: `${opts.templateName} — Final`,
      },
    },
    {
      id: exit,
      type: "endJourney",
      position: { x: 1760, y: 200 },
      data: { label: "End — Paid", outcome: "Paid" },
    },
  ]
  const edges: Edge[] = [
    edge(t, s1),
    edge(s1, wait1),
    edge(wait1, s2),
    edge(s2, wait2),
    edge(wait2, s3),
    edge(s3, exit),
  ]
  return { nodes, edges }
}

/* ─────────── PTP recovery branch ─────────── */

function buildPtpRecovery(opts: {
  channel: "email" | "sms" | "whatsapp"
  templateName: string
  audienceLabel: string
}): { nodes: Node[]; edges: Edge[] } {
  const t = nid("trigger")
  const s1 = nid("send")
  const wait = nid("wait")
  const dec = nid("decision")
  const sConfirm = nid("send")
  const endConfirm = nid("end")
  const sEsc = nid("send")
  const endEsc = nid("end")

  const nodes: Node[] = [
    {
      id: t,
      type: "trigger",
      position: { x: 80, y: 280 },
      data: { label: "Segment Entry", description: opts.audienceLabel, triggerType: "segment_entry" },
    },
    {
      id: s1,
      type: "action",
      position: { x: 360, y: 280 },
      data: {
        label: channelLabel[opts.channel],
        description: opts.templateName,
        actionType: opts.channel,
        template: opts.templateName,
      },
    },
    {
      id: wait,
      type: "delay",
      position: { x: 640, y: 280 },
      data: { label: "Wait 2 days", duration: 2, unit: "days" },
    },
    {
      id: dec,
      type: "decision",
      position: { x: 920, y: 280 },
      data: {
        label: "PTP captured?",
        attribute: "ptp_status",
        conditions: [{ operator: "equals", value: "active" }],
      },
    },
    {
      id: sConfirm,
      type: "action",
      position: { x: 1240, y: 140 },
      data: {
        label: "Send Email",
        description: "PTP confirmation",
        actionType: "email",
        template: "PTP Confirmation",
      },
    },
    {
      id: endConfirm,
      type: "endJourney",
      position: { x: 1520, y: 140 },
      data: { label: "End — PTP captured", outcome: "PTP" },
    },
    {
      id: sEsc,
      type: "action",
      position: { x: 1240, y: 420 },
      data: {
        label: "Trigger AI Call",
        description: "Escalation call · talk to borrower",
        actionType: "call",
        template: "Hardship outreach script",
      },
    },
    {
      id: endEsc,
      type: "endJourney",
      position: { x: 1520, y: 420 },
      data: { label: "End — Escalated", outcome: "Escalated" },
    },
  ]
  const edges: Edge[] = [
    edge(t, s1),
    edge(s1, wait),
    edge(wait, dec),
    edge(dec, sConfirm, "Yes"),
    edge(sConfirm, endConfirm),
    edge(dec, sEsc, "No"),
    edge(sEsc, endEsc),
  ]
  return { nodes, edges }
}

/* ─────────── Settlement push ─────────── */

function buildSettlementPush(opts: {
  channel: "email" | "sms" | "whatsapp"
  templateName: string
  audienceLabel: string
}): { nodes: Node[]; edges: Edge[] } {
  const t = nid("trigger")
  const s1 = nid("send")
  const wait1 = nid("wait")
  const s2 = nid("send")
  const wait2 = nid("wait")
  const call = nid("call")
  const exit = nid("end")

  const nodes: Node[] = [
    {
      id: t,
      type: "trigger",
      position: { x: 80, y: 200 },
      data: {
        label: "Segment Entry",
        description: opts.audienceLabel,
        triggerType: "segment_entry",
      },
    },
    {
      id: s1,
      type: "action",
      position: { x: 360, y: 200 },
      data: {
        label: channelLabel[opts.channel],
        description: "Settlement offer",
        actionType: opts.channel,
        template: opts.templateName,
      },
    },
    {
      id: wait1,
      type: "delay",
      position: { x: 640, y: 200 },
      data: { label: "Wait 5 days", duration: 5, unit: "days" },
    },
    {
      id: s2,
      type: "action",
      position: { x: 920, y: 200 },
      data: {
        label: channelLabel[opts.channel],
        description: "Settlement reminder",
        actionType: opts.channel,
        template: `${opts.templateName} — Reminder`,
      },
    },
    {
      id: wait2,
      type: "delay",
      position: { x: 1200, y: 200 },
      data: { label: "Wait 5 days", duration: 5, unit: "days" },
    },
    {
      id: call,
      type: "action",
      position: { x: 1480, y: 200 },
      data: {
        label: "Trigger AI Call",
        description: "Settlement walk-through · callback capture on",
        actionType: "call",
        template: "Settlement walk-through",
        callbackEnabled: true,
        callbackMaxPerBorrower: 3,
      },
    },
    {
      id: exit,
      type: "endJourney",
      position: { x: 1760, y: 200 },
      data: { label: "End — Settled", outcome: "Settled" },
    },
  ]
  const edges: Edge[] = [
    edge(t, s1),
    edge(s1, wait1),
    edge(wait1, s2),
    edge(s2, wait2),
    edge(wait2, call),
    edge(call, exit),
  ]
  return { nodes, edges }
}
