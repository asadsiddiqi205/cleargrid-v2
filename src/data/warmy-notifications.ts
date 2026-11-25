/**
 * Warmy in-app notifications.
 *
 * Webhook events arrive on the backend (the Warmy Notification Hub
 * posts to the webhook URL shown in the Warmy drawer). The backend
 * fans them out to sender-profile admins and to the owners of live
 * journeys whose profiles use the affected domain. On the frontend
 * we keep a simple persisted ring so the bell in the top bar is never
 * empty in the prototype.
 *
 * TODO (data contracts):
 *  [N1] subscribeNotifications(userId) → streaming feed
 *       Returns new notifications as they arrive. Here the shadow
 *       updates in place and the hook polls listNotifications().
 *  [N2] fanOutWebhookEvent(event, { profileIds, journeyIds }) → void
 *       Backend fan-out. On the frontend we create one notification
 *       per event and let every reader see it.
 *  [N3] markNotificationRead(id, userId) → void
 */

import {
  devPushSampleEvent,
  listSyncEvents,
  type AlertKey,
  type WebhookEvent,
} from "@/data/warmy"

export type NotificationSeverity = "info" | "warning" | "error"

export interface WarmyNotification {
  id: string
  at: string
  severity: NotificationSeverity
  title: string
  detail: string
  domain: string
  read: boolean
  event?: WebhookEvent
}

const listeners = new Set<() => void>()
const store: WarmyNotification[] = []

function emit() {
  for (const l of listeners) l()
}

function severityForEvent(e: WebhookEvent): NotificationSeverity {
  switch (e.kind) {
    case "alert_issue":
      return e.alert_status === "success" ? "info" : "error"
    case "sending_block":
    case "bounce_guard_blocked":
      return "error"
    case "warmup_paused":
    case "bounce_guard_stopped":
    case "connection_failed":
      return "warning"
    default:
      return "info"
  }
}

function titleFor(e: WebhookEvent): string {
  switch (e.kind) {
    case "alert_issue":
      return `${e.domain}: ${(e.alert_key ?? "alert").replace(/_/g, " ")}`
    case "sending_block":
      return `${e.domain} · mailbox blocked`
    case "warmup_paused":
      return `${e.domain} · warm-up paused`
    case "bounce_guard_blocked":
      return `${e.domain} · bounce guard blocked`
    case "bounce_guard_stopped":
      return `${e.domain} · bounce guard paused warm-up`
    case "connection_failed":
      return `${e.domain} · connection failed`
    default:
      return e.message
  }
}

function fromEvent(e: WebhookEvent): WarmyNotification {
  return {
    id: `n-${e.id}`,
    at: e.at,
    severity: severityForEvent(e),
    title: titleFor(e),
    detail: e.message,
    domain: e.domain,
    read: false,
    event: e,
  }
}

/** Seed with every webhook event the mock already carries. */
for (const e of listSyncEvents()) {
  store.push(fromEvent(e))
}

export function listNotifications(): WarmyNotification[] {
  return [...store].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

export function unreadCount(): number {
  return store.filter((n) => !n.read).length
}

export function markAllRead(): void {
  for (const n of store) n.read = true
  emit()
}

export function markOneRead(id: string): void {
  const n = store.find((x) => x.id === id)
  if (n) n.read = true
  emit()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/* ────────────────────── Dev-only event fire ────────────────────── */

const DEV_SAMPLES: Array<{
  label: string
  input: Omit<WebhookEvent, "id" | "at">
}> = [
  {
    label: "Gmail rejects mashreq.com",
    input: {
      kind: "alert_issue",
      domain: "mashreq.com",
      alert_key: "reject_domain_by_gmail" as AlertKey,
      alert_status: "not completed",
      message: "Gmail rejected the domain after a reputation drop.",
    },
  },
  {
    label: "cleargrid.ae runs out of Gmail volume",
    input: {
      kind: "sending_block",
      domain: "cleargrid.ae",
      mailbox: "collections@cleargrid.ae",
      message: "Mailbox throttled — daily Gmail volume reached.",
    },
  },
  {
    label: "tamara.co bounce guard paused",
    input: {
      kind: "bounce_guard_stopped",
      domain: "tamara.co",
      mailbox: "care@tamara.co",
      resume_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      message: "Bounce guard paused warm-up for 2 h.",
    },
  },
]

export function listDevSamples() {
  return DEV_SAMPLES
}

export function fireSampleEvent(index: number): WarmyNotification | null {
  const sample = DEV_SAMPLES[index]
  if (!sample) return null
  const event = devPushSampleEvent(sample.input)
  const n = fromEvent(event)
  store.unshift(n)
  emit()
  return n
}
