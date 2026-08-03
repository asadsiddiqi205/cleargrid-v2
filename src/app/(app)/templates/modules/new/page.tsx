"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Library,
  PanelTop,
  PanelBottom,
  CircleDollarSign,
  ShieldCheck,
  Smile,
  Lock,
  Languages,
  Eye,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  Minus,
  Tag,
  Code2,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { type SavedModuleKind, MODULE_KIND_LABEL } from "@/data/saved-modules"
import { getModulePresets } from "@/data/module-presets"
import { lenders } from "@/data/lenders"
import { BlockRenderer } from "@/components/composer/builder/block-renderers"
import {
  newBlockId,
  type BuilderBlock,
  type BlockKind,
} from "@/data/builder-blocks"

const KIND_ICON: Record<SavedModuleKind, typeof PanelTop> = {
  header: PanelTop,
  footer: PanelBottom,
  payment_cta: CircleDollarSign,
  compliance: ShieldCheck,
  greeting: Smile,
}

type Primitive = "text" | "image" | "button" | "divider" | "html"

const PRIMITIVES: Array<{ id: Primitive; label: string; icon: typeof Type }> = [
  { id: "text", label: "Text", icon: Type },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "button", label: "Button", icon: MousePointerClick },
  { id: "divider", label: "Divider", icon: Minus },
  { id: "html", label: "HTML", icon: Code2 },
]

const MERGE_TAGS = [
  "{{borrower_name}}",
  "{{first_name}}",
  "{{last_name}}",
  "{{account_number}}",
  "{{amount_due}}",
  "{{due_date}}",
  "{{payment_link}}",
  "{{settlement_amount}}",
  "{{discount_percent}}",
  "{{lender_name}}",
]

/* ────────── block factories ────────── */

function makeBlock(kind: BlockKind, opts?: { html?: string; moduleId?: string }): BuilderBlock {
  const id = newBlockId()
  switch (kind) {
    case "text":
      return {
        id,
        kind: "text",
        html:
          opts?.html ??
          `<p style="margin:0;color:#0F172A;font-size:14px;line-height:1.6;">New paragraph.</p>`,
      }
    case "image":
      return {
        id,
        kind: "image",
        src: "https://placehold.co/600x180/F1F5F9/64748B?text=Image",
        alt: "Image",
      }
    case "button":
      return {
        id,
        kind: "button",
        label: "Click me",
        href: "#",
        bg: "#10B981",
        color: "#FFFFFF",
        align: "center",
      }
    case "divider":
      return { id, kind: "divider", color: "#E5E7EB", thickness: 1 }
    case "spacer":
      return { id, kind: "spacer", height: 16 }
    case "payment_link":
      return {
        id,
        kind: "payment_link",
        label: "Make Payment",
        bg: "#10B981",
        color: "#FFFFFF",
        conversionEvent: "payment_initiated",
      }
    case "custom_html":
      return {
        id,
        kind: "custom_html",
        html: opts?.html ?? "<div>Custom HTML</div>",
      }
    case "saved_module":
      return { id, kind: "saved_module", moduleId: opts?.moduleId ?? "sm-payment-cta-cleargrid" }
    default:
      return {
        id,
        kind: "text",
        html: `<p style="margin:0;color:#0F172A;">New block.</p>`,
      }
  }
}

function primitiveToKind(p: Primitive): BlockKind {
  switch (p) {
    case "text":
      return "text"
    case "image":
      return "image"
    case "button":
      return "button"
    case "divider":
      return "divider"
    case "html":
      return "custom_html"
  }
}

/* ────────── serialize blocks → HTML (used at save time + raw view) ────────── */

function serializeBlocks(blocks: BuilderBlock[]): string {
  return blocks.map(blockToHtml).filter(Boolean).join("\n")
}

