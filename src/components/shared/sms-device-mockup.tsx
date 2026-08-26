"use client"

/**
 * SmsDeviceMockup — device-accurate SMS preview used by both the Composer
 * "as the borrower received it" panel and the Journey Builder Send SMS node
 * preview.
 *
 * The frame renders in iOS or Android mode (author-selectable). Message
 * bubble mirrors iOS Messages / Android Messages conventions. Tracked
 * click-through links are wrapped in the short-link envelope so authors see
 * the actual text the borrower will get.
 *
 * Below the mockup: live character + segment counters, and a GSM-7 → UCS-2
 * encoding warning when the body contains characters that force the switch —
 * dropping the per-segment cap from 160 to 70 and increasing carrier cost.
 */

import * as React from "react"
import { AlertTriangle, Battery, Signal, Wifi } from "lucide-react"
import { segmentSms, isRtl } from "@/lib/sms-encoding"
import { cn } from "@/lib/utils"

export type DeviceKind = "ios" | "android"

interface SmsDeviceMockupProps {
  body: string
  senderId?: string
  /** Whether links in the body are being click-tracked. When true, the
   *  preview wraps http(s) links in the short-link envelope authors see on
   *  the wire — `cg.link/AbC123`. */
  clickTracking?: boolean
  /** Sample recipient phone number for the mockup header. */
  recipientPhone?: string
  device?: DeviceKind
  onDeviceChange?: (device: DeviceKind) => void
  /** When true, hide the header device toggle. Used when the parent renders
   *  its own toggle (e.g. inside a journey-node inspector tab). */
  hideDeviceToggle?: boolean
}

const SHORTLINK_PREFIX = "cg.link/"

function wrapTrackedLinks(body: string): string {
  return body.replace(/https?:\/\/\S+/g, (url) => {
    // Deterministic 6-char slug from the URL.
    let hash = 0
    for (let i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) | 0
    const abc = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let slug = ""
    let n = Math.abs(hash)
    for (let i = 0; i < 6; i++) {
      slug += abc[n % abc.length]
      n = Math.floor(n / abc.length)
    }
    return SHORTLINK_PREFIX + slug
  })
}

