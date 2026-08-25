"use client"

/**
 * MessagePreview — single "as the borrower received it" surface shared by
 * the Composer preview panel AND the Journey Builder Send Email / Send SMS /
 * WhatsApp node inspectors. Anywhere in the app that needs to show authors
 * what the borrower will see should render this rather than rolling its own
 * bubble.
 *
 * Variables are resolved by the caller (they own the borrower context) —
 * pass in the already-rendered subject / body strings.
 */

import * as React from "react"
import { Clock } from "lucide-react"
import { SmsDeviceMockup, type DeviceKind } from "@/components/shared/sms-device-mockup"
import { isRtl } from "@/lib/sms-encoding"
import { cn } from "@/lib/utils"

export type MessageChannel = "email" | "sms" | "whatsapp"

export interface MessagePreviewProps {
  channel: MessageChannel
  /** Email subject line. Ignored for SMS/WhatsApp. */
  subject?: string
  /** Inbox preview text ("preheader"). Email-only. */
  previewText?: string
  /** Rendered body — variables already resolved against the sample borrower. */
  body: string
  /** From identity — email uses "Name <address>" convention. */
  fromName?: string
  fromAddress?: string
  /** SMS sender ID + recipient phone number, for the device mockup header. */
  senderId?: string
  recipientPhone?: string
  /** Recipient name — used by WhatsApp header. */
  recipientName?: string
  /** Whether SMS/email links are click-tracked. */
  clickTracking?: boolean
  /** SMS-only: preferred device shell. Controlled or uncontrolled. */
  device?: DeviceKind
  onDeviceChange?: (device: DeviceKind) => void
  /** Hide the SMS device toggle (when parent renders its own). */
  hideDeviceToggle?: boolean
}

export function MessagePreview(props: MessagePreviewProps) {
  if (props.channel === "email") {
    return (
      <EmailPreview
        subject={props.subject ?? ""}
        previewText={props.previewText ?? ""}
        body={props.body}
        fromName={props.fromName}
        fromAddress={props.fromAddress}
      />
    )
  }
  if (props.channel === "sms") {
    return (
      <SmsDeviceMockup
        body={props.body}
        senderId={props.senderId}
        recipientPhone={props.recipientPhone}
        clickTracking={props.clickTracking}
        device={props.device}
        onDeviceChange={props.onDeviceChange}
        hideDeviceToggle={props.hideDeviceToggle}
      />
    )
  }
  return (
    <WhatsAppPreview
      body={props.body}
      recipientName={props.recipientName}
      senderId={props.senderId}
    />
  )
}

/* ─────────── Email preview ─────────── */

function EmailPreview({
  subject,
  previewText,
  body,
  fromName = "ClearGrid Collections",
  fromAddress = "collections@cleargrid.ae",
}: {
  subject: string
  previewText: string
  body: string
  fromName?: string
  fromAddress?: string
}) {
  const subjectRtl = isRtl(subject)
  const bodyRtl = isRtl(body)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
            {(fromName || "CG").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium text-foreground">{fromName}</div>
            <div className="truncate text-[10px] text-muted-foreground">{fromAddress}</div>
          </div>
          <Clock className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-1 px-3 py-2">
        <div
          dir={subjectRtl ? "rtl" : "ltr"}
          className={cn("text-[13px] font-semibold text-foreground", subjectRtl && "text-right")}
        >
          {subject || <span className="text-muted-foreground">(no subject)</span>}
        </div>
        {previewText && (
          <div
            dir={isRtl(previewText) ? "rtl" : "ltr"}
            className="text-[10px] text-muted-foreground line-clamp-1"
          >
            {previewText}
          </div>
        )}
      </div>
      <div
        dir={bodyRtl ? "rtl" : "ltr"}
        className={cn(
          "max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-border/60 px-3 py-3 text-[11px] leading-relaxed text-foreground",
          bodyRtl && "text-right",
        )}
      >
        {body || (
          <span className="text-muted-foreground">
            Your message preview will appear here…
          </span>
        )}
      </div>
    </div>
  )
}

/* ─────────── WhatsApp preview ─────────── */

function WhatsAppPreview({
  body,
  recipientName = "",
  senderId = "ClearGrid",
}: {
  body: string
  recipientName?: string
  senderId?: string
}) {
  const rtl = isRtl(body)
  return (
    <div className="rounded-lg bg-[#0b141a] p-3 ring-1 ring-emerald-900/40">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
          {senderId.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 text-[11px]">
          <div className="truncate font-medium text-emerald-100">{senderId}</div>
          {recipientName && (
            <div className="truncate text-[10px] text-emerald-100/60">{recipientName}</div>
          )}
        </div>
      </div>
      <div
        dir={rtl ? "rtl" : "ltr"}
        className={cn(
          "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-[#005c4b] px-3 py-2 text-[11px] leading-relaxed text-emerald-50",
          rtl && "text-right",
        )}
        style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
      >
        {body || (
          <span className="text-emerald-100/50">
            Your WhatsApp preview will appear here…
          </span>
        )}
      </div>
      <div className="mt-1 text-right text-[9px] text-emerald-100/50">12:34 ✓✓</div>
    </div>
  )
}
