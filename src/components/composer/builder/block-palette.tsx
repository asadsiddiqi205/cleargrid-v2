"use client"

import * as React from "react"
import {
  Type,
  Image,
  MousePointerClick,
  Minus,
  MoveVertical,
  TableProperties,
  Share2,
  Video,
  Code2,
  Library,
  GitBranchPlus,
  CircleDollarSign,
  type LucideIcon,
  Search,
  Pin,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { BLOCK_CATALOG, type BlockKind } from "@/data/builder-blocks"
import { savedModules, MODULE_KIND_LABEL } from "@/data/saved-modules"

const ICONS: Record<string, LucideIcon> = {
  Type,
  Image,
  MousePointerClick,
  Minus,
  MoveVertical,
  TableProperties,
  Share2,
  Video,
  Code2,
  Library,
  GitBranchPlus,
  CircleDollarSign,
}

interface BlockPaletteProps {
  onInsert: (kind: BlockKind, moduleId?: string) => void
  /** Called when the user starts dragging a palette item, so the canvas
   *  can light up drop zones. */
  onPaletteDragStart?: (kind: BlockKind, moduleId?: string) => void
  /** Called on drag end (whether dropped or cancelled). */
  onPaletteDragEnd?: () => void
}

/** MIME type for palette → canvas drag payload. */
export const PALETTE_DRAG_MIME = "application/x-cleargrid-palette"

export function BlockPalette({ onInsert, onPaletteDragStart, onPaletteDragEnd }: BlockPaletteProps) {
  const [tab, setTab] = React.useState<"blocks" | "modules">("blocks")
  const [search, setSearch] = React.useState("")

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-zinc-950/60">
      <div className="border-b border-border px-3 py-3">
        <div className="mb-2 flex items-center gap-1 rounded-md bg-zinc-900 p-0.5 ring-1 ring-zinc-800">
          <button
            onClick={() => setTab("blocks")}
            className={cn(
              "flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
              tab === "blocks" ? "bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Blocks
          </button>
          <button
            onClick={() => setTab("modules")}
            className={cn(
              "flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
              tab === "modules" ? "bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Saved modules
          </button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "blocks" ? "Search blocks…" : "Search modules…"}
            className="h-7 pl-7 text-[11px]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "blocks" ? (
          <BlocksList
            search={search}
            onInsert={onInsert}
            onPaletteDragStart={onPaletteDragStart}
            onPaletteDragEnd={onPaletteDragEnd}
          />
        ) : (
          <ModulesList
            search={search}
            onInsert={onInsert}
            onPaletteDragStart={onPaletteDragStart}
            onPaletteDragEnd={onPaletteDragEnd}
          />
        )}
      </div>
    </div>
  )
}

function BlocksList({
  search,
  onInsert,
  onPaletteDragStart,
  onPaletteDragEnd,
}: {
  search: string
  onInsert: BlockPaletteProps["onInsert"]
  onPaletteDragStart?: BlockPaletteProps["onPaletteDragStart"]
  onPaletteDragEnd?: BlockPaletteProps["onPaletteDragEnd"]
}) {
  const filtered = BLOCK_CATALOG.filter(
    (b) =>
      b.label.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase()),
  )
  const featured = filtered.filter((b) => b.featured)
  const others = filtered.filter((b) => !b.featured)

  return (
    <div className="space-y-4">
      {featured.length > 0 && (
        <Section title="Featured">
          {featured.map((b) => {
            const Icon = ICONS[b.iconName] ?? Type
            return (
              <PaletteCard
                key={b.kind}
                kind={b.kind}
                icon={Icon}
                label={b.label}
                description={b.description}
                accent={b.kind === "payment_link"}
                onClick={() => onInsert(b.kind)}
                onPaletteDragStart={onPaletteDragStart}
                onPaletteDragEnd={onPaletteDragEnd}
              />
            )
          })}
        </Section>
      )}
      {others.length > 0 && (
        <Section title="All blocks">
          {others.map((b) => {
            const Icon = ICONS[b.iconName] ?? Type
            return (
              <PaletteCard
                key={b.kind}
                kind={b.kind}
                icon={Icon}
                label={b.label}
                description={b.description}
                onClick={() => onInsert(b.kind)}
                onPaletteDragStart={onPaletteDragStart}
                onPaletteDragEnd={onPaletteDragEnd}
              />
            )
          })}
        </Section>
      )}
    </div>
  )
}

