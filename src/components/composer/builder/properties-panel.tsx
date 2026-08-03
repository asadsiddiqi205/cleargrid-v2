"use client"

import * as React from "react"
import {
  Trash2,
  Lock,
  Unlock,
  GitBranchPlus,
  Sparkles,
  Tag,
  Palette,
  Copy,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { BuilderBlock, BuilderDocument } from "@/data/builder-blocks"
import { cn } from "@/lib/utils"

interface PropertiesPanelProps {
  doc: BuilderDocument
  selectedBlock: BuilderBlock | null
  onUpdateBlock: (blockId: string, patch: Partial<BuilderBlock>) => void
  onDeleteBlock: (blockId: string) => void
  onDuplicateBlock: (blockId: string) => void
  onMoveBlock: (blockId: string, dir: "up" | "down") => void
  onUpdateDoc: (patch: Partial<BuilderDocument>) => void
  onOpenConditional: (blockId: string) => void
  onOpenInlineAi: (blockId: string) => void
  onOpenMergeTags: (blockId: string) => void
}

export function PropertiesPanel(props: PropertiesPanelProps) {
  const { selectedBlock } = props
  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-zinc-950/60">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {selectedBlock ? "Block properties" : "Page properties"}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {selectedBlock ? (
          <BlockProperties {...props} block={selectedBlock} />
        ) : (
          <DocumentProperties doc={props.doc} onUpdateDoc={props.onUpdateDoc} />
        )}
      </div>
    </div>
  )
}

function BlockProperties({
  block,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onOpenConditional,
  onOpenInlineAi,
  onOpenMergeTags,
}: PropertiesPanelProps & { block: BuilderBlock }) {
  const isLocked = !!block.locked
  return (
    <div className="space-y-4">
      {/* Header strip — block kind + toolbar */}
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-zinc-900/60 px-2.5 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
          {block.kind.replace("_", " ")}
        </span>
        <div className="flex items-center gap-0.5">
          <IconBtn title="Move up" onClick={() => onMoveBlock(block.id, "up")}>
            <ChevronUp className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn title="Move down" onClick={() => onMoveBlock(block.id, "down")}>
            <ChevronDown className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn title="Duplicate" onClick={() => onDuplicateBlock(block.id)}>
            <Copy className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn title="Delete" onClick={() => onDeleteBlock(block.id)} danger>
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </div>

      {/* Locking + conditional row */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onUpdateBlock(block.id, { locked: !isLocked } as Partial<BuilderBlock>)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
            isLocked
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
              : "border-zinc-800 bg-zinc-900/60 text-foreground hover:border-zinc-700",
          )}
        >
          {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          {isLocked ? "Locked" : "Editable"}
        </button>
        <button
          onClick={() => onOpenConditional(block.id)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
            block.conditional
              ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
              : "border-zinc-800 bg-zinc-900/60 text-foreground hover:border-zinc-700",
          )}
        >
          <GitBranchPlus className="h-3 w-3" />
          {block.conditional ? "Conditional" : "Add condition"}
        </button>
      </div>

      {/* Per-kind fields */}
      <KindFields block={block} onUpdateBlock={onUpdateBlock} />

      {/* Inline AI + merge tags */}
      {(block.kind === "text" || block.kind === "button" || block.kind === "payment_link") && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Smart actions
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => onOpenInlineAi(block.id)}
            >
              <Sparkles className="h-3 w-3" />
              AI assist
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => onOpenMergeTags(block.id)}
            >
              <Tag className="h-3 w-3" />
              Merge tag
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function KindFields({
  block,
  onUpdateBlock,
}: {
  block: BuilderBlock
  onUpdateBlock: (id: string, patch: Partial<BuilderBlock>) => void
}) {
  switch (block.kind) {
    case "text":
      return (
        <Field label="HTML">
          <Textarea
            value={block.html}
            onChange={(e) => onUpdateBlock(block.id, { html: e.target.value } as Partial<BuilderBlock>)}
            className="min-h-[120px] font-mono text-[11px]"
          />
        </Field>
      )
    case "image":
      return (
        <div className="space-y-3">
          <Field label="Image URL">
            <Input
              value={block.src}
              onChange={(e) => onUpdateBlock(block.id, { src: e.target.value } as Partial<BuilderBlock>)}
              className="h-7 text-[11px]"
            />
          </Field>
          <Field label="Alt text">
            <Input
              value={block.alt}
              onChange={(e) => onUpdateBlock(block.id, { alt: e.target.value } as Partial<BuilderBlock>)}
              className="h-7 text-[11px]"
            />
          </Field>
          <Field label="Link (optional)">
            <Input
              value={block.href ?? ""}
              onChange={(e) => onUpdateBlock(block.id, { href: e.target.value } as Partial<BuilderBlock>)}
              className="h-7 text-[11px]"
            />
          </Field>
        </div>
      )
    case "button":
    case "payment_link":
      return (
        <div className="space-y-3">
          <Field label="Label">
            <Input
              value={block.label}
              onChange={(e) => onUpdateBlock(block.id, { label: e.target.value } as Partial<BuilderBlock>)}
              className="h-7 text-[11px]"
            />
          </Field>
          {block.kind === "payment_link" && (
            <Field label="Sub-line (under the button)">
              <Input
                value={block.subline ?? ""}
                onChange={(e) => onUpdateBlock(block.id, { subline: e.target.value } as Partial<BuilderBlock>)}
                className="h-7 text-[11px]"
              />
            </Field>
          )}
          {block.kind === "button" && (
            <Field label="Href">
              <Input
                value={block.href}
                onChange={(e) => onUpdateBlock(block.id, { href: e.target.value } as Partial<BuilderBlock>)}
                className="h-7 text-[11px]"
              />
            </Field>
          )}
          <Field label="Background">
            <ColorRow
              value={block.bg}
              onChange={(v) => onUpdateBlock(block.id, { bg: v } as Partial<BuilderBlock>)}
            />
          </Field>
          <Field label="Text colour">
            <ColorRow
              value={block.color}
              onChange={(v) => onUpdateBlock(block.id, { color: v } as Partial<BuilderBlock>)}
            />
          </Field>
          {block.kind === "payment_link" && (
            <Field label="Conversion event">
              <select
                value={block.conversionEvent}
                onChange={(e) =>
                  onUpdateBlock(block.id, {
                    conversionEvent: e.target.value as never,
                  } as Partial<BuilderBlock>)
                }
                className="h-7 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[11px]"
              >
                <option value="payment_initiated">Payment initiated</option>
                <option value="ptp_captured">PTP captured</option>
                <option value="settlement_accepted">Settlement accepted</option>
              </select>
            </Field>
          )}
        </div>
      )
    case "divider":
      return (
        <div className="space-y-3">
          <Field label="Colour">
            <ColorRow
              value={block.color}
              onChange={(v) => onUpdateBlock(block.id, { color: v } as Partial<BuilderBlock>)}
            />
          </Field>
          <Field label="Thickness (px)">
            <Input
              type="number"
              value={block.thickness}
              onChange={(e) =>
                onUpdateBlock(block.id, {
                  thickness: Number(e.target.value) || 1,
                } as Partial<BuilderBlock>)
              }
              className="h-7 text-[11px]"
            />
          </Field>
        </div>
      )
    case "spacer":
      return (
        <Field label="Height (px)">
          <Input
            type="number"
            value={block.height}
            onChange={(e) =>
              onUpdateBlock(block.id, { height: Number(e.target.value) || 0 } as Partial<BuilderBlock>)
            }
            className="h-7 text-[11px]"
          />
        </Field>
      )
    case "custom_html":
      return (
        <Field label="HTML">
          <Textarea
            value={block.html}
            onChange={(e) => onUpdateBlock(block.id, { html: e.target.value } as Partial<BuilderBlock>)}
            className="min-h-[160px] font-mono text-[11px]"
          />
        </Field>
      )
    case "saved_module":
      return (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground">Saved module reference</p>
          <p className="mt-1 leading-relaxed">
            This block syncs from a saved module. Update the module in the Modules library to push
            changes to every template that embeds it.
          </p>
        </div>
      )
    case "ai_conditional":
      return (
        <Field label="Rule label">
          <Input
            value={block.ruleLabel}
            onChange={(e) =>
              onUpdateBlock(block.id, { ruleLabel: e.target.value } as Partial<BuilderBlock>)
            }
            className="h-7 text-[11px]"
          />
        </Field>
      )
    default:
      return null
  }
}

