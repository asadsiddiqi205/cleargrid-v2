"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Mail,
  MessageSquare,
  MessageCircle,
  Plus,
  MoreHorizontal,
  Wand2,
  Megaphone,
  FileText,
  Sparkles,
  Bell,
  AlertTriangle,
  CheckCircle2,
  HandCoins,
  Scale,
  HeartHandshake,
  Building2,
  Search,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"

import { useLender } from "@/contexts/lender-context"
import { lenders, ALL_LENDERS } from "@/data/lenders"
import {
  strategies as defaultStrategies,
  PURPOSE_META,
  TONE_META,
  COMPLIANCE_META,
  type Strategy,
  type StrategyPurpose,
  type StrategyTone,
  type CompliancePosture,
  type StrategyChannel,
  type StrategyChannelTemplate,
} from "@/data/strategies"
import { templates as templateLibrary } from "@/data/templates"

// ---------------------------------------------------------------------------
// Helpers / constants
// ---------------------------------------------------------------------------
const purposeIcons: Record<string, React.ElementType> = {
  Sparkles,
  Bell,
  AlertTriangle,
  CheckCircle2,
  HandCoins,
  Scale,
  HeartHandshake,
  FileText,
}

const channelMeta: Record<
  StrategyChannel,
  { label: string; icon: React.ElementType; color: string }
> = {
  email: { label: "Email", icon: Mail, color: "#3b82f6" },
  sms: { label: "SMS", icon: MessageSquare, color: "#22c55e" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "#14b8a6" },
}

function lenderColor(lenderId: string): string {
  if (lenderId === "general") return "#6b7280"
  return lenders.find((l) => l.id === lenderId)?.primaryColor ?? "#6b7280"
}

