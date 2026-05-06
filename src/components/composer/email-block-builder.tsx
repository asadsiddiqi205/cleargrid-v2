"use client"

import * as React from "react"
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Type,
  AlignLeft,
  ExternalLink,
  Minus,
  Image as ImageIcon,
  Layers,
  List,
  Receipt,
  Mail,
  FileText,
  GripVertical,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import { cn } from "@/lib/utils"
import type { EmailBlock, EmailBlockType } from "@/components/composer/composer-view"

interface EmailBlockBuilderProps {
  blocks: EmailBlock[]
  onChange: (blocks: EmailBlock[]) => void
}

type BlockTypeMeta = {
  type: EmailBlockType
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const BLOCK_TYPES: BlockTypeMeta[] = [
  { type: "heading", label: "Heading", icon: Type },
  { type: "text", label: "Text", icon: AlignLeft },
  { type: "cta", label: "CTA Button", icon: ExternalLink },
  { type: "divider", label: "Divider", icon: Minus },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "spacer", label: "Spacer", icon: Layers },
  { type: "bullet_list", label: "Bullet list", icon: List },
  { type: "payment_summary", label: "Payment Summary", icon: Receipt },
  { type: "contact_block", label: "Contact / Help", icon: Mail },
  { type: "footer", label: "Footer / Legal", icon: FileText },
]

