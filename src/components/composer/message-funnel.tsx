"use client"

import * as React from "react"
import {
  Send,
  CheckCircle2,
  Eye,
  MousePointerClick,
  Coins,
  AlertCircle,
  Handshake,
  PhoneCall,
  HandCoins,
  MessageSquareReply,
  Rocket,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { MessageFunnel, MessageGoalKey, MessageChannel } from "@/data/messages"

const GOAL_ICONS: Record<MessageGoalKey, LucideIcon> = {
  paid: Coins,
  ptp: Handshake,
  rpc: PhoneCall,
  settled: HandCoins,
  replies: MessageSquareReply,
  activated: Rocket,
}

interface MessageFunnelProps {
  funnel: MessageFunnel
  /**
   * Channel determines which intermediate stages are tracked. SMS has no
   * reliable Opened or Clicked signal — only Delivered + the goal show.
   * WhatsApp has read receipts so it can use the full email funnel.
   * Defaults to "email" for backward compatibility.
   */
  channel?: MessageChannel
}

/**
 * Count-based funnel for sent / segment messages.
 * Each stage shows the absolute count and the rate vs the previous stage.
 * The Paid / Recovered stage is the visual climax (largest, emerald-saturated).
 */
export function MessageFunnelChart({ funnel, channel = "email" }: MessageFunnelProps) {
  const max = Math.max(funnel.sent, 1)
  const GoalIcon = GOAL_ICONS[funnel.goal.key] ?? Coins

  // SMS: collapse to Sent → Delivered → Goal. No Opened / Clicked.
  const isSms = channel === "sms"
  const priorForGoal = isSms ? funnel.delivered : funnel.clicked
  const priorLabel = isSms ? "delivered → goal" : `of clicks → ${funnel.goal.label.toLowerCase()}`

  const stages: Array<{
    key: string
    label: string
    count: number
    rateLabel: string | null
    icon: LucideIcon
    caveat?: string
    isClimax?: boolean
    valueLabel?: string
  }> = [
    {
      key: "sent",
      label: "Sent",
      count: funnel.sent,
      rateLabel: null,
      icon: Send,
    },
    {
      key: "delivered",
      label: "Delivered",
      count: funnel.delivered,
      rateLabel: pct(funnel.delivered, funnel.sent, "delivery rate"),
      icon: CheckCircle2,
      caveat: isSms
        ? "SMS only reports Delivered. Open / click tracking isn't available on this channel."
        : undefined,
    },
    ...(isSms
      ? []
      : [
          {
            key: "opened",
            label: "Opened",
            count: funnel.opened,
            rateLabel: pct(funnel.opened, funnel.delivered, "open rate"),
            icon: Eye,
            caveat: "Estimated — open tracking is unreliable due to mail-privacy auto-loading.",
          },
          {
            key: "clicked",
            label: "Clicked",
            count: funnel.clicked,
            rateLabel: pct(funnel.clicked, funnel.opened, "click rate"),
            icon: MousePointerClick,
          },
        ]),
    {
      key: funnel.goal.key,
      label: funnel.goal.label,
      count: funnel.goal.count,
      rateLabel:
        funnel.goal.rateLabelOverride ??
        pct(funnel.goal.count, priorForGoal, priorLabel),
      icon: GoalIcon,
      caveat: funnel.goal.caveat,
      valueLabel: funnel.goal.valueLabel,
      isClimax: true,
    },
  ]

  return (
    <div className="space-y-1.5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Performance funnel</h3>
        <span className="text-[10px] text-muted-foreground">
          Attribution: {funnel.attributionWindowDays}-day window · last-message-touch
        </span>
      </div>

      <div className="space-y-1.5">
        {stages.map((stage, idx) => {
          const Icon = stage.icon
          const widthPct = (stage.count / max) * 100
          const isClimax = stage.isClimax
          const isFirst = idx === 0

          return (
            <div key={stage.key} className="group">
              <div
                className={cn(
                  "relative overflow-hidden rounded-lg border transition-colors",
                  isClimax
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-border bg-card/40",
                )}
              >
                {/* Progress fill */}
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all",
                    isClimax ? "bg-emerald-500/30" : "bg-emerald-500/15",
                  )}
                  style={{ width: `${widthPct}%` }}
                />

                {/* Content */}
                <div className="relative flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        isClimax ? "bg-emerald-500 text-white" : "bg-emerald-500/15 text-emerald-400",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "font-semibold leading-tight tracking-tight",
                          isClimax ? "text-base text-emerald-300" : "text-sm text-foreground",
                        )}
                      >
                        {stage.label}
                      </p>
                      {stage.rateLabel && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{stage.rateLabel}</p>
                      )}
                      {isFirst && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Total recipients</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={cn(
                        "tabular-nums font-bold leading-none",
                        isClimax ? "text-2xl text-emerald-300" : "text-xl text-foreground",
                      )}
                    >
                      {stage.count.toLocaleString()}
                    </p>
                    {isClimax && stage.valueLabel && (
                      <p className="mt-1 text-[11px] font-medium text-emerald-400">
                        {stage.valueLabel}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Caveat (Opened stage) */}
              {stage.caveat && (
                <div className="ml-12 mt-1 flex items-start gap-1.5 text-[10px] text-amber-400/80">
                  <AlertCircle className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                  <span>{stage.caveat}</span>
                </div>
              )}

              {/* Vertical spine connector */}
              {idx < stages.length - 1 && (
                <div className="ml-7 h-2 w-px bg-border" aria-hidden />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function pct(numerator: number, denominator: number, label: string): string {
  if (denominator === 0) return `0% ${label}`
  const p = (numerator / denominator) * 100
  return `${p.toFixed(1)}% ${label}`
}

/** Compact pill row used for single-recipient sends where the funnel collapses
 *  to 1/0 per stage. */
export function MessageFunnelPills({
  funnel,
  channel = "email",
}: {
  funnel: MessageFunnel
  channel?: MessageChannel
}) {
  const GoalIcon = GOAL_ICONS[funnel.goal.key] ?? Coins
  const isSms = channel === "sms"
  const pills: Array<{ label: string; ok: boolean; icon: LucideIcon }> = isSms
    ? [
        { label: "Delivered", ok: funnel.delivered > 0, icon: CheckCircle2 },
        { label: funnel.goal.label, ok: funnel.goal.count > 0, icon: GoalIcon },
      ]
    : [
        { label: "Delivered", ok: funnel.delivered > 0, icon: CheckCircle2 },
        { label: "Opened", ok: funnel.opened > 0, icon: Eye },
        { label: "Clicked", ok: funnel.clicked > 0, icon: MousePointerClick },
        { label: funnel.goal.label, ok: funnel.goal.count > 0, icon: GoalIcon },
      ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((p) => {
        const Icon = p.icon
        return (
          <span
            key={p.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              p.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-border bg-card/40 text-muted-foreground",
            )}
          >
            <Icon className="h-3 w-3" />
            {p.label}
          </span>
        )
      })}
      {funnel.goal.valueLabel && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
          <GoalIcon className="h-3 w-3" />
          {funnel.goal.valueLabel}
        </span>
      )}
    </div>
  )
}

const GOAL_PILL_LABEL: Record<MessageGoalKey, string> = {
  paid: "Paid",
  ptp: "PTP",
  rpc: "RPC",
  settled: "Settle",
  replies: "Reply",
  activated: "Active",
}

/** Inline compact pills for the messages list table. */
export function MessageStatusPills({
  funnel,
  channel = "email",
}: {
  funnel: MessageFunnel | undefined
  channel?: MessageChannel
}) {
  if (!funnel) return null
  const goalShort = GOAL_PILL_LABEL[funnel.goal.key] ?? funnel.goal.label.slice(0, 5)
  const isSms = channel === "sms"
  const dots = isSms
    ? [
        { ok: funnel.delivered > 0, label: "Del" },
        { ok: funnel.goal.count > 0, label: goalShort, isGoal: true as const },
      ]
    : [
        { ok: funnel.delivered > 0, label: "Del" },
        { ok: funnel.opened > 0, label: "Open" },
        { ok: funnel.clicked > 0, label: "Clk" },
        { ok: funnel.goal.count > 0, label: goalShort, isGoal: true as const },
      ]
  return (
    <div className="flex items-center gap-0.5">
      {dots.map((d, i) => (
        <span
          key={i}
          title={`${d.label}: ${d.ok ? "✓" : "—"}`}
          className={cn(
            "rounded px-1 py-px text-[9px] font-medium tabular-nums",
            "isGoal" in d && d.isGoal && d.ok && "bg-emerald-500/30 text-emerald-200",
            !("isGoal" in d && d.isGoal) && d.ok && "bg-emerald-500/15 text-emerald-300",
            !d.ok && "bg-muted/30 text-muted-foreground/60",
          )}
        >
          {d.label}
        </span>
      ))}
    </div>
  )
}
