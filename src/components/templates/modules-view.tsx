"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Library,
  Lock,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Pencil,
  Copy,
  Archive,
  MoreVertical,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  savedModules,
  MODULE_KIND_LABEL,
  type SavedModule,
  type SavedModuleKind,
} from "@/data/saved-modules"
import { lenders } from "@/data/lenders"
import { NewModuleSheet } from "@/components/composer/creation-sheets"

const KIND_FILTERS: Array<{ id: SavedModuleKind | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "header", label: "Headers" },
  { id: "footer", label: "Footers" },
  { id: "payment_cta", label: "Payment CTAs" },
  { id: "compliance", label: "Compliance" },
  { id: "greeting", label: "Greetings" },
]

export function ModulesView() {
  const [kind, setKind] = React.useState<SavedModuleKind | "all">("all")
  const [lenderId, setLenderId] = React.useState<string>("all")
  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState<SavedModule | null>(null)
  const [openCreate, setOpenCreate] = React.useState(false)

  const filtered = savedModules.filter((m) => {
    if (kind !== "all" && m.kind !== kind) return false
    if (lenderId !== "all" && m.lenderId !== lenderId) return false
    if (search && !`${m.name} ${m.description}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Saved modules
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Authored once · updates propagate to every template that embeds them
            </p>
          </div>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            New module
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules…"
              className="h-7 w-64 pl-7 text-[11px]"
            />
          </div>
          <div className="flex items-center gap-0.5 rounded-md bg-zinc-900 p-0.5 ring-1 ring-zinc-800">
            {KIND_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setKind(f.id)}
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-medium transition-colors",
                  kind === f.id ? "bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={lenderId}
            onChange={(e) => setLenderId(e.target.value)}
            className="h-7 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[11px]"
          >
            <option value="all">All lenders</option>
            <option value="general">General (cross-lender)</option>
            {lenders.map((l) => (
              <option key={l.id} value={l.id}>
                {l.shortName}
              </option>
            ))}
          </select>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No modules match.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((m) => (
                <ModuleCard
                  key={m.id}
                  module={m}
                  onClick={() => setSelected(m)}
                  active={selected?.id === m.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Side detail */}
      {selected && (
        <ModuleDetail module={selected} onClose={() => setSelected(null)} />
      )}

      <NewModuleSheet
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        defaultKind={kind === "all" ? undefined : kind}
      />
    </div>
  )
}

function ModuleCard({
  module,
  onClick,
  active,
}: {
  module: SavedModule
  onClick: () => void
  active: boolean
}) {
  const lender = lenders.find((l) => l.id === module.lenderId)
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col gap-2 rounded-lg border bg-zinc-900/40 p-4 text-left transition-all hover:bg-zinc-900/70",
        active ? "border-emerald-500/40 bg-emerald-500/5" : "border-zinc-800 hover:border-zinc-700",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-300">
          <Library className="h-2.5 w-2.5" />
          {MODULE_KIND_LABEL[module.kind]}
        </div>
        <div className="flex items-center gap-1">
          {module.locked && (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 py-px text-[9px] font-medium text-amber-300">
              <Lock className="h-2 w-2" />
              Locked
            </span>
          )}
          {module.bilingual && (
            <span className="rounded bg-blue-500/15 px-1 py-px text-[9px] font-medium text-blue-300">EN/AR</span>
          )}
          <Badge
            className={cn(
              "h-4 text-[9px]",
              module.status === "active"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-700 bg-zinc-800 text-zinc-400",
            )}
          >
            {module.status === "active" ? "Active" : "Draft"}
          </Badge>
        </div>
      </div>

      <h3 className="text-[13px] font-semibold text-foreground">{module.name}</h3>
      <p className="line-clamp-2 text-[11px] text-muted-foreground">{module.description}</p>

      {/* Preview */}
      <div
        className="rounded-md border border-zinc-200 bg-white p-2 [zoom:0.85]"
        dangerouslySetInnerHTML={{ __html: module.previewHtml }}
      />

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{lender?.shortName ?? "General"}</span>
        <span>Used in {module.usedByCount} template{module.usedByCount === 1 ? "" : "s"}</span>
      </div>
    </button>
  )
}

function ModuleDetail({ module: m, onClose }: { module: SavedModule; onClose: () => void }) {
  return (
    <div className="flex w-96 shrink-0 flex-col border-l border-border bg-zinc-950/60">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-300">
              <Library className="h-2.5 w-2.5" />
              {MODULE_KIND_LABEL[m.kind]}
            </span>
            {m.locked && (
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 py-px text-[9px] font-medium text-amber-300">
                <Lock className="h-2 w-2" />
                Locked
              </span>
            )}
          </div>
          <h2 className="truncate text-sm font-bold text-foreground">{m.name}</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-[12px]">
        <p className="leading-relaxed text-muted-foreground">{m.description}</p>

        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
          <div
            className="rounded-md border border-zinc-300 bg-white p-3 [zoom:0.95]"
            dangerouslySetInnerHTML={{ __html: m.previewHtml }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-zinc-900/60 p-2.5">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Used in</p>
            <p className="text-[14px] font-bold tabular-nums text-foreground">{m.usedByCount}</p>
            <p className="text-[9px] text-muted-foreground">templates</p>
          </div>
          <div className="rounded-md border border-border bg-zinc-900/60 p-2.5">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Last updated</p>
            <p className="text-[12px] font-medium text-foreground">
              {new Date(m.updatedAt).toLocaleDateString()}
            </p>
            <p className="text-[9px] text-muted-foreground">by {m.updatedBy}</p>
          </div>
        </div>

        {m.locked && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
            <strong>Locked module:</strong> templates can embed this but cannot edit its content
            inline. Changes here propagate everywhere.
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-[11px]">
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-7 px-2" />}>
              <MoreVertical className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.info("Duplicated module — opens in editor")}>
                <Copy className="h-3 w-3" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Archived. Embeds remain valid but new templates won't see it.")}>
                <Archive className="h-3 w-3" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