function makeBlock(type: EmailBlockType): EmailBlock {
  const id = `blk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const settings: Record<string, string> =
    type === "heading"
      ? { level: "h2" }
      : type === "cta"
      ? { url: "{{account.payment_link}}", style: "primary" }
      : {}
  const content =
    type === "heading"
      ? "Section heading"
      : type === "text"
      ? "Write your text content here..."
      : type === "cta"
      ? "Make Payment"
      : type === "bullet_list"
      ? "First item\nSecond item\nThird item"
      : type === "contact_block"
      ? "Need help? Contact us at {{account.support_contact}}."
      : type === "footer"
      ? "This message was sent by {{account.lender_name}} via ClearGrid."
      : type === "image"
      ? "https://placehold.co/600x200"
      : ""
  return { id, type, content, settings }
}

/**
 * Block-based email builder. Used inside the inline composer when "Use blocks"
 * is toggled on.
 *
 * Each block has reorder up/down buttons (no drag-and-drop), duplicate, delete,
 * and an inline editor scoped to its type. Renders a simple preview at the end.
 */
export function EmailBlockBuilder({ blocks, onChange }: EmailBlockBuilderProps) {
  const addBlock = (type: EmailBlockType) => {
    onChange([...blocks, makeBlock(type)])
  }

  const updateBlock = (id: string, patch: Partial<EmailBlock>) => {
    onChange(
      blocks.map((b) =>
        b.id === id
          ? {
              ...b,
              ...patch,
              settings: patch.settings ? { ...b.settings, ...patch.settings } : b.settings,
            }
          : b
      )
    )
  }

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id))
  }

  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id)
    if (idx < 0) return
    const original = blocks[idx]
    const copy: EmailBlock = {
      ...original,
      id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      settings: { ...original.settings },
    }
    const next = [...blocks]
    next.splice(idx + 1, 0, copy)
    onChange(next)
  }

  const moveBlock = (id: string, direction: "up" | "down") => {
    const idx = blocks.findIndex((b) => b.id === id)
    if (idx < 0) return
    const swap = direction === "up" ? idx - 1 : idx + 1
    if (swap < 0 || swap >= blocks.length) return
    const next = [...blocks]
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-foreground">
          Email blocks
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <Plus className="h-3.5 w-3.5" />
            Add block
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Choose block type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {BLOCK_TYPES.map((bt) => {
              const Icon = bt.icon
              return (
                <DropdownMenuItem key={bt.type} onClick={() => addBlock(bt.type)}>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {bt.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-6 text-center">
          <p className="text-xs text-muted-foreground">
            No blocks yet. Click "Add block" to start building.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block, idx) => {
            const meta = BLOCK_TYPES.find((bt) => bt.type === block.type)
            const Icon = meta?.icon ?? AlignLeft
            return (
              <div
                key={block.id}
                className="rounded-lg border border-border bg-card"
              >
                {/* Block header */}
                <div className="flex items-center gap-2 border-b border-border/50 px-2.5 py-1.5">
                  <GripVertical className="h-3 w-3 text-muted-foreground/40" />
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-foreground">
                    {meta?.label}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveBlock(block.id, "up")}
                      disabled={idx === 0}
                      className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(block.id, "down")}
                      disabled={idx === blocks.length - 1}
                      className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateBlock(block.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent"
                      aria-label="Duplicate"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="rounded p-1 text-destructive hover:bg-destructive/10"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Block editor */}
                <div className="space-y-2 p-2.5">
                  {block.type === "heading" && (
                    <>
                      <Select
                        value={block.settings.level || "h2"}
                        onValueChange={(v) =>
                          updateBlock(block.id, { settings: { level: v ?? "h2" } })
                        }
                      >
                        <SelectTrigger className="h-7 w-32 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="h1">Heading 1</SelectItem>
                          <SelectItem value="h2">Heading 2</SelectItem>
                          <SelectItem value="h3">Heading 3</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Heading text..."
                        value={block.content}
                        onChange={(e) =>
                          updateBlock(block.id, { content: e.target.value })
                        }
                      />
                    </>
                  )}

                  {(block.type === "text" ||
                    block.type === "bullet_list" ||
                    block.type === "contact_block" ||
                    block.type === "footer") && (
                    <Textarea
                      className="min-h-[64px] text-xs"
                      placeholder={
                        block.type === "footer"
                          ? "Footer / legal text..."
                          : block.type === "contact_block"
                          ? "Contact information..."
                          : block.type === "bullet_list"
                          ? "One item per line..."
                          : "Enter text content..."
                      }
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                    />
                  )}

                  {block.type === "cta" && (
                    <>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Button text..."
                        value={block.content}
                        onChange={(e) =>
                          updateBlock(block.id, { content: e.target.value })
                        }
                      />
                      <Input
                        className="h-8 text-xs"
                        placeholder="Button URL (supports variables)..."
                        value={block.settings.url || ""}
                        onChange={(e) =>
                          updateBlock(block.id, { settings: { url: e.target.value } })
                        }
                      />
                      <Select
                        value={block.settings.style || "primary"}
                        onValueChange={(v) =>
                          updateBlock(block.id, {
                            settings: { style: v ?? "primary" },
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-40 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primary (Teal)</SelectItem>
                          <SelectItem value="secondary">Secondary (Outline)</SelectItem>
                          <SelectItem value="danger">Danger (Red)</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  {block.type === "image" && (
                    <Input
                      className="h-8 text-xs"
                      placeholder="Image URL or upload placeholder..."
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                    />
                  )}

                  {block.type === "payment_summary" && (
                    <div className="rounded-md border border-border/50 bg-muted/20 p-2 text-[10px] text-muted-foreground">
                      <p className="mb-0.5 font-medium text-foreground/80">
                        Auto-generated payment summary
                      </p>
                      <p>
                        Renders {"{{borrower.name}}"}'s account: balance, due,
                        and overdue at send time.
                      </p>
                    </div>
                  )}

                  {(block.type === "divider" || block.type === "spacer") && (
                    <p className="text-[10px] text-muted-foreground">
                      {block.type === "divider"
                        ? "Horizontal divider line"
                        : "Vertical spacer (24px)"}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tiny preview */}
      {blocks.length > 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assembled preview
          </div>
          <BlockPreview blocks={blocks} />
        </div>
      )}
    </div>
  )
}

function BlockPreview({ blocks }: { blocks: EmailBlock[] }) {
  return (
    <div className="space-y-2 text-xs leading-relaxed text-foreground">
      {blocks.map((block) => {
        switch (block.type) {
          case "heading": {
            const level = block.settings.level || "h2"
            const className =
              level === "h1"
                ? "text-lg font-semibold"
                : level === "h2"
                ? "text-base font-semibold"
                : "text-sm font-semibold"
            return (
              <div key={block.id} className={cn(className, "text-foreground")}>
                {block.content}
              </div>
            )
          }
          case "text":
            return (
              <p key={block.id} className="whitespace-pre-wrap text-foreground">
                {block.content}
              </p>
            )
          case "cta": {
            const styleClass =
              block.settings.style === "danger"
                ? "bg-destructive text-destructive-foreground"
                : block.settings.style === "secondary"
                ? "border border-border text-foreground"
                : "bg-primary text-primary-foreground"
            return (
              <div key={block.id}>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-3 py-1 text-[11px] font-medium",
                    styleClass
                  )}
                >
                  {block.content}
                </span>
              </div>
            )
          }
          case "divider":
            return <hr key={block.id} className="border-border/50" />
          case "spacer":
            return <div key={block.id} className="h-4" />
          case "image":
            return (
              <div
                key={block.id}
                className="flex h-16 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-[9px] text-muted-foreground"
              >
                Image: {block.content || "(no url)"}
              </div>
            )
          case "bullet_list":
            return (
              <ul key={block.id} className="ml-4 list-disc text-foreground">
                {block.content
                  .split("\n")
                  .filter(Boolean)
                  .map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
              </ul>
            )
          case "payment_summary":
            return (
              <div
                key={block.id}
                className="rounded-md border border-primary/30 bg-primary/5 p-2 text-[10px] text-foreground"
              >
                <div className="font-semibold text-foreground">Payment summary</div>
                <div className="mt-0.5 text-muted-foreground">
                  Account {"{{account.reference}}"} · Balance{" "}
                  {"{{account.balance}}"} · Overdue {"{{account.overdue_amount}}"}
                </div>
              </div>
            )
          case "contact_block":
            return (
              <div
                key={block.id}
                className="rounded-md bg-muted/20 p-2 text-[10px] text-muted-foreground"
              >
                {block.content}
              </div>
            )
          case "footer":
            return (
              <div
                key={block.id}
                className="border-t border-border/50 pt-2 text-[9px] text-muted-foreground"
              >
                {block.content}
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