function formatAed(value: number): string {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${Math.round(value / 1_000)}K`
  return `AED ${value}`
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US")
}

// ---------------------------------------------------------------------------
// Card subcomponents
// ---------------------------------------------------------------------------
function ChannelRow({ channels }: { channels: StrategyChannelTemplate[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {channels.map((c) => {
        const meta = channelMeta[c.channel]
        const Icon = meta.icon
        return (
          <Tooltip key={c.channel}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors"
                  style={{
                    backgroundColor: c.enabled ? `${meta.color}15` : "transparent",
                    borderColor: c.enabled ? `${meta.color}40` : undefined,
                  }}
                />
              }
            >
              <Icon
                className="h-3.5 w-3.5"
                style={{ color: c.enabled ? meta.color : "#52525b" }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-0.5">
                <div className="font-medium">
                  {meta.label}
                  {!c.enabled && (
                    <span className="ml-1 text-muted-foreground">(off)</span>
                  )}
                </div>
                <div className="text-[11px] opacity-80">{c.templateName}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

function StrategyCard({
  strategy,
  onUse,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  strategy: Strategy
  onUse: () => void
  onEdit: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const purpose = PURPOSE_META[strategy.purpose]
  const PurposeIcon = purposeIcons[purpose.icon] ?? FileText
  const tone = TONE_META[strategy.tone]
  const compliance = COMPLIANCE_META[strategy.compliancePosture]
  const lcolor = lenderColor(strategy.lenderId)
  const isGeneral = strategy.lenderId === "general"
  const trendPositive = strategy.trendVsLastWeek >= 0

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        {/* ---- Top row: purpose icon + lender badge ---- */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${purpose.color}20` }}
          >
            <PurposeIcon className="h-5 w-5" style={{ color: purpose.color }} />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              className="border text-[10px]"
              variant="outline"
              style={{
                color: lcolor,
                borderColor: `${lcolor}55`,
                backgroundColor: `${lcolor}15`,
              }}
            >
              <Building2 className="h-3 w-3" />
              {isGeneral ? "General" : strategy.lenderName}
            </Badge>
            {strategy.status !== "active" && (
              <Badge variant="secondary" className="text-[10px] capitalize">
                {strategy.status}
              </Badge>
            )}
          </div>
        </div>

        {/* ---- Title + description ---- */}
        <div className="space-y-1">
          <h3 className="font-heading text-sm font-semibold leading-snug">
            {strategy.name}
          </h3>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {strategy.description}
          </p>
        </div>

        {/* ---- Channel row (the key feature) ---- */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Bundles {strategy.channels.filter((c) => c.enabled).length} channels
          </div>
          <ChannelRow channels={strategy.channels} />
        </div>

        {/* ---- Tone + compliance ---- */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{
              color: tone.color,
              borderColor: `${tone.color}55`,
              backgroundColor: `${tone.color}15`,
            }}
          >
            {tone.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            · {compliance.label} compliance
          </span>
        </div>

        {/* ---- Performance row ---- */}
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <span className="text-foreground">{formatNumber(strategy.emailsSent)}</span>
          <span>sent</span>
          <span className="text-border">·</span>
          <span className="text-foreground">{strategy.conversionRate.toFixed(1)}%</span>
          <span>conv</span>
          <span className="text-border">·</span>
          <span className="text-foreground">{formatAed(strategy.revenueAed)}</span>
          <span className="text-border">·</span>
          <span className={trendPositive ? "text-emerald-400" : "text-red-400"}>
            {trendPositive ? "+" : ""}
            {strategy.trendVsLastWeek.toFixed(1)}%
          </span>
        </div>

        {/* ---- Actions ---- */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <Button size="sm" className="flex-1" onClick={onUse}>
            Use
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="icon-sm" variant="outline" aria-label="More actions" />
              }
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                {strategy.status === "archived" ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Editor dialog (used for both edit and create)
// ---------------------------------------------------------------------------
type EditorMode = "edit" | "create"

interface EditorState {
  name: string
  description: string
  lenderId: string
  purpose: StrategyPurpose
  tone: StrategyTone
  compliancePosture: CompliancePosture
  status: "active" | "draft" | "archived"
  channels: StrategyChannelTemplate[]
  cadence: string
  systemPrompt: string
}

function blankEditorState(): EditorState {
  return {
    name: "",
    description: "",
    lenderId: "general",
    purpose: "reminder",
    tone: "professional",
    compliancePosture: "standard",
    status: "draft",
    channels: [
      { channel: "email", templateId: "tmpl-001", templateName: "Payment Reminder - Soft", enabled: true },
      { channel: "sms", templateId: "tmpl-009", templateName: "Partial Payment Thank You", enabled: true },
      { channel: "whatsapp", templateId: "tmpl-004", templateName: "Payment Link - WhatsApp", enabled: true },
    ],
    cadence: "Day 1, Day 3, Day 7",
    systemPrompt: "",
  }
}

function strategyToEditorState(s: Strategy): EditorState {
  return {
    name: s.name,
    description: s.description,
    lenderId: s.lenderId,
    purpose: s.purpose,
    tone: s.tone,
    compliancePosture: s.compliancePosture,
    status: s.status,
    channels: s.channels.map((c) => ({ ...c })),
    cadence: s.cadence,
    systemPrompt: s.systemPrompt,
  }
}

function StrategyEditorDialog({
  open,
  mode,
  initialState,
  allStrategies,
  onClose,
  onSave,
}: {
  open: boolean
  mode: EditorMode
  initialState: EditorState
  allStrategies: Strategy[]
  onClose: () => void
  onSave: (state: EditorState) => void
}) {
  const [state, setState] = React.useState<EditorState>(initialState)
  const [activeTab, setActiveTab] = React.useState<string>("overview")
  const [copyFromId, setCopyFromId] = React.useState<string>("")

  // Reset state whenever dialog opens with a new initial state
  React.useEffect(() => {
    if (open) {
      setState(initialState)
      setActiveTab("overview")
      setCopyFromId("")
    }
  }, [open, initialState])

  const update = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  const updateChannel = (
    index: number,
    patch: Partial<StrategyChannelTemplate>
  ) => {
    setState((prev) => ({
      ...prev,
      channels: prev.channels.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }))
  }

  const handleCopyFrom = (id: string) => {
    setCopyFromId(id)
    const source = allStrategies.find((s) => s.id === id)
    if (source) {
      const copy = strategyToEditorState(source)
      // Don't carry the original name when copying
      setState({ ...copy, name: `${source.name} (copy)`, status: "draft" })
    }
  }

  const handleSave = () => {
    if (!state.name.trim()) {
      toast.error("Please enter a playbook name")
      return
    }
    onSave(state)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose() }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New playbook" : `Edit: ${state.name || "Playbook"}`}
          </DialogTitle>
          <DialogDescription>
            A playbook bundles a tone, three channel templates, an AI prompt, and a cadence into one reusable package.
          </DialogDescription>
        </DialogHeader>

        {mode === "create" && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Copy from existing
            </Label>
            <Select
              value={copyFromId || "__blank__"}
              onValueChange={(v) =>
                v && v !== "__blank__" ? handleCopyFrom(v) : setCopyFromId("")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Start blank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__blank__">Start blank</SelectItem>
                {allStrategies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "overview")}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="prompt">AI Prompt</TabsTrigger>
            <TabsTrigger value="cadence">Cadence</TabsTrigger>
          </TabsList>

          {/* ---- Overview ---- */}
          <TabsContent value="overview" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Playbook name</Label>
              <Input
                placeholder="e.g., Mashreq Broken Promise Recovery"
                value={state.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="One or two sentences about when to use this playbook."
                value={state.description}
                onChange={(e) => update("description", e.target.value)}
                className="min-h-[70px]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Lender</Label>
                <Select
                  value={state.lenderId}
                  onValueChange={(v) => update("lenderId", v ?? "general")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General (any lender)</SelectItem>
                    {lenders.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Purpose</Label>
                <Select
                  value={state.purpose}
                  onValueChange={(v) =>
                    update("purpose", (v ?? "reminder") as StrategyPurpose)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PURPOSE_META).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tone</Label>
                <Select
                  value={state.tone}
                  onValueChange={(v) =>
                    update("tone", (v ?? "professional") as StrategyTone)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TONE_META).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Compliance posture</Label>
                <Select
                  value={state.compliancePosture}
                  onValueChange={(v) =>
                    update(
                      "compliancePosture",
                      (v ?? "standard") as CompliancePosture
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMPLIANCE_META).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>
                        {meta.label} — {meta.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Status</Label>
                <Select
                  value={state.status}
                  onValueChange={(v) =>
                    update("status", (v ?? "draft") as EditorState["status"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* ---- Templates ---- */}
          <TabsContent value="templates" className="space-y-4 pt-4">
            <p className="text-xs text-muted-foreground">
              Each playbook bundles one template per channel. Toggle channels off if this playbook doesn&apos;t use them.
            </p>
            {state.channels.map((c, idx) => {
              const meta = channelMeta[c.channel]
              const Icon = meta.icon
              const compatibleTemplates = templateLibrary.filter((t) => t.channel === c.channel)
              const previewTemplate = templateLibrary.find(
                (t) => t.id === c.templateId
              )
              return (
                <div
                  key={c.channel}
                  className="space-y-3 rounded-lg border border-border bg-muted/20 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${meta.color}20` }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                      </div>
                      <Label className="text-xs font-medium">{meta.label}</Label>
                    </div>
                    <Switch
                      checked={c.enabled}
                      onCheckedChange={(val) => updateChannel(idx, { enabled: val })}
                    />
                  </div>

                  <Select
                      value={c.templateId}
                      onValueChange={(v) => {
                        if (!v) return
                        const t = compatibleTemplates.find((tt) => tt.id === v)
                        updateChannel(idx, {
                          templateId: v,
                          templateName: t?.name ?? c.templateName,
                        })
                      }}
                    >
                      <SelectTrigger className="w-full" disabled={!c.enabled}>
                        <SelectValue placeholder="Pick a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {compatibleTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                  {previewTemplate && c.enabled && (
                    <div className="space-y-1.5">
                      <div className="rounded-md border border-border bg-background/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
                        {previewTemplate.body}
                      </div>
                      <Link
                        href={`/templates?id=${previewTemplate.id}`}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        Edit template →
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </TabsContent>

          {/* ---- AI Prompt ---- */}
          <TabsContent value="prompt" className="space-y-3 pt-4">
            <Label>AI system prompt</Label>
            <p className="text-xs text-muted-foreground">
              This is the instruction the AI receives whenever it generates a message from this playbook. Tell it the goal, the tone, and any do-not-say rules.
            </p>
            <Textarea
              className="min-h-[260px] font-mono text-xs"
              placeholder="You are a debt-resolution assistant for..."
              value={state.systemPrompt}
              onChange={(e) => update("systemPrompt", e.target.value)}
            />
          </TabsContent>

          {/* ---- Cadence ---- */}
          <TabsContent value="cadence" className="space-y-3 pt-4">
            <Label>Cadence / timing</Label>
            <p className="text-xs text-muted-foreground">
              Free-text description of when each touchpoint goes out. Examples: &quot;Day 1, Day 3, Day 7&quot; or &quot;Day after PTP miss, +2 days, +5 days&quot;.
            </p>
            <Input
              placeholder="Day 1, Day 3, Day 7"
              value={state.cadence}
              onChange={(e) => update("cadence", e.target.value)}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {mode === "create" ? "Create playbook" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Use Strategy dialog
// ---------------------------------------------------------------------------
function UseStrategyDialog({
  strategy,
  onClose,
}: {
  strategy: Strategy | null
  onClose: () => void
}) {
  const open = !!strategy
  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        {strategy && (
          <>
            <DialogHeader>
              <DialogTitle>Use {strategy.name}</DialogTitle>
              <DialogDescription>
                Pick how you want to apply this playbook.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <Link
                href={`/email-generator?strategy=${strategy.id}`}
                className="group flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                onClick={onClose}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="text-sm font-medium">Send a one-off message</div>
                  <div className="text-[11px] leading-relaxed text-muted-foreground">
                    Open the composer pre-loaded with this strategy.
                  </div>
                </div>
              </Link>

              <Link
                href={`/campaigns/create?strategy=${strategy.id}`}
                className="group flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                onClick={onClose}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="text-sm font-medium">Create a campaign</div>
                  <div className="text-[11px] leading-relaxed text-muted-foreground">
                    Launch a multi-borrower campaign using this playbook.
                  </div>
                </div>
              </Link>

              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="text-sm font-medium">Bundled templates</div>
                    <div className="space-y-1">
                      {strategy.channels.map((c) => {
                        const meta = channelMeta[c.channel]
                        const Icon = meta.icon
                        return (
                          <div
                            key={c.channel}
                            className="flex items-center gap-2 text-[11px]"
                          >
                            <Icon
                              className="h-3 w-3"
                              style={{
                                color: c.enabled ? meta.color : "#52525b",
                              }}
                            />
                            <span className={c.enabled ? "" : "text-muted-foreground line-through"}>
                              {c.templateName}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main grid
// ---------------------------------------------------------------------------
const PURPOSE_FILTER_ALL = "__all__"
const STATUS_FILTER_ALL = "__all__"

export function StrategiesGrid() {
  const { selectedLenderId } = useLender()

  const [allStrategies, setAllStrategies] =
    React.useState<Strategy[]>(defaultStrategies)

  // Filter state — initialised from global lender, but can be overridden locally
  const [lenderFilter, setLenderFilter] = React.useState<string>(selectedLenderId)
  const [purposeFilter, setPurposeFilter] =
    React.useState<string>(PURPOSE_FILTER_ALL)
  const [statusFilter, setStatusFilter] = React.useState<string>("active")
  const [search, setSearch] = React.useState("")

  // Keep local lender filter in sync when global lender changes
  React.useEffect(() => {
    setLenderFilter(selectedLenderId)
  }, [selectedLenderId])

  // Dialogs state
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editorMode, setEditorMode] = React.useState<EditorMode>("create")
  const [editorInitial, setEditorInitial] = React.useState<EditorState>(
    blankEditorState()
  )
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [useStrategy, setUseStrategy] = React.useState<Strategy | null>(null)

  // Filtered list
  const visibleStrategies = React.useMemo(() => {
    return allStrategies.filter((s) => {
      // Lender filter (general always shows when a specific lender is picked)
      if (lenderFilter !== ALL_LENDERS) {
        if (s.lenderId !== lenderFilter && s.lenderId !== "general") return false
      }
      if (purposeFilter !== PURPOSE_FILTER_ALL && s.purpose !== purposeFilter)
        return false
      if (statusFilter !== STATUS_FILTER_ALL && s.status !== statusFilter)
        return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (
          !s.name.toLowerCase().includes(q) &&
          !s.description.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [allStrategies, lenderFilter, purposeFilter, statusFilter, search])

  // ---- Action handlers ----
  const openCreate = () => {
    setEditorMode("create")
    setEditorInitial(blankEditorState())
    setEditingId(null)
    setEditorOpen(true)
  }

  const openEdit = (strategy: Strategy) => {
    setEditorMode("edit")
    setEditorInitial(strategyToEditorState(strategy))
    setEditingId(strategy.id)
    setEditorOpen(true)
  }

  const handleSaveEditor = (state: EditorState) => {
    const lenderNameValue =
      state.lenderId === "general"
        ? "General"
        : lenders.find((l) => l.id === state.lenderId)?.name ?? "General"

    if (editorMode === "create") {
      const newStrategy: Strategy = {
        id: `strat-custom-${Date.now()}`,
        name: state.name,
        description: state.description,
        lenderId: state.lenderId,
        lenderName: lenderNameValue,
        purpose: state.purpose,
        tone: state.tone,
        compliancePosture: state.compliancePosture,
        status: state.status,
        channels: state.channels,
        cadence: state.cadence,
        systemPrompt: state.systemPrompt,
        createdAt: new Date().toISOString().slice(0, 10),
        emailsSent: 0,
        conversionRate: 0,
        revenueAed: 0,
        trendVsLastWeek: 0,
      }
      setAllStrategies((prev) => [newStrategy, ...prev])
      toast.success(`Playbook "${state.name}" created`)
    } else if (editingId) {
      setAllStrategies((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                name: state.name,
                description: state.description,
                lenderId: state.lenderId,
                lenderName: lenderNameValue,
                purpose: state.purpose,
                tone: state.tone,
                compliancePosture: state.compliancePosture,
                status: state.status,
                channels: state.channels,
                cadence: state.cadence,
                systemPrompt: state.systemPrompt,
              }
            : s
        )
      )
      toast.success("Playbook updated")
    }
    setEditorOpen(false)
  }

  const handleDuplicate = (strategy: Strategy) => {
    const dup: Strategy = {
      ...strategy,
      id: `strat-dup-${Date.now()}`,
      name: `${strategy.name} (copy)`,
      status: "draft",
      createdAt: new Date().toISOString().slice(0, 10),
      emailsSent: 0,
      conversionRate: 0,
      revenueAed: 0,
      trendVsLastWeek: 0,
    }
    setAllStrategies((prev) => [dup, ...prev])
    toast.success(`Duplicated "${strategy.name}"`)
  }

  const handleArchive = (strategy: Strategy) => {
    const newStatus: Strategy["status"] =
      strategy.status === "archived" ? "active" : "archived"
    setAllStrategies((prev) =>
      prev.map((s) => (s.id === strategy.id ? { ...s, status: newStatus } : s))
    )
    toast.success(
      newStatus === "archived"
        ? `Archived "${strategy.name}"`
        : `Restored "${strategy.name}"`
    )
  }

  const handleDelete = (strategy: Strategy) => {
    setAllStrategies((prev) => prev.filter((s) => s.id !== strategy.id))
    toast.success(`Playbook "${strategy.name}" deleted`)
  }

  const lenderFilterLabel =
    lenderFilter === ALL_LENDERS
      ? "All lenders"
      : lenders.find((l) => l.id === lenderFilter)?.name ?? "Lender"

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* ---- Top action bar ---- */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Lender
              </Label>
              <Select
                value={lenderFilter}
                onValueChange={(v) => setLenderFilter(v ?? ALL_LENDERS)}
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_LENDERS}>All lenders</SelectItem>
                  <SelectItem value="general">General only</SelectItem>
                  {lenders.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Purpose
              </Label>
              <Select
                value={purposeFilter}
                onValueChange={(v) => setPurposeFilter(v ?? PURPOSE_FILTER_ALL)}
              >
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PURPOSE_FILTER_ALL}>All purposes</SelectItem>
                  {Object.entries(PURPOSE_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v ?? "active")}
              >
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STATUS_FILTER_ALL}>All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search playbooks"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-[220px] pl-8"
                />
              </div>
            </div>
          </div>

          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New playbook
          </Button>
        </div>

        {/* ---- Grid ---- */}
        {visibleStrategies.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium">
                No playbooks for {lenderFilterLabel} yet
              </h3>
              <p className="max-w-sm text-xs text-muted-foreground">
                Create your first playbook for this lender, or change the filters above.
              </p>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              New playbook
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleStrategies.map((s) => (
              <StrategyCard
                key={s.id}
                strategy={s}
                onUse={() => setUseStrategy(s)}
                onEdit={() => openEdit(s)}
                onDuplicate={() => handleDuplicate(s)}
                onArchive={() => handleArchive(s)}
                onDelete={() => handleDelete(s)}
              />
            ))}
          </div>
        )}

        {/* ---- Editor dialog ---- */}
        <StrategyEditorDialog
          open={editorOpen}
          mode={editorMode}
          initialState={editorInitial}
          allStrategies={allStrategies}
          onClose={() => setEditorOpen(false)}
          onSave={handleSaveEditor}
        />

        {/* ---- Use dialog ---- */}
        <UseStrategyDialog
          strategy={useStrategy}
          onClose={() => setUseStrategy(null)}
        />
      </div>
    </TooltipProvider>
  )
}
