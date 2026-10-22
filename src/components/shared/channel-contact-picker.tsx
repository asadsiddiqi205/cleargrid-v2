"use client"

/**
 * ChannelContactPicker — strategy editor for how many of a borrower's
 * phone numbers / emails to use, in what order, and how to behave on
 * failure. Numbers / emails have NO slot labels; the picker only edits
 * the selection strategy and shows a short preview of what it resolves
 * to against a sample borrower (if provided).
 */

import * as React from "react"
import { Phone, Mail, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DEFAULT_PHONE_SELECTION,
  DEFAULT_EMAIL_SELECTION,
  describePhoneSelection,
  describeEmailSelection,
  type PhoneSelection,
  type EmailSelection,
} from "@/data/borrower-channels"

type PreviewContact = { value: string; verified?: boolean }

interface PhoneProps {
  mode: "phone"
  value: PhoneSelection
  onChange: (next: PhoneSelection) => void
  /** Numbers on the preview borrower to show inline. */
  previewPhones?: PreviewContact[]
  /** When true, hide the help footer line. */
  compact?: boolean
  className?: string
  /** Shown instead of the default heading. */
  title?: string
  /** Hide the cascade-on-failure toggle (useful for SMS composer). */
  hideCascade?: boolean
  /** Hide the order dropdown. */
  hideOrder?: boolean
}

interface EmailProps {
  mode: "email"
  value: EmailSelection
  onChange: (next: EmailSelection) => void
  previewEmails?: PreviewContact[]
  compact?: boolean
  className?: string
  title?: string
  /** Hide the order dropdown. */
  hideOrder?: boolean
}

export type ChannelContactPickerProps = PhoneProps | EmailProps

export function ChannelContactPicker(props: ChannelContactPickerProps) {
  const Icon = props.mode === "phone" ? Phone : Mail
  const heading =
    props.title ??
    (props.mode === "phone"
      ? "Phone numbers to use"
      : "Email addresses to use")
  const preview =
    props.mode === "phone" ? props.previewPhones : props.previewEmails
  return (
    <div className={cn("space-y-2", props.className)}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <div className="text-[12px] font-semibold text-foreground">
          {heading}
        </div>
      </div>

      {props.mode === "phone" ? (
        <PhoneStrategy
          value={props.value ?? DEFAULT_PHONE_SELECTION}
          onChange={props.onChange}
          hideCascade={props.hideCascade}
          hideOrder={props.hideOrder}
        />
      ) : (
        <EmailStrategy
          value={props.value ?? DEFAULT_EMAIL_SELECTION}
          onChange={props.onChange}
          hideOrder={props.hideOrder}
        />
      )}

      {preview && preview.length > 0 && (
        <PreviewList
          mode={props.mode}
          items={preview}
          selection={
            props.mode === "phone"
              ? previewCount(props.value, preview.length)
              : previewCount(props.value, preview.length)
          }
        />
      )}

      {!props.compact && (
        <div className="flex items-start gap-1.5 rounded-md border border-border/60 bg-muted/[0.04] px-2 py-1.5 text-[10px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            {props.mode === "phone"
              ? describePhoneSelection(props.value ?? DEFAULT_PHONE_SELECTION)
              : describeEmailSelection(props.value ?? DEFAULT_EMAIL_SELECTION)}
          </span>
        </div>
      )}
    </div>
  )
}

function PhoneStrategy({
  value,
  onChange,
  hideCascade,
  hideOrder,
}: {
  value: PhoneSelection
  onChange: (next: PhoneSelection) => void
  hideCascade?: boolean
  hideOrder?: boolean
}) {
  const showExtras = !hideOrder || !hideCascade
  return (
    <div className="rounded-md border border-border/70 bg-background/60 p-2.5 space-y-2">
      <ScopeRow
        useAll={value.useAll}
        limit={value.limit}
        onChange={(patch) => onChange({ ...value, ...patch })}
        itemWord="number"
      />
      {showExtras && (
        <div className="grid gap-2 sm:grid-cols-2">
          {!hideOrder && (
            <OrderSelect
              value={value.order}
              onChange={(order) => onChange({ ...value, order })}
            />
          )}
          {!hideCascade && (
            <label className="flex cursor-pointer items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={value.cascadeOnFailure}
                onChange={(e) =>
                  onChange({ ...value, cascadeOnFailure: e.target.checked })
                }
                className="h-3.5 w-3.5 accent-primary"
              />
              <span className="text-foreground">Cascade on failure</span>
            </label>
          )}
        </div>
      )}
    </div>
  )
}