function blockToHtml(b: BuilderBlock): string {
  switch (b.kind) {
    case "text":
      return b.html
    case "image":
      return `<div style="text-align:center;"><img src="${b.src}" alt="${b.alt}" style="max-width:100%;display:inline-block;" /></div>`
    case "button":
      return `<div style="text-align:${b.align ?? "center"};"><a href="${b.href}" style="display:inline-block;padding:12px 28px;background:${b.bg};color:${b.color};text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">${b.label}</a></div>`
    case "payment_link":
      return `<div style="text-align:center;"><a href="#" style="display:inline-block;padding:14px 36px;background:${b.bg};color:${b.color};text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">${b.label}</a>${b.subline ? `<div style="margin-top:8px;font-size:12px;color:#6B7280;">${b.subline}</div>` : ""}</div>`
    case "divider":
      return `<hr style="border:none;border-top:${b.thickness}px solid ${b.color};margin:8px 0;" />`
    case "spacer":
      return `<div style="height:${b.height}px;"></div>`
    case "custom_html":
      return b.html
    case "saved_module":
      return `<!-- saved module ${b.moduleId} -->`
    default:
      return ""
  }
}

/* ────────── DropZone — local copy of the template builder's drop slot ────────── */

function DropZone({
  active,
  onDrop,
  empty,
}: {
  active: boolean
  onDrop: () => void
  empty?: boolean
}) {
  const [hover, setHover] = React.useState(false)
  return (
    <div
      onDragOver={(e) => {
        if (!active) return
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = "move"
        setHover(true)
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        if (!active) return
        e.preventDefault()
        e.stopPropagation()
        setHover(false)
        onDrop()
      }}
      className={cn(
        "relative transition-all",
        active ? (empty ? "h-16" : "h-6") : "h-0",
        hover && "h-10",
      )}
    >
      {active && (
        <div
          className={cn(
            "absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-full transition-all",
            hover ? "h-1.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]" : "h-0.5 bg-emerald-500/40",
          )}
        />
      )}
    </div>
  )
}

/* ────────── PAGE ────────── */

export default function ModuleBuilderPage() {
  return (
    <React.Suspense fallback={null}>
      <ModuleBuilderInner />
    </React.Suspense>
  )
}

