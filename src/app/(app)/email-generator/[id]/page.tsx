"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  MessageCircle,
  ExternalLink,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getMessageById, type MessageChannel } from "@/data/messages"
import { getRichTemplate, type SlotValues } from "@/data/rich-email-templates"
import { lenders } from "@/data/lenders"
import {
  MessageFunnelChart,
  MessageFunnelPills,
} from "@/components/composer/message-funnel"

const CHANNEL_LABEL: Record<MessageChannel, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
}
const CHANNEL_ICON: Record<MessageChannel, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
}

function getLenderName(id: string): string {
  if (id === "general") return "General"
  return lenders.find((l) => l.id === id)?.shortName ?? id
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function MessageDetailPage() {
  const params = useParams<{ id: string }>()
  const message = getMessageById(params.id)

  if (!message) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-center">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Message not found</p>
          <Link href="/email-generator" className="text-xs text-primary hover:underline">
            ← Back to all messages
          </Link>
        </div>
      </div>
    )
  }

  const Icon = CHANNEL_ICON[message.channel]
  const template = message.templateId ? getRichTemplate(message.templateId) : undefined
  const isSingle = message.audienceType === "single"
  const showFunnel = message.funnel && !isSingle
  const showPills = message.funnel && isSingle

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Top: breadcrumb + title */}
      <div className="space-y-3">
        <Link
          href="/email-generator"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          All messages
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {message.subject}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <Badge
                className={cn(
                  message.status === "sent" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
                  message.status === "scheduled" && "bg-amber-500/15 text-amber-400 border-amber-500/20",
                  message.status === "draft" && "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
                  message.status === "failed" && "bg-red-500/15 text-red-400 border-red-500/20",
                )}
              >
                {message.status[0].toUpperCase() + message.status.slice(1)}
              </Badge>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 text-muted-foreground">
                <Icon className="h-3 w-3" />
                {CHANNEL_LABEL[message.channel]}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {message.audience} ({message.recipients.toLocaleString()})
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                Sent {formatDateTime(message.sentAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: funnel + render */}
        <div className="space-y-6">
          {/* Funnel (segment) */}
          {showFunnel && (
            <div className="rounded-xl border border-border bg-card/40 p-5">
              <MessageFunnelChart funnel={message.funnel!} channel={message.channel} />

              {/* Link breakdown — email/whatsapp only; SMS has no click tracking */}
              {message.channel !== "sms" && message.linkClicks && message.linkClicks.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Click breakdown
                  </p>
                  <div className="space-y-1">
                    {message.linkClicks.map((l) => (
                      <div
                        key={l.label}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs",
                          l.isPayment
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-border bg-card/40",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {l.isPayment && (
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                              payment link
                            </span>
                          )}
                          <span className={cn("truncate", l.isPayment ? "text-foreground font-medium" : "text-foreground")}>
                            {l.label}
                          </span>
                          <span className="truncate font-mono text-[10px] text-muted-foreground">
                            {l.url}
                          </span>
                        </div>
                        <span className="shrink-0 tabular-nums text-foreground">
                          {l.clicks.toLocaleString()} clicks
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pills (single recipient) */}
          {showPills && (
            <div className="rounded-xl border border-border bg-card/40 p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">Delivery status</p>
              <MessageFunnelPills funnel={message.funnel!} channel={message.channel} />
            </div>
          )}

          {/* Rendered email */}
          {message.channel === "email" && template && (
            <div className="rounded-xl border border-border bg-card/40 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">As the borrower received it</h2>
                <span className="text-[10px] text-muted-foreground">
                  Variables resolved with sample data
                </span>
              </div>
              <div className="rounded-lg border border-border bg-zinc-900/50 p-6">
                <div style={{ maxWidth: 600, margin: "0 auto" }}>
                  {template.render({
                    slots: (template.defaultSlots) as SlotValues,
                    interactive: false,
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Plain-text view for SMS / WhatsApp / template-less email */}
          {(message.channel !== "email" || !template) && (
            <div className="rounded-xl border border-border bg-card/40 p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">As the borrower received it</h2>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground">
                  {message.subject}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Right: metadata sidebar */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Metadata
            </p>
            <dl className="space-y-3 text-xs">
              <Row label="Lender" value={getLenderName(message.lenderId)} />
              <Row label="Channel" value={CHANNEL_LABEL[message.channel]} />
              <Row label="Subject" value={message.subject} />
              <Row label="From" value={message.fromName ? `${message.fromName} <${message.fromAddress}>` : "—"} />
              <Row
                label="Template"
                value={template ? template.name : message.playbookName ?? "—"}
                extra={
                  template ? (
                    <Link
                      href={`/email-generator/new?template=${template.id}`}
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      Reuse
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  ) : undefined
                }
              />
              <Row label="Playbook" value={message.playbookName ?? "—"} />
              <Row label="Audience" value={`${message.audience} (${message.recipients.toLocaleString()})`} />
              <Row label="Created by" value={message.createdBy} />
              <Row label="Created" value={formatDateTime(message.createdAt)} />
              <Row label="Sent" value={formatDateTime(message.sentAt)} />
            </dl>
          </div>

          {message.funnel && (
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Goal & attribution
              </p>
              <div className="mb-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-emerald-300/70">Goal</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-300">
                  {message.funnel.goal.label}
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-300/80">
                  Auto-selected from the message&apos;s purpose. Each purpose has its own goal
                  metric (Paid for reminders, PTPs for broken-promise, RPCs for hardship, etc.).
                </p>
              </div>
              <p className="text-xs text-foreground">
                Outcomes attributed to this message if they happened on the deal within{" "}
                <span className="font-semibold text-emerald-400">
                  {message.funnel.attributionWindowDays} days
                </span>{" "}
                of the send. Last-message-touch.
              </p>
              <Link
                href="#"
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                Change attribution window
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  extra,
}: {
  label: string
  value: string
  extra?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-col items-end gap-0.5 text-right">
        <span className="break-words text-foreground">{value}</span>
        {extra}
      </dd>
    </div>
  )
}