function EmailStrategy({
  value,
  onChange,
  hideOrder,
}: {
  value: EmailSelection
  onChange: (next: EmailSelection) => void
  hideOrder?: boolean
}) {
  return (
    <div className="rounded-md border border-border/70 bg-background/60 p-2.5 space-y-2">
      <ScopeRow
        useAll={value.useAll}
        limit={value.limit}
        onChange={(patch) => onChange({ ...value, ...patch })}
        itemWord="address"
      />
      <div
        className={cn(
          "grid gap-2",
          hideOrder ? "sm:grid-cols-1" : "sm:grid-cols-2",
        )}
      >
        {!hideOrder && (
          <OrderSelect
            value={value.order}
            onChange={(order) => onChange({ ...value, order })}
          />
        )}
        <div>
          <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">
            Send mode
          </div>
          <select
            value={value.mode}
            onChange={(e) =>
              onChange({ ...value, mode: e.target.value as EmailSelection["mode"] })
            }
            className="mt-1 h-7 w-full rounded border border-input bg-background px-2 text-[11px] outline-none focus-visible:border-ring"
          >
            <option value="one_message_cc_rest">One message · CC the rest</option>
            <option value="one_per_address">One per address</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function ScopeRow({
  useAll,
  limit,
  onChange,
  itemWord,
}: {
  useAll: boolean
  limit?: number
  onChange: (patch: { useAll?: boolean; limit?: number }) => void
  itemWord: string
}) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">
        Scope
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px]">
          <input
            type="radio"
            checked={useAll}
            onChange={() => onChange({ useAll: true })}
            className="h-3.5 w-3.5 accent-primary"
          />
          <span className="text-foreground">
            Use every {itemWord} on file
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px]">
          <input
            type="radio"
            checked={!useAll}
            onChange={() => onChange({ useAll: false, limit: limit ?? 1 })}
            className="h-3.5 w-3.5 accent-primary"
          />
          <span className="text-foreground">Use first</span>
          <input
            type="number"
            min={1}
            max={5}
            value={limit ?? 1}
            disabled={useAll}
            onChange={(e) =>
              onChange({
                useAll: false,
                limit: Math.max(1, Math.min(5, Number(e.target.value) || 1)),
              })
            }
            className={cn(
              "h-6 w-12 rounded border border-input bg-background px-1 text-center text-[11px] tabular-nums outline-none focus-visible:border-ring",
              useAll && "opacity-40",
            )}
          />
          <span className="text-foreground">{itemWord}s</span>
        </label>
      </div>
    </div>
  )
}

function OrderSelect({
  value,
  onChange,
}: {
  value: PhoneSelection["order"]
  onChange: (next: PhoneSelection["order"]) => void
}) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">
        Order
      </div>
      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value as PhoneSelection["order"])
        }
        className="mt-1 h-7 w-full rounded border border-input bg-background px-2 text-[11px] outline-none focus-visible:border-ring"
      >
        <option value="as_stored">As stored</option>
        <option value="verified_first">Verified-first</option>
        <option value="last_reached_first">Last-reached first</option>
      </select>
    </div>
  )
}

function PreviewList({
  mode,
  items,
  selection,
}: {
  mode: "phone" | "email"
  items: PreviewContact[]
  selection: number
}) {
  const activeCount = Math.min(items.length, selection)
  return (
    <div className="rounded-md border border-border/70 bg-background/60 px-2.5 py-2">
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">
        Preview · sample borrower
      </div>
      <ul className="mt-1 space-y-0.5">
        {items.map((item, i) => {
          const active = i < activeCount
          return (
            <li
              key={`${item.value}-${i}`}
              className={cn(
                "flex items-center gap-2 text-[11px]",
                active ? "text-foreground" : "text-muted-foreground line-through",
              )}
            >
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold">
                {i + 1}
              </span>
              <span className="truncate font-mono">{item.value}</span>
              {item.verified && (
                <span className="rounded bg-emerald-500/15 px-1 py-px text-[9px] font-semibold text-emerald-400">
                  verified
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-1 text-[9.5px] text-muted-foreground">
        {activeCount === items.length
          ? `All ${items.length} ${mode === "phone" ? "numbers" : "addresses"} used.`
          : `${activeCount} of ${items.length} used.`}
      </div>
    </div>
  )
}

function previewCount(
  sel: PhoneSelection | EmailSelection | undefined,
  available: number,
): number {
  if (!sel) return available
  if (sel.useAll) return available
  return Math.max(1, Math.min(sel.limit ?? 1, available))
}
