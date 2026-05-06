"use client"

import * as React from "react"
import Link from "next/link"
import { Search, Plus, Mail, Tag, Globe } from "lucide-react"

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
  templates as allTemplates,
  PURPOSE_LABELS,
  type Template,
  type TemplatePurpose,
} from "@/data/templates"

interface EmailTemplateModeProps {
  /** Called when user picks a template — parent should load it into the editor and switch to inline mode. */
  onSelectTemplate: (template: Template) => void
}

type FilterDimension = "all" | "lender" | "purpose"

/**
 * Template browser for the Email "Template" mode.
 *
 * Header has filter dropdown (Lender / Purpose / All) + search input.
 * Grid of cards (3 columns). Click a card to load the template into the editor
 * (parent switches to inline mode).
 */
export function EmailTemplateMode({ onSelectTemplate }: EmailTemplateModeProps) {
  const [search, setSearch] = React.useState("")
  const [dimension, setDimension] = React.useState<FilterDimension>("all")
  const [filterValue, setFilterValue] = React.useState<string>("all")

  // All email templates
  const emailTemplates = React.useMemo(
    () => allTemplates.filter((t) => t.channel === "email"),
    []
  )

  // Available lenders/purposes for the dimension dropdown
  const availableLenders = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const t of emailTemplates) {
      map.set(t.lenderId, t.lenderName)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [emailTemplates])

  const availablePurposes = React.useMemo(() => {
    const set = new Set<TemplatePurpose>()
    for (const t of emailTemplates) set.add(t.purpose)
    return Array.from(set)
  }, [emailTemplates])

  // Filter
  const filtered = React.useMemo(() => {
    return emailTemplates.filter((t) => {
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.subject ?? "").toLowerCase().includes(search.toLowerCase()) ||
        t.body.toLowerCase().includes(search.toLowerCase())

      let matchesFilter = true
      if (dimension === "lender" && filterValue !== "all") {
        matchesFilter = t.lenderId === filterValue
      } else if (dimension === "purpose" && filterValue !== "all") {
        matchesFilter = t.purpose === filterValue
      }

      return matchesSearch && matchesFilter
    })
  }, [emailTemplates, search, dimension, filterValue])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Choose a template
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Pick a starting point. We'll load it into the editor where you can
              tweak it before sending.
            </p>
          </div>
          <Link
            href="/templates"
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Create new template
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter dimension */}
          <Select
            value={dimension}
            onValueChange={(v) => {
              const next = (v ?? "all") as FilterDimension
              setDimension(next)
              setFilterValue("all")
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="lender">By lender</SelectItem>
              <SelectItem value="purpose">By purpose</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter value (when dimension picked) */}
          {dimension === "lender" && (
            <Select
              value={filterValue}
              onValueChange={(v) => setFilterValue(v ?? "all")}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Choose lender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All lenders</SelectItem>
                {availableLenders.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {dimension === "purpose" && (
            <Select
              value={filterValue}
              onValueChange={(v) => setFilterValue(v ?? "all")}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Choose purpose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All purposes</SelectItem>
                {availablePurposes.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PURPOSE_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative ml-auto flex-1 max-w-xs">
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template)}
              className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-foreground">
                    {template.name}
                  </div>
                  {template.subject && (
                    <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {template.subject}
                    </div>
                  )}
                </div>
              </div>

              <p className="line-clamp-3 text-[10px] leading-relaxed text-muted-foreground">
                {template.body.slice(0, 220)}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                <Badge className="bg-muted/80 text-[9px] text-muted-foreground">
                  <Tag className="h-2.5 w-2.5" />
                  {template.lenderName}
                </Badge>
                <Badge className="bg-primary/10 text-[9px] text-primary ring-1 ring-primary/30">
                  {PURPOSE_LABELS[template.purpose]}
                </Badge>
                <Badge className="bg-muted/80 text-[9px] text-muted-foreground">
                  <Globe className="h-2.5 w-2.5" />
                  {template.language === "ar" ? "Arabic" : "English"}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