export function SmsDeviceMockup({
  body,
  senderId = "ClearGrid",
  clickTracking = false,
  recipientPhone,
  device = "ios",
  onDeviceChange,
  hideDeviceToggle = false,
}: SmsDeviceMockupProps) {
  const displayBody = clickTracking ? wrapTrackedLinks(body) : body
  const seg = segmentSms(displayBody)
  const rtl = isRtl(displayBody)

  return (
    <div className="space-y-2">
      {!hideDeviceToggle && (
        <div className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/10 p-0.5 text-[10px]">
          <DeviceToggleButton
            active={device === "ios"}
            onClick={() => onDeviceChange?.("ios")}
          >
            iOS
          </DeviceToggleButton>
          <DeviceToggleButton
            active={device === "android"}
            onClick={() => onDeviceChange?.("android")}
          >
            Android
          </DeviceToggleButton>
        </div>
      )}

      {device === "ios" ? (
        <IosFrame senderId={senderId} recipientPhone={recipientPhone} body={displayBody} rtl={rtl} />
      ) : (
        <AndroidFrame senderId={senderId} recipientPhone={recipientPhone} body={displayBody} rtl={rtl} />
      )}

      {/* Counters + encoding row */}
      <div className="rounded-md border border-border/60 bg-muted/[0.04] px-2.5 py-2 text-[10px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="tabular-nums text-foreground">
            {seg.characterCount} char{seg.characterCount === 1 ? "" : "s"}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="tabular-nums text-foreground">
            {seg.segments} segment{seg.segments === 1 ? "" : "s"}
          </span>
          <span className="text-muted-foreground">·</span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase",
              seg.encoding === "gsm7"
                ? "bg-primary/15 text-primary"
                : "bg-warning-500/15 text-warning-300",
            )}
          >
            {seg.encoding === "gsm7" ? "GSM-7" : "UCS-2"}
          </span>
          <span className="ml-auto tabular-nums text-muted-foreground">
            {seg.remainingInSegment} left in segment (cap {seg.perSegmentCap})
          </span>
        </div>
        {seg.encoding === "ucs2" && (
          <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-warning-500/30 bg-warning-500/[0.08] px-2 py-1.5 text-[10px] leading-relaxed text-warning-300">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <div>
              <p className="font-medium">
                Non-GSM characters trigger UCS-2 encoding — 70 chars/segment instead of 160.
              </p>
              <p className="mt-0.5 text-warning-200/80">
                A message that would fit one GSM-7 segment now costs {seg.segments}. Carrier
                cost scales linearly with segment count.
                {seg.nonGsmSample.length > 0 && (
                  <>
                    {" "}Triggered by:{" "}
                    <span className="font-mono">
                      {seg.nonGsmSample.map((g) => `"${g}"`).join(", ")}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DeviceToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded px-2 py-1 font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

/* ─────────── iOS frame ─────────── */

function IosFrame({
  senderId,
  recipientPhone,
  body,
  rtl,
}: {
  senderId: string
  recipientPhone?: string
  body: string
  rtl: boolean
}) {
  return (
    <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-[36px] border-[6px] border-neutral-800 bg-black shadow-lg">
      {/* Notch — approximates a modern iPhone Dynamic Island. */}
      <div className="flex justify-center bg-black pt-1.5">
        <div className="h-4 w-16 rounded-full bg-neutral-900" />
      </div>
      {/* Status bar */}
      <div className="flex items-center justify-between bg-black px-4 pt-1 pb-1 text-[10px] font-semibold text-white">
        <span>9:41</span>
        <span className="flex items-center gap-1 text-white/90">
          <Signal className="h-2.5 w-2.5" />
          <Wifi className="h-2.5 w-2.5" />
          <Battery className="h-2.5 w-2.5" />
        </span>
      </div>
      {/* Chat header */}
      <div className="flex flex-col items-center bg-[#1c1c1e] px-3 py-2.5 text-white/90">
        <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-600 text-[11px] font-semibold">
          {senderId.slice(0, 2).toUpperCase()}
        </div>
        <div className="text-[11px] font-medium">{senderId}</div>
        {recipientPhone && (
          <div className="text-[9px] text-white/50">to {recipientPhone}</div>
        )}
      </div>
      {/* Bubble area — realistic phone aspect ratio (9:19.5 for modern iPhones).
          260px wide → ~440px tall for the bubble region, plus the chrome above. */}
      <div className="flex min-h-[440px] flex-col gap-2 bg-black px-3 py-3">
        <IosBubble body={body} rtl={rtl} />
      </div>
      {/* Home indicator */}
      <div className="flex justify-center bg-black pb-1.5 pt-1">
        <div className="h-1 w-24 rounded-full bg-white/60" />
      </div>
    </div>
  )
}

function IosBubble({ body, rtl }: { body: string; rtl: boolean }) {
  return (
    <div className="flex justify-start">
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="max-w-[85%] rounded-2xl rounded-tl-md bg-[#3a3a3c] px-3 py-2 text-[11px] leading-relaxed text-white shadow-sm"
        style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
      >
        {body || (
          <span className="italic text-white/40">
            Your SMS preview will appear here…
          </span>
        )}
      </div>
    </div>
  )
}

/* ─────────── Android frame ─────────── */

function AndroidFrame({
  senderId,
  recipientPhone,
  body,
  rtl,
}: {
  senderId: string
  recipientPhone?: string
  body: string
  rtl: boolean
}) {
  return (
    <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-[24px] border-[6px] border-neutral-800 bg-[#0f172a] shadow-lg">
      {/* Punch-hole camera */}
      <div className="relative bg-[#0f172a] pt-2">
        <div className="absolute left-1/2 top-2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-black" />
      </div>
      {/* Status bar */}
      <div className="flex items-center justify-between bg-[#0f172a] px-4 pt-2 pb-1 text-[10px] font-medium text-white/90">
        <span>9:41</span>
        <span className="flex items-center gap-1 text-white/70">
          <Signal className="h-2.5 w-2.5" />
          <Wifi className="h-2.5 w-2.5" />
          <Battery className="h-2.5 w-2.5" />
        </span>
      </div>
      {/* Header */}
      <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-2.5 text-white/90">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/80 text-[11px] font-semibold text-primary-foreground">
          {senderId.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-medium">{senderId}</div>
          {recipientPhone && (
            <div className="truncate text-[9px] text-white/50">to {recipientPhone}</div>
          )}
        </div>
      </div>
      {/* Bubble area — matches iOS proportions. */}
      <div className="flex min-h-[440px] flex-col gap-2 bg-[#111827] px-3 py-3">
        <AndroidBubble body={body} rtl={rtl} />
      </div>
      {/* Gesture bar */}
      <div className="flex justify-center bg-[#0f172a] pb-1.5 pt-1">
        <div className="h-1 w-20 rounded-full bg-white/50" />
      </div>
    </div>
  )
}

function AndroidBubble({ body, rtl }: { body: string; rtl: boolean }) {
  return (
    <div className="flex justify-start">
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="max-w-[85%] rounded-2xl rounded-tl-md bg-primary/25 px-3 py-2 text-[11px] leading-relaxed text-white shadow-sm"
        style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
      >
        {body || (
          <span className="italic text-white/40">
            Your SMS preview will appear here…
          </span>
        )}
      </div>
    </div>
  )
}
