"use client"

import * as React from "react"
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Image as ImageIcon,
  Plus,
  X,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  type RichEmailTemplate,
  type SlotValue,
  type SlotDef,
  type ButtonSlotValue,
  type ImageSlotValue,
} from "@/data/rich-email-templates"

/** Variables exposed in the slot inspector. Match the existing composer set. */
const VARIABLES: { token: string; label: string }[] = [
  { token: "{{borrower_name}}", label: "Borrower full name" },
  { token: "{{borrower_first_name}}", label: "Borrower first name" },
  { token: "{{borrower_last_name}}", label: "Borrower last name" },
  { token: "{{amount_due}}", label: "Amount due" },
  { token: "{{currency}}", label: "Currency" },
  { token: "{{due_date}}", label: "Due date" },
  { token: "{{days_past_due}}", label: "Days past due (today)" },
  { token: "{{account_number}}", label: "Account number" },
  { token: "{{reference_id}}", label: "Reference ID" },
  { token: "{{settlement_amount}}", label: "Settlement amount" },
  { token: "{{discount_percent}}", label: "Discount %" },
  { token: "{{payment_link}}", label: "Payment link" },
  { token: "{{lender_name}}", label: "Lender name" },
  { token: "{{contact_phone}}", label: "Contact phone" },
  { token: "{{agent_name}}", label: "Agent name" },
]

interface SlotInspectorProps {
  template: RichEmailTemplate
  slotId: string
  value: SlotValue
  onChange: (value: SlotValue) => void
  onClose: () => void
}