function ModulesList({
  search,
  onInsert,
  onPaletteDragStart,
  onPaletteDragEnd,
}: {
  search: string
  onInsert: BlockPaletteProps["onInsert"]
  onPaletteDragStart?: BlockPaletteProps["onPaletteDragStart"]
  onPaletteDragEnd?: BlockPaletteProps["onPaletteDragEnd"]
}) {
  const filtered = savedModules.filter(
    (m) =>
      m.status === "active" &&
      (m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase())),
  )

  if (filtered.length === 0) {
    return (
      <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">
        No modules match.
      </p>
    )
  }

  // Group by kind
  const byKind: Record<string, typeof filtered> = {}
  for (const m of filtered) {
    if (!byKind[m.kind]) byKind[m.kind] = []
    byKind[m.kind].push(m)
  }

  return (
    <div className="space-y-4">
      {Object.entries(byKind).map(([kind, mods]) => (
        <Section key={kind} title={MODULE_KIND_LABEL[kind as keyof typeof MODULE_KIND_LABEL]}>
          {mods.map((m) => (
            <button
              key={m.id}
              draggable
              onDragStart={(e) => {
                const payload = JSON.stringify({ kind: "saved_module", moduleId: m.id })
                e.dataTransfer.effectAllowed = "copy"
                e.dataTransfer.setData(PALETTE_DRAG_MIME, payload)
                e.dataTransfer.setData("text/plain", payload)
                onPaletteDragStart?.("saved_module", m.id)
              }}
              onDragEnd={() => onPaletteDragEnd?.()}
              onClick={() => onInsert("saved_module", m.id)}
              className="group flex w-full cursor-grab items-start gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5 text-left transition-colors hover:border-emerald-500/40 hover:bg-zinc-900 active:cursor-grabbing"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-300">
                <Library className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[11px] font-medium text-foreground">{m.name}</p>
                  {m.locked && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-zinc-800 px-1 py-px text-[8px] font-medium text-zinc-400">
                      <Pin className="h-2 w-2" />
                      Locked
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                  {m.description}
                </p>
                <p className="mt-1 text-[9px] text-muted-foreground/70">
                  Used in {m.usedByCount} template{m.usedByCount === 1 ? "" : "s"}
                </p>
              </div>
            </button>
          ))}
        </Section>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function PaletteCard({
  kind,
  icon: Icon,
  label,
  description,
  accent,
  onClick,
  onPaletteDragStart,
  onPaletteDragEnd,
}: {
  kind: BlockKind
  icon: LucideIcon
  label: string
  description: string
  accent?: boolean
  onClick: () => void
  onPaletteDragStart?: (kind: BlockKind, moduleId?: string) => void
  onPaletteDragEnd?: () => void
}) {
  return (
    <button
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        const payload = JSON.stringify({ kind })
        e.dataTransfer.effectAllowed = "copy"
        e.dataTransfer.setData(PALETTE_DRAG_MIME, payload)
        e.dataTransfer.setData("text/plain", payload)
        onPaletteDragStart?.(kind)
      }}
      onDragEnd={() => onPaletteDragEnd?.()}
      className={cn(
        "group flex w-full cursor-grab items-start gap-2 rounded-md border bg-zinc-900/60 p-2.5 text-left transition-colors active:cursor-grabbing",
        accent
          ? "border-emerald-500/40 hover:border-emerald-500/70 hover:bg-emerald-500/5"
          : "border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-900",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded",
          accent ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-300",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  )
}