function ModuleBuilderInner() {
  const router = useRouter()
  const search = useSearchParams()

  const initialName = search?.get("name") ?? "Untitled module"
  const initialLender = search?.get("lender") ?? "general"
  const initialKind = (search?.get("kind") as SavedModuleKind) ?? "header"
  const initialPreset = search?.get("preset") ?? ""
  const initialLocked = search?.get("locked") === "1"
  const initialBilingual = search?.get("bilingual") === "1"

  const [name, setName] = React.useState(initialName)
  const [lenderId, setLenderId] = React.useState(initialLender)
  const [kind, setKind] = React.useState<SavedModuleKind>(initialKind)
  const [locked, setLocked] = React.useState(initialLocked)
  const [bilingual, setBilingual] = React.useState(initialBilingual)
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop")
  const [view, setView] = React.useState<"preview" | "code">("preview")

  const presets = React.useMemo(() => getModulePresets(lenderId, kind), [lenderId, kind])

  /** Block stack — the actual editable model. */
  const [blocks, setBlocks] = React.useState<BuilderBlock[]>(() => {
    const initial = presets.find((p) => p.id === initialPreset) ?? presets[0]
    return initial ? [makeBlock("custom_html", { html: initial.html })] : []
  })
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [draggingId, setDraggingId] = React.useState<string | null>(null)

  const KindIcon = KIND_ICON[kind]
  const lenderLabel =
    lenderId === "general"
      ? "General · cross-lender"
      : lenders.find((l) => l.id === lenderId)?.name ?? lenderId

  /* ─── mutators ─── */
  function addBlock(kind: BlockKind, opts?: { html?: string; moduleId?: string }) {
    const blk = makeBlock(kind, opts)
    setBlocks((bs) => [...bs, blk])
    setSelectedId(blk.id)
  }
  function deleteBlock(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id))
    if (selectedId === id) setSelectedId(null)
  }
  function duplicateBlock(id: string) {
    setBlocks((bs) => {
      const idx = bs.findIndex((b) => b.id === id)
      if (idx < 0) return bs
      const orig = bs[idx]
      const copy = { ...orig, id: newBlockId() } as BuilderBlock
      const next = [...bs]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }
  function moveBlockBy(id: string, dir: "up" | "down") {
    setBlocks((bs) => {
      const idx = bs.findIndex((b) => b.id === id)
      if (idx < 0) return bs
      const target = dir === "up" ? idx - 1 : idx + 1
      if (target < 0 || target >= bs.length) return bs
      const next = [...bs]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }
  function moveBlockTo(id: string, targetIndex: number) {
    setBlocks((bs) => {
      const idx = bs.findIndex((b) => b.id === id)
      if (idx < 0) return bs
      const next = [...bs]
      const [removed] = next.splice(idx, 1)
      const adjusted = idx < targetIndex ? targetIndex - 1 : targetIndex
      next.splice(adjusted, 0, removed)
      return next
    })
  }
  function updateBlock(id: string, patch: Partial<BuilderBlock>) {
    setBlocks((bs) =>
      bs.map((b) => (b.id === id ? ({ ...b, ...patch } as BuilderBlock) : b)),
    )
  }

  function applyPreset(presetId: string) {
    const p = presets.find((pp) => pp.id === presetId)
    if (!p) return
    // Replace the stack with a single custom_html block carrying the preset.
    const replacement = makeBlock("custom_html", { html: p.html })
    setBlocks([replacement])
    setSelectedId(replacement.id)
    toast.success(`Applied preset: ${p.label}`)
  }

  function insertMergeTag(tag: string) {
    // If a text or button block is selected, append the tag to its content.
    if (selectedId) {
      const b = blocks.find((bb) => bb.id === selectedId)
      if (b?.kind === "text") {
        updateBlock(b.id, { html: b.html + " " + tag } as Partial<BuilderBlock>)
        return
      }
      if (b?.kind === "button" || b?.kind === "payment_link") {
        updateBlock(b.id, { label: b.label + " " + tag } as Partial<BuilderBlock>)
        return
      }
    }
    // Else create a new text block with just the tag.
    addBlock("text", {
      html: `<p style="margin:0;color:#0F172A;font-size:14px;line-height:1.6;">${tag}</p>`,
    })
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Give the module a name")
      return
    }
    if (blocks.length === 0) {
      toast.error("Module is empty — add a block or pick a preset")
      return
    }
    toast.success(`Saved "${name}"`, {
      description: `${blocks.length} block${blocks.length === 1 ? "" : "s"} · now available in the saved-modules library under ${MODULE_KIND_LABEL[kind]}.`,
    })
    router.push("/templates/modules")
  }

  const canvasWidth = device === "mobile" ? 360 : 600
  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* TOP BAR */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-zinc-950/80 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/templates/modules"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Saved modules
          </Link>
          <div className="h-5 w-px bg-zinc-800" />
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
            <Library className="h-3.5 w-3.5" />
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 max-w-xs border-transparent bg-transparent text-sm font-semibold hover:border-zinc-800 focus:border-zinc-700"
          />
          <Badge className="h-5 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-300">
            <KindIcon className="mr-1 h-2.5 w-2.5" />
            {MODULE_KIND_LABEL[kind]}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {blocks.length} block{blocks.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md bg-zinc-900 p-0.5 ring-1 ring-zinc-800">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-medium",
                device === "desktop" ? "bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-medium",
                device === "mobile" ? "bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Mobile
            </button>
          </div>
          <div className="flex items-center gap-0.5 rounded-md bg-zinc-900 p-0.5 ring-1 ring-zinc-800">
            <button
              type="button"
              onClick={() => setView("preview")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium",
                view === "preview" ? "bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Eye className="h-2.5 w-2.5" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => setView("code")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium",
                view === "code" ? "bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Code2 className="h-2.5 w-2.5" />
              HTML
            </button>
          </div>
          <Button onClick={handleSave} size="sm" className="h-8">
            <Save className="h-3.5 w-3.5" />
            Save module
          </Button>
        </div>
      </div>

      {/* MAIN — 3 columns */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT — Presets + Primitives + Merge tags */}
        <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-zinc-950/60 p-4">
          <Section title="Presets">
            <p className="mb-2 text-[10px] text-muted-foreground">
              {presets.length} for {lenderLabel.split(" · ")[0]}
            </p>
            <div className="space-y-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className="group block w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/40 text-left transition-colors hover:border-emerald-500/40 hover:bg-zinc-900"
                >
                  <div
                    className="origin-top-left scale-[0.5]"
                    style={{ width: "200%", height: 50, overflow: "hidden", background: "#fff" }}
                    dangerouslySetInnerHTML={{ __html: p.html }}
                  />
                  <div className="border-t border-zinc-800 px-2.5 py-1.5">
                    <p className="truncate text-[11px] font-medium text-foreground">{p.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Insert block">
            <div className="grid grid-cols-2 gap-1.5">
              {PRIMITIVES.map((p) => {
                const Icon = p.icon
                return (
                  <button
                    key={p.id}
                    onClick={() => addBlock(primitiveToKind(p.id))}
                    className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-2 text-left text-[11px] font-medium text-foreground transition-colors hover:border-emerald-500/40 hover:bg-zinc-900"
                  >
                    <Icon className="h-3 w-3" />
                    {p.label}
                  </button>
                )
              })}
            </div>
          </Section>

          <Section title="Merge tag">
            <p className="mb-1.5 text-[10px] text-muted-foreground">
              {selectedBlock
                ? `Inserts into the selected ${selectedBlock.kind} block.`
                : "No block selected — will create a new text block."}
            </p>
            <div className="flex flex-wrap gap-1">
              {MERGE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => insertMergeTag(tag)}
                  className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900/60 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300 hover:border-emerald-500/40"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </button>
              ))}
            </div>
          </Section>
        </aside>

        {/* CENTER — Canvas */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border bg-zinc-900/40 px-4 py-2 text-[11px] text-muted-foreground">
            Authoring a single module. Add blocks, drag to reorder, click ✕ to delete.
          </div>

          <div
            className="flex-1 overflow-y-auto p-8"
            onClick={() => setSelectedId(null)}
          >
            <div className="mx-auto" style={{ maxWidth: canvasWidth }}>
              {view === "preview" ? (
                <div className="overflow-hidden rounded-lg border-2 border-dashed border-emerald-500/30 bg-white p-1 shadow-lg shadow-zinc-950/40">
                  {blocks.length === 0 ? (
                    <div className="p-10 text-center text-sm text-zinc-400">
                      Empty module. Pick a preset on the left, or insert a block to start.
                    </div>
                  ) : (
                    <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                      {blocks.map((b, i) => (
                        <React.Fragment key={b.id}>
                          <DropZone
                            active={!!draggingId && draggingId !== b.id}
                            onDrop={() => {
                              if (draggingId) moveBlockTo(draggingId, i)
                            }}
                          />
                          <div className="my-1">
                            <BlockRenderer
                              block={b}
                              selected={selectedId === b.id}
                              onSelect={(id) => setSelectedId(id)}
                              onDelete={deleteBlock}
                              onDragStart={setDraggingId}
                              onDragEnd={() => setDraggingId(null)}
                              isDragging={draggingId === b.id}
                            />
                          </div>
                        </React.Fragment>
                      ))}
                      <DropZone
                        active={!!draggingId}
                        empty={blocks.length === 0}
                        onDrop={() => {
                          if (draggingId) moveBlockTo(draggingId, blocks.length)
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <Textarea
                  value={serializeBlocks(blocks)}
                  readOnly
                  className="min-h-[400px] resize-y font-mono text-[12px] leading-relaxed"
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        </main>

        {/* RIGHT — properties */}
        <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l border-border bg-zinc-950/60 p-4">
          {selectedBlock ? (
            <BlockProperties
              block={selectedBlock}
              onUpdate={(patch) => updateBlock(selectedBlock.id, patch)}
              onDelete={() => deleteBlock(selectedBlock.id)}
              onDuplicate={() => duplicateBlock(selectedBlock.id)}
              onMoveUp={() => moveBlockBy(selectedBlock.id, "up")}
              onMoveDown={() => moveBlockBy(selectedBlock.id, "down")}
            />
          ) : (
            <ModuleProperties
              kind={kind}
              setKind={setKind}
              lenderId={lenderId}
              setLenderId={setLenderId}
              locked={locked}
              setLocked={setLocked}
              bilingual={bilingual}
              setBilingual={setBilingual}
              lenderLabel={lenderLabel}
            />
          )}
        </aside>
      </div>
    </div>
  )
}

/* ────────── Block properties (right rail when a block is selected) ────────── */

function BlockProperties({
  block,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  block: BuilderBlock
  onUpdate: (patch: Partial<BuilderBlock>) => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">
          {block.kind.replace("_", " ")}
        </span>
        <div className="flex items-center gap-0.5">
          <IconBtn title="Move up" onClick={onMoveUp}>
            <ChevronUp className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn title="Move down" onClick={onMoveDown}>
            <ChevronDown className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn title="Duplicate" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn title="Delete" onClick={onDelete} danger>
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </div>

      <KindFields block={block} onUpdate={onUpdate} />
    </div>
  )
}

function KindFields({
  block,
  onUpdate,
}: {
  block: BuilderBlock
  onUpdate: (patch: Partial<BuilderBlock>) => void
}) {
  switch (block.kind) {
    case "text":
      return (
        <PropField label="HTML">
          <Textarea
            value={block.html}
            onChange={(e) => onUpdate({ html: e.target.value } as Partial<BuilderBlock>)}
            className="min-h-[120px] font-mono text-[11px]"
          />
        </PropField>
      )
    case "image":
      return (
        <div className="space-y-3">
          <PropField label="Image URL">
            <Input
              value={block.src}
              onChange={(e) => onUpdate({ src: e.target.value } as Partial<BuilderBlock>)}
              className="h-8 text-[11px]"
            />
          </PropField>
          <PropField label="Alt text">
            <Input
              value={block.alt}
              onChange={(e) => onUpdate({ alt: e.target.value } as Partial<BuilderBlock>)}
              className="h-8 text-[11px]"
            />
          </PropField>
        </div>
      )
    case "button":
      return (
        <div className="space-y-3">
          <PropField label="Label">
            <Input
              value={block.label}
              onChange={(e) => onUpdate({ label: e.target.value } as Partial<BuilderBlock>)}
              className="h-8 text-[11px]"
            />
          </PropField>
          <PropField label="Href">
            <Input
              value={block.href}
              onChange={(e) => onUpdate({ href: e.target.value } as Partial<BuilderBlock>)}
              className="h-8 text-[11px]"
            />
          </PropField>
          <div className="grid grid-cols-2 gap-2">
            <PropField label="Background">
              <ColorRow
                value={block.bg}
                onChange={(v) => onUpdate({ bg: v } as Partial<BuilderBlock>)}
              />
            </PropField>
            <PropField label="Text">
              <ColorRow
                value={block.color}
                onChange={(v) => onUpdate({ color: v } as Partial<BuilderBlock>)}
              />
            </PropField>
          </div>
        </div>
      )
    case "divider":
      return (
        <div className="space-y-3">
          <PropField label="Colour">
            <ColorRow
              value={block.color}
              onChange={(v) => onUpdate({ color: v } as Partial<BuilderBlock>)}
            />
          </PropField>
          <PropField label="Thickness (px)">
            <Input
              type="number"
              value={block.thickness}
              onChange={(e) =>
                onUpdate({ thickness: Number(e.target.value) || 1 } as Partial<BuilderBlock>)
              }
              className="h-8 text-[11px]"
            />
          </PropField>
        </div>
      )
    case "spacer":
      return (
        <PropField label="Height (px)">
          <Input
            type="number"
            value={block.height}
            onChange={(e) =>
              onUpdate({ height: Number(e.target.value) || 0 } as Partial<BuilderBlock>)
            }
            className="h-8 text-[11px]"
          />
        </PropField>
      )
    case "custom_html":
      return (
        <PropField label="HTML">
          <Textarea
            value={block.html}
            onChange={(e) => onUpdate({ html: e.target.value } as Partial<BuilderBlock>)}
            className="min-h-[160px] font-mono text-[11px]"
            spellCheck={false}
          />
        </PropField>
      )
    case "payment_link":
      return (
        <div className="space-y-3">
          <PropField label="Label">
            <Input
              value={block.label}
              onChange={(e) => onUpdate({ label: e.target.value } as Partial<BuilderBlock>)}
              className="h-8 text-[11px]"
            />
          </PropField>
          <PropField label="Subline">
            <Input
              value={block.subline ?? ""}
              onChange={(e) => onUpdate({ subline: e.target.value } as Partial<BuilderBlock>)}
              className="h-8 text-[11px]"
            />
          </PropField>
          <div className="grid grid-cols-2 gap-2">
            <PropField label="Background">
              <ColorRow
                value={block.bg}
                onChange={(v) => onUpdate({ bg: v } as Partial<BuilderBlock>)}
              />
            </PropField>
            <PropField label="Text">
              <ColorRow
                value={block.color}
                onChange={(v) => onUpdate({ color: v } as Partial<BuilderBlock>)}
              />
            </PropField>
          </div>
        </div>
      )
    default:
      return null
  }
}

function ColorRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-9 cursor-pointer rounded border border-zinc-800 bg-transparent"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 flex-1 font-mono text-[10px]"
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

/* ────────── Module properties (right rail when nothing selected) ────────── */

function ModuleProperties({
  kind,
  setKind,
  lenderId,
  setLenderId,
  locked,
  setLocked,
  bilingual,
  setBilingual,
  lenderLabel,
}: {
  kind: SavedModuleKind
  setKind: (k: SavedModuleKind) => void
  lenderId: string
  setLenderId: (id: string) => void
  locked: boolean
  setLocked: (v: boolean) => void
  bilingual: boolean
  setBilingual: (v: boolean) => void
  lenderLabel: string
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Module properties
      </p>

      <PropField label="Kind">
        <div className="grid grid-cols-5 gap-1">
          {(["header", "footer", "payment_cta", "compliance", "greeting"] as SavedModuleKind[]).map((k) => {
            const Icon = KIND_ICON[k]
            return (
              <button
                key={k}
                onClick={() => setKind(k)}
                title={MODULE_KIND_LABEL[k]}
                className={cn(
                  "flex h-8 items-center justify-center rounded border transition-colors",
                  kind === k
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700",
                )}
              >
                <Icon className="h-3 w-3" />
              </button>
            )
          })}
        </div>
      </PropField>

      <PropField label="Lender scope">
        <select
          value={lenderId}
          onChange={(e) => setLenderId(e.target.value)}
          className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[12px]"
        >
          <option value="general">General (cross-lender)</option>
          {lenders.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </PropField>

      <button
        onClick={() => setLocked(!locked)}
        className={cn(
          "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors",
          locked
            ? "border-amber-500/40 bg-amber-500/10"
            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
        )}
      >
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-foreground">
            {locked ? "Locked in templates" : "Editable in templates"}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {locked ? "Embeds can't edit content inline." : "Embeds can override copy."}
          </p>
        </div>
        <Lock className={cn("h-3.5 w-3.5", locked ? "text-amber-300" : "text-zinc-500")} />
      </button>

      <button
        onClick={() => setBilingual(!bilingual)}
        className={cn(
          "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors",
          bilingual
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
        )}
      >
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-foreground">
            {bilingual ? "Bilingual EN/AR" : "Single language"}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {bilingual ? "Renders EN + AR side-by-side." : "One language only."}
          </p>
        </div>
        <Languages className={cn("h-3.5 w-3.5", bilingual ? "text-emerald-300" : "text-zinc-500")} />
      </button>

      <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">Tip</p>
        <p className="mt-1">
          Click a block on the canvas to edit its properties here. Once saved, this module shows up
          in the v3 builder&apos;s palette and can be embedded into any template scoped to{" "}
          <strong className="text-foreground">{lenderLabel.split(" · ")[0]}</strong>.
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

function PropField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
