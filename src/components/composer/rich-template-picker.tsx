"use client"

import * as React from "react"
import { Search, Mail, Tag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  richEmailTemplates,
  type RichEmailTemplate,
} from "@/data/rich-email-templates"

const PURPOSE_LABEL: Record<string, string> = {
  reminder: "Payment Reminder",
  "ptp-confirmation": "PTP Confirmation",
  settlement: "Settlement Offer",
  "final-notice": "Final Notice",
  welcome: "Welcome",
  hardship: "Hardship Outreach",
  "broken-promise": "Broken Promise Recovery",
}

interface RichTemplatePickerProps {
  onSelect: (template: RichEmailTemplate) => void
}

/**
 * Template picker with rendered thumbnails. Reuses lender + purpose + status
 * filters and a search box, matching the existing templates listing structure.
 */
export function RichTemplatePicker({ onSelect }: RichTemplatePickerProps) {
  const [search, setSearch] = React.useState("")
  const [lenderFilter, setLenderFilter] = React.useState("all")
  const [purposeFilter, setPurposeFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")

  const lenders = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const t of richEmailTemplates) map.set(t.lenderId, t.lenderName)
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [])

  const purposes = React.useMemo(() => {
    const set = new Set<string>()
    for (const t of richEmailTemplates) set.add(t.purpose)
    return Array.from(set)
  }, [])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return richEmailTemplates.filter((t) => {
      if (lenderFilter !== "all" && t.lenderId !== lenderFilter) return false
      if (purposeFilter !== "all" && t.purpose !== purposeFilter) return false
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (
        q &&
        !t.name.toLowerCase().includes(q) &&
        !t.description.toLowerCase().includes(q) &&
        !t.subject.toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [search, lenderFilter, purposeFilter, statusFilter])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="font-heading text-lg font-semibold text-foreground">Choose a template</h3>
        <p className="text-[11px] text-muted-foreground">
          Pick a designer-approved template. You can edit text, images and buttons inside the locked layout.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Lender</label>
          <Select value={lenderFilter} onValueChange={(v) => setLenderFilter(v ?? "all")}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lenders</SelectItem>
              {lenders.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Purpose</label>
          <Select value={purposeFilter} onValueChange={(v) => setPurposeFilter(v ?? "all")}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All purposes</SelectItem>
              {purposes.map((p) => (
                <SelectItem key={p} value={p}>
                  {PURPOSE_LABEL[p] ?? p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Channel</label>
          <Select value="email" onValueChange={() => {}}>
            <SelectTrigger className="h-8 w-[120px]" disabled>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative ml-auto min-w-[180px] flex-1 space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-8 text-center">
          <Mail className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">No templates match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TemplateCard key={t.id} template={t} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────
 * Card — with real mini-preview rendered from the template
 * ──────────────────────────────────────────────────────────────────── */

function TemplateCard({
  template,
  onSelect,
}: {
  template: RichEmailTemplate
  onSelect: (template: RichEmailTemplate) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-lg"
    >
      {/* Mini rendered preview */}
      <div className="relative h-[180px] overflow-hidden rounded-lg border border-border bg-zinc-900">
        <div
          style={{
            transform: "scale(0.32)",
            transformOrigin: "top left",
            width: "calc(100% / 0.32)",
            height: "calc(100% / 0.32)",
            pointerEvents: "none",
          }}
        >
          {template.render({
            slots: template.defaultSlots,
            interactive: false,
          })}
        </div>
        {/* gradient fade so the card looks intentional */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
          style={{
            background: "linear-gradient(to top, rgba(24,24,27,0.95), rgba(24,24,27,0))",
          }}
        />
      </div>

      {/* Title + meta */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-1 text-sm font-semibold text-foreground">{template.name}</h4>
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium",
              template.status === "active" && "bg-emerald-500/15 text-emerald-400",
              template.status === "draft" && "bg-zinc-500/15 text-zinc-400",
              template.status === "archived" && "bg-red-500/15 text-red-400",
            )}
          >
            {template.status}
          </span>
        </div>
        <p className="line-clamp-2 text-[11px] text-muted-foreground">{template.description}</p>
      </div>

      {/* Pills */}
      <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
        <Badge className="bg-muted/80 text-[9px] text-muted-foreground">
          <Mail className="h-2.5 w-2.5" />
          Email
        </Badge>
        <Badge className="bg-primary/10 text-[9px] text-primary ring-1 ring-primary/30">
          {PURPOSE_LABEL[template.purpose] ?? template.purpose}
        </Badge>
        <Badge className="bg-muted/80 text-[9px] text-muted-foreground">
          <Tag className="h-2.5 w-2.5" />
          {template.lenderName}
        </Badge>
      </div>
    </button>
  )
}