export function SlotInspector({
  template,
  slotId,
  value,
  onChange,
  onClose,
}: SlotInspectorProps) {
  const slotDef = template.slotDefs.find((s) => s.id === slotId)
  if (!slotDef) return null

  return (
    <div className="flex h-full flex-col border-l border-border bg-card/40">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            Editing slot
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-foreground">{slotDef.label}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            <span className="rounded bg-muted/60 px-1 py-0 font-mono">{slotDef.type}</span>
            {" · "}
            <span className="font-mono">{slotDef.id}</span>
          </p>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close inspector">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto p-4">
        {slotDef.type === "text" && (
          <TextSlotEditor
            slotDef={slotDef as Extract<SlotDef, { type: "text" }>}
            value={typeof value === "string" ? value : ""}
            onChange={onChange}
          />
        )}
        {slotDef.type === "image" && (
          <ImageSlotEditor
            slotDef={slotDef as Extract<SlotDef, { type: "image" }>}
            value={value as ImageSlotValue}
            onChange={onChange}
          />
        )}
        {slotDef.type === "button" && (
          <ButtonSlotEditor
            value={value as ButtonSlotValue}
            onChange={onChange}
          />
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────
 * Text slot editor
 * ──────────────────────────────────────────────────────────────────── */

function TextSlotEditor({
  slotDef,
  value,
  onChange,
}: {
  slotDef: Extract<SlotDef, { type: "text" }>
  value: string
  onChange: (next: string) => void
}) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null)
  const length = value.length
  const max = slotDef.maxLength
  const overLimit = max !== undefined && length > max

  function wrapSelection(left: string, right: string) {
    const el = ref.current
    if (!el) {
      onChange(`${value}${left}${right}`)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const before = value.slice(0, start)
    const middle = value.slice(start, end) || "text"
    const after = value.slice(end)
    const next = `${before}${left}${middle}${right}${after}`
    onChange(next)
    window.setTimeout(() => {
      el.focus()
      const cursor = before.length + left.length + middle.length
      el.setSelectionRange(cursor, cursor)
    }, 0)
  }

  function insertAtCursor(token: string) {
    const el = ref.current
    if (!el) {
      onChange(value + token)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const next = value.slice(0, start) + token + value.slice(end)
    onChange(next)
    window.setTimeout(() => {
      el.focus()
      const cursor = start + token.length
      el.setSelectionRange(cursor, cursor)
    }, 0)
  }

  return (
    <div className="space-y-3">
      {/* Formatting toolbar */}
      <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 px-1.5 py-1">
        <button
          type="button"
          title="Bold"
          onClick={() => wrapSelection("**", "**")}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Italic"
          onClick={() => wrapSelection("*", "*")}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Link"
          onClick={() => wrapSelection("[", "](https://)")}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" aria-label="Insert variable" />
              }
            >
              <Plus className="h-3 w-3" />
              Variable
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 w-64 overflow-y-auto">
              {VARIABLES.map((v) => (
                <DropdownMenuItem key={v.token} onClick={() => insertAtCursor(v.token)}>
                  <span className="font-mono text-[11px] text-primary">{v.token}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{v.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Textarea / Input */}
      {slotDef.multiline ? (
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[180px] font-mono text-[12px] leading-relaxed"
          placeholder="Type your content here..."
        />
      ) : (
        <Input
          ref={ref as unknown as React.Ref<HTMLInputElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-[12px]"
          placeholder="Type your content here..."
        />
      )}

      {/* Footer: char count */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Click a variable to insert at cursor. Bold / italic use markdown syntax.
        </p>
        {max !== undefined && (
          <span
            className={cn(
              "text-[10px] font-medium tabular-nums",
              overLimit ? "text-amber-400" : "text-muted-foreground",
            )}
          >
            {length}/{max}
          </span>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────
 * Image slot editor
 * ──────────────────────────────────────────────────────────────────── */

function ImageSlotEditor({
  slotDef,
  value,
  onChange,
}: {
  slotDef: Extract<SlotDef, { type: "image" }>
  value: ImageSlotValue
  onChange: (next: ImageSlotValue) => void
}) {
  const safe: ImageSlotValue = value && typeof value === "object" ? value : { src: "", alt: "" }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Constraints
        </Label>
        <p className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-[11px] text-foreground">
          Image must be <span className="font-mono text-primary">{slotDef.width}×{slotDef.height}px</span>
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="img-url" className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Image URL
        </Label>
        <Input
          id="img-url"
          value={safe.src}
          onChange={(e) => onChange({ ...safe, src: e.target.value })}
          placeholder="https://..."
          className="text-[12px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="img-alt" className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Alt text
        </Label>
        <Input
          id="img-alt"
          value={safe.alt}
          onChange={(e) => onChange({ ...safe, alt: e.target.value })}
          placeholder="Describe the image for screen readers"
          className="text-[12px]"
        />
      </div>

      <Button variant="outline" size="sm" className="w-full">
        <Upload className="h-3.5 w-3.5" />
        Upload from device
      </Button>

      <div className="rounded-md border border-dashed border-border bg-muted/20 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <ImageIcon className="h-3 w-3" />
          Preview
        </p>
        <div
          style={{
            aspectRatio: `${slotDef.width} / ${slotDef.height}`,
            background: safe.src ? `url(${safe.src}) center / cover` : "rgba(255,255,255,0.04)",
            borderRadius: 6,
          }}
          className="border border-border"
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────
 * Button slot editor
 * ──────────────────────────────────────────────────────────────────── */

function ButtonSlotEditor({
  value,
  onChange,
}: {
  value: ButtonSlotValue
  onChange: (next: ButtonSlotValue) => void
}) {
  const safe: ButtonSlotValue = value && typeof value === "object" ? value : { label: "", url: "" }
  const labelRef = React.useRef<HTMLInputElement | null>(null)
  const urlRef = React.useRef<HTMLInputElement | null>(null)
  const [focused, setFocused] = React.useState<"label" | "url">("label")

  function insertVariable(token: string) {
    const ref = focused === "url" ? urlRef.current : labelRef.current
    const current = focused === "url" ? safe.url : safe.label
    if (!ref) {
      const next = current + token
      onChange(focused === "url" ? { ...safe, url: next } : { ...safe, label: next })
      return
    }
    const start = ref.selectionStart ?? current.length
    const end = ref.selectionEnd ?? current.length
    const next = current.slice(0, start) + token + current.slice(end)
    onChange(focused === "url" ? { ...safe, url: next } : { ...safe, label: next })
    window.setTimeout(() => {
      ref.focus()
      const cursor = start + token.length
      ref.setSelectionRange(cursor, cursor)
    }, 0)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="btn-label" className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Button label
        </Label>
        <Input
          id="btn-label"
          ref={labelRef}
          value={safe.label}
          onFocus={() => setFocused("label")}
          onChange={(e) => onChange({ ...safe, label: e.target.value })}
          className="text-[12px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="btn-url" className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Destination URL
        </Label>
        <Input
          id="btn-url"
          ref={urlRef}
          value={safe.url}
          onFocus={() => setFocused("url")}
          onChange={(e) => onChange({ ...safe, url: e.target.value })}
          placeholder="https://... or {{payment_link}}"
          className="text-[12px] font-mono"
        />
        <p className="text-[10px] text-muted-foreground">
          You can use variables like <span className="font-mono">{`{{payment_link}}`}</span>.
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="w-full" aria-label="Insert variable" />
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Insert variable into {focused === "url" ? "URL" : "label"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 w-64 overflow-y-auto">
          {VARIABLES.map((v) => (
            <DropdownMenuItem key={v.token} onClick={() => insertVariable(v.token)}>
              <span className="font-mono text-[11px] text-primary">{v.token}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{v.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
