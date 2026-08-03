"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, MailX, Eye, MousePointerClick, Coins } from "lucide-react"
import type { MessageListItem } from "@/data/messages"
import { Badge } from "@/components/ui/badge"

/**
 * Funnel-to-journey CTAs.
 *
 * Each row scaffolds a Draft journey in Journey Builder: audience = the
 * segment of borrowers who fell out at this funnel stage, first Send node
 * already pre-placed with a follow-up template.
 *
 * Per the spec: landing in the builder in Draft is the human review step.
 * No borrowers are enrolled until the agent activates the journey.
 */
export function FunnelSegmentCtas({ message }: { message: MessageListItem }) {
  if (!message.funnel) return null
  const f = message.funnel

  const didntDeliver = f.sent - f.delivered
  const didntOpen = message.channel === "sms" ? 0 : f.delivered - f.opened
  const didntClick = message.channel === "sms" ? 0 : f.opened - f.clicked
  const didntPay = (message.channel === "sms" ? f.delivered : f.clicked) - f.goal.count

  const segments: Array<{
    key: string
    label: string
    count: number
    description: string
    icon: typeof MailX
    suggestedTemplate: string
    accent: string
  }> = [
    {
      key: "didnt_deliver",
      label: `${didntDeliver.toLocaleString()} didn't deliver`,
      count: didntDeliver,
      description:
        "Bounces, rejections, dead addresses. Scaffold a re-engagement via an alternate channel.",
      icon: MailX,
      suggestedTemplate: "rich-cg-payment-reminder",
      accent: "red",
    },
    ...(message.channel === "sms"
      ? []
      : [
          {
            key: "didnt_open" as const,
            label: `${didntOpen.toLocaleString()} didn't open`,
            count: didntOpen,
            description:
              "Delivered but never opened. Try a different subject line in a 48h follow-up.",
            icon: Eye,
            suggestedTemplate: "rich-cg-payment-reminder",
            accent: "amber",
          },
          {
            key: "didnt_click" as const,
            label: `${didntClick.toLocaleString()} didn't click`,
            count: didntClick,
            description:
              "Opened but didn't tap the payment link. Try a stronger CTA or SMS variant.",
            icon: MousePointerClick,
            suggestedTemplate: "rich-tamara-friendly",
            accent: "amber",
          },
        ]),
    {
      key: "didnt_pay",
      label: `${didntPay.toLocaleString()} didn't ${f.goal.label.toLowerCase().split(" ")[0]}`,
      count: didntPay,
      description: `Reached the CTA but didn't ${f.goal.label.toLowerCase()}. Escalate via AI Call or a hardship outreach journey.`,
      icon: Coins,
      suggestedTemplate: "rich-cg-settlement",
      accent: "blue",
    },
  ]

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Build a journey for a funnel segment</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Each segment scaffolds a Draft journey with the audience pre-set and a follow-up template
          pre-placed in the first Send node. You land in the builder for the human review step before
          anyone is enrolled.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {segments.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.key}
              href={
                "/journeys/new?" +
                new URLSearchParams({
                  from: "funnel",
                  message: message.id,
                  segment: s.key,
                  template: s.suggestedTemplate,
                  audience: `${s.count} borrowers · ${s.label}`,
                }).toString()
              }
              className={
                "group flex items-start justify-between gap-3 rounded-md border bg-zinc-900/40 p-3 transition-colors hover:bg-zinc-900/70 " +
                (s.accent === "red"
                  ? "border-red-500/30 hover:border-red-500/60"
                  : s.accent === "amber"
                    ? "border-amber-500/30 hover:border-amber-500/60"
                    : "border-blue-500/30 hover:border-blue-500/60")
              }
            >
              <div className="flex min-w-0 items-start gap-2">
                <div
                  className={
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md " +
                    (s.accent === "red"
                      ? "bg-red-500/15 text-red-300"
                      : s.accent === "amber"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-blue-500/15 text-blue-300")
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground">{s.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                    {s.description}
                  </p>
                  <Badge className="mt-1.5 h-4 border-zinc-700 bg-zinc-800 text-[9px] text-zinc-300">
                    Pre-placed: {s.suggestedTemplate.replace(/^rich-/, "")}
                  </Badge>
                </div>
              </div>
              <ArrowRight className="mt-1 h-3 w-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