function DocumentProperties({
  doc,
  onUpdateDoc,
}: {
  doc: BuilderDocument
  onUpdateDoc: (patch: Partial<BuilderDocument>) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground">
        Tip: click a block in the canvas to edit it.
      </p>
      <Field label="Language">
        <div className="grid grid-cols-3 gap-1">
          {(["en", "ar", "bilingual"] as const).map((l) => (
            <button
              key={l}
              onClick={() =>
                onUpdateDoc({
                  language: l,
                  dir: l === "ar" ? "rtl" : "ltr",
                })
              }
              className={cn(
                "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
                doc.language === l
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800 bg-zinc-900/60 text-foreground hover:border-zinc-700",
              )}
            >
              {l === "en" ? "English" : l === "ar" ? "Arabic" : "Bilingual"}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Page background">
        <ColorRow value={doc.pageBg} onChange={(v) => onUpdateDoc({ pageBg: v })} />
      </Field>
      <Field label="Content width (px)">
        <Input
          type="number"
          value={doc.contentWidth}
          onChange={(e) => onUpdateDoc({ contentWidth: Number(e.target.value) || 600 })}
          className="h-7 text-[11px]"
        />
      </Field>
      <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-[10px] text-muted-foreground">
        <Palette className="mb-1 inline-block h-3 w-3" /> Colors and fonts inherit from the
        brand kit attached to this template's lender.
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function ColorRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border border-zinc-800 bg-transparent"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 flex-1 font-mono text-[11px]"
      />
    </div>
  )
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "rounded p-1 text-muted-foreground transition-colors hover:bg-zinc-800",
        danger ? "hover:text-red-300" : "hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
