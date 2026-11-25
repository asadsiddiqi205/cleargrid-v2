"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  AtSign,
  CheckCircle2,
  ChevronDown,
  Plus,
  Search,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { DncCheck } from "@/components/shared/dnc-check"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  senderProfiles as SEED_PROFILES,
  ESP_LABEL,
  type EspRoute,
  type SenderProfile,
} from "@/data/sender-profiles"
import { lenders } from "@/data/lenders"
import { WarmyConnectionButton } from "@/components/warmy/warmy-connection-button"
import { WarmyAlertBanner } from "@/components/warmy/warmy-alerts"
import { DomainStatusDot } from "@/components/warmy/domain-status-dot"
import { WarmyDomainsTab, WarmyDomainsToolbar } from "@/components/warmy/warmy-domains-tab"
import { statusForDomain } from "@/data/domain-health"
import { listWarmyDomains, getSentToday } from "@/data/warmy"

type MainTab = "profiles" | "domains"

export default function SenderProfilesPage() {
  const [profiles, setProfiles] = React.useState<SenderProfile[]>(SEED_PROFILES)
  const [search, setSearch] = React.useState("")
  const [lenderFilter, setLenderFilter] = React.useState<string>("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [tab, setTab] = React.useState<MainTab>("profiles")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const editingProfile = editingId ? profiles.find((p) => p.id === editingId) ?? null : null

  // Open the Domains tab when the URL carries ?tab=domains — used by
  // the alert banner's "Open Domains" button.
  const searchParams = useSearchParams()
  React.useEffect(() => {
    const t = searchParams.get("tab")
    if (t === "domains" || t === "profiles") setTab(t)
  }, [searchParams])

  const filtered = profiles.filter((p) => {
    if (lenderFilter !== "all" && p.lenderId !== lenderFilter) return false
    if (
      search &&
      !`${p.name} ${p.fromEmail} ${p.fromName} ${p.lenderName}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
      return false
    return true
  })

  function handleCreate(p: SenderProfile) {
    setProfiles((prev) => [p, ...prev])
    toast.success(`Sender profile "${p.name}" created`)
  }

  function handleUpdate(p: SenderProfile) {
    setProfiles((prev) => prev.map((x) => (x.id === p.id ? p : x)))
    toast.success(`Sender profile "${p.name}" saved`)
    setEditingId(null)
  }

  return (
    <PageShell
      title="Sender profiles"
      description="Governed email sender identities for outbound campaigns. Admin-only. The composer picks from this list — no free-typing of from-name, from-email, or route."
      actions={
        <div className="flex items-center gap-2">
          <WarmyConnectionButton />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New sender profile
          </Button>
        </div>
      }
    >
      <WarmyAlertBanner />

      {/* Tabs — sit as a small inline nav above the filters */}
      <div className="mb-5 inline-flex items-center gap-1 rounded-md border border-border bg-muted/20 p-1">
        <TabButton active={tab === "profiles"} onClick={() => setTab("profiles")}>
          Profiles
        </TabButton>
        <TabButton active={tab === "domains"} onClick={() => setTab("domains")}>
          Domains
        </TabButton>
      </div>

      {tab === "profiles" ? (
        <>
          {/* Toolbar — labelled filters, roughly half the width each */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or domain…"
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Lender
              </label>
              <Select value={lenderFilter} onValueChange={(v) => setLenderFilter(v ?? "all")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{lenderFilterLabel(lenderFilter)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All lenders</SelectItem>
                  <SelectItem value="general">General (cross-lender)</SelectItem>
                  {lenders.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <Th>Profile</Th>
                  <Th>From</Th>
                  <Th>Reply-to</Th>
                  <Th>Prefix / Domains</Th>
                  <Th>Route</Th>
                  <Th>Status</Th>
                  <Th>Updated</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No sender profiles match those filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <ProfileRow key={p.id} profile={p} onEdit={() => setEditingId(p.id)} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <WarmyDomainsToolbar
            search={search}
            setSearch={setSearch}
            lenderFilter={lenderFilter}
            setLenderFilter={setLenderFilter}
          />
          <WarmyDomainsTab search={search} lenderFilter={lenderFilter} />
        </>
      )}

      {/* Ambient tool: DNC check. Paste phone numbers, get the subset that's
          on the ClearVoice DNC list. Sits alongside sender-profile governance
          since both are compliance-ops surfaces. */}
      <div className="mt-6 rounded-xl border border-border bg-card/40 p-5">
        <DncCheck clientLabel="Mashreq PJSC" />
      </div>

      <NewProfileDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
      <NewProfileDialog
        open={editingProfile !== null}
        onClose={() => setEditingId(null)}
        onCreate={handleUpdate}
        initial={editingProfile}
      />
    </PageShell>
  )
}

/** Helpers for labelled Select values — show "General (cross-lender)"
 *  instead of "general" and "All lenders" instead of "all". */
function lenderLabel(id: string): string {
  if (id === "general") return "General (cross-lender)"
  const l = lenders.find((x) => x.id === id)
  return l?.name ?? id
}
function lenderFilterLabel(id: string): string {
  if (id === "all") return "All lenders"
  return lenderLabel(id)
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  )
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2.5 py-1 text-[12px] font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function ProfileRow({ profile, onEdit }: { profile: SenderProfile; onEdit: () => void }) {
  const domainStatuses = profile.domains.map((d) => statusForDomain(d.domain))
  const atRisk = domainStatuses.filter((s) => s.status === "at_risk").length
  const blocked = domainStatuses.filter((s) => s.status === "blocked").length
  const watch = domainStatuses.filter((s) => s.status === "watch").length
  const paused = domainStatuses.filter((s) => s.paused).length
  const summary = (() => {
    const parts: string[] = [`${profile.domains.length} domain${profile.domains.length === 1 ? "" : "s"}`]
    if (blocked) parts.push(`${blocked} blocked`)
    if (atRisk) parts.push(`${atRisk} at risk`)
    if (paused) parts.push(`${paused} paused`)
    if (!blocked && !atRisk && !paused && watch) parts.push(`${watch} watch`)
    return parts.join(" · ")
  })()
  const updatedAt = new Date(profile.updatedAt)
  const dateStr = updatedAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  return (
    <tr
      className="cursor-pointer border-b border-border/50 last:border-0 align-top hover:bg-muted/20"
      onClick={onEdit}
    >
      <td className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
            <AtSign className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-foreground">{profile.name}</p>
            <p className="truncate text-[11.5px] text-muted-foreground">{profile.lenderName}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="text-[12.5px] text-foreground">{profile.fromName}</p>
        <p className="text-[11px] text-muted-foreground">{profile.fromEmail}</p>
      </td>
      <td className="px-4 py-4">
        <p className="text-[11.5px] text-muted-foreground">{profile.replyTo}</p>
      </td>
      <td className="px-4 py-4 max-w-sm">
        <p className="text-[12.5px] text-foreground">{profile.prefix}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {profile.domains.map((d, i) => (
            <React.Fragment key={d.domain}>
              {i > 0 && ", "}
              <DomainTextWithDot domain={d.domain} />
            </React.Fragment>
          ))}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/80">{summary}</p>
      </td>
      <td className="px-4 py-4 text-[12px] text-foreground">
        {ESP_LABEL[profile.esp]}
      </td>
      <td className="px-4 py-4">
        {profile.status === "active" ? (
          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
            Inactive
          </span>
        )}
      </td>
      <td className="px-4 py-4 text-[11.5px] text-muted-foreground">
        {dateStr}
        <div className="text-[10.5px]">by {profile.updatedBy}</div>
      </td>
    </tr>
  )
}

/** Domain text with a tiny health-status dot inline. Keeps the screenshot's
 *  plain-text feel while still surfacing Warmy at a glance. */
function DomainTextWithDot({ domain }: { domain: string }) {
  const s = statusForDomain(domain)
  const show = s.status !== "healthy" || s.paused
  return (
    <span className="inline-flex items-center gap-1">
      {show && <DomainStatusDot domain={domain} size="xs" />}
      <span>{domain}</span>
    </span>
  )
}

function NewProfileDialog({
  open,
  onClose,
  onCreate,
  initial,
}: {
  open: boolean
  onClose: () => void
  onCreate: (p: SenderProfile) => void
  initial?: SenderProfile | null
}) {
  const isEdit = Boolean(initial)
  const [name, setName] = React.useState("")
  const [lenderId, setLenderId] = React.useState("general")
  const [fromName, setFromName] = React.useState("")
  const [fromEmail, setFromEmail] = React.useState("")
  const [replyTo, setReplyTo] = React.useState("")
  const [esp, setEsp] = React.useState<EspRoute>("infobip_uae")
  const [description, setDescription] = React.useState("")
  const [ccList, setCcList] = React.useState("")
  const [bccList, setBccList] = React.useState("")
  const [prefixInput, setPrefixInput] = React.useState("")
  const [selectedDomains, setSelectedDomains] = React.useState<string[]>([])
  const [active, setActive] = React.useState(true)

  React.useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.name)
      setLenderId(initial.lenderId)
      setFromName(initial.fromName)
      setFromEmail(initial.fromEmail)
      setReplyTo(initial.replyTo)
      setEsp(initial.esp)
      setDescription(initial.description ?? "")
      setCcList((initial.cc ?? []).join(", "))
      setBccList((initial.bcc ?? []).join(", "))
      setPrefixInput(initial.prefix)
      setSelectedDomains(initial.domains.map((d) => d.domain))
      setActive(initial.status === "active")
    } else {
      setName("")
      setLenderId("general")
      setFromName("")
      setFromEmail("")
      setReplyTo("")
      setEsp("infobip_uae")
      setDescription("")
      setCcList("")
      setBccList("")
      setPrefixInput("")
      setSelectedDomains([])
      setActive(true)
    }
  }, [open, initial])

  const domainFromEmail = fromEmail.includes("@") ? fromEmail.split("@")[1]! : ""
  const effectivePrefix = (prefixInput.trim() || (fromEmail.includes("@") ? fromEmail.split("@")[0]! : fromEmail)).trim()
  // Domain verification is stubbed — anything with a properly-formed domain
  // starts as "verification pending" and needs an admin to mark verified in a
  // real workflow.
  const willBeVerified = false

  const fromEmailStatus = domainFromEmail ? statusForDomain(domainFromEmail) : null
  const effectiveDomains = selectedDomains.length > 0 || !domainFromEmail
    ? selectedDomains
    : [domainFromEmail]

  function handleSave() {
    if (!name.trim() || !fromName.trim() || !fromEmail.trim() || !replyTo.trim() || !domainFromEmail) {
      toast.error("Fill in the name, from-name, from-email, and reply-to.")
      return
    }
    const now = new Date().toISOString()
    const lender = lenders.find((l) => l.id === lenderId)
    const prefix = effectivePrefix
    const seedDomain = {
      domain: domainFromEmail,
      verified: willBeVerified,
      spf: "pending" as const,
      dkim: "pending" as const,
      dmarc: "pending" as const,
    }
    const extraDomains = effectiveDomains
      .filter((d) => d !== domainFromEmail)
      .map((d) => ({
        domain: d,
        verified: true, // assume external domains are already verified
        spf: "pass" as const,
        dkim: "pass" as const,
        dmarc: "pass" as const,
      }))
    const profile: SenderProfile = {
      id: initial?.id ?? `sp-new-${Date.now().toString(36)}`,
      lenderId,
      lenderName: lenderId === "general" ? "General (cross-lender)" : lender?.name ?? "ClearGrid",
      name: name.trim(),
      fromName: fromName.trim(),
      fromEmail: fromEmail.trim(),
      replyTo: replyTo.trim(),
      cc: ccList
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      bcc: bccList
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      prefix,
      domain: seedDomain,
      domains: [seedDomain, ...extraDomains],
      esp,
      status: active ? "active" : "inactive",
      description: description.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      updatedBy: "You",
    }
    onCreate(profile)
    if (fromEmailStatus?.status === "blocked") {
      toast.warning(`Profile saved — ${domainFromEmail} is currently Blocked`, {
        description:
          "Composer sends go out through this domain. They will be refused until the status clears.",
      })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
              <AtSign className="h-4 w-4" />
            </span>
            {isEdit ? "Edit sender profile" : "New sender profile"}
          </DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Governed email sender identity. Credentials stay on the email sender connection and
            are loaded by configuration id.
          </DialogDescription>
        </DialogHeader>

        {isEdit && (
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </div>
              <div className="text-[12px] text-foreground">
                {active ? "Active — pickable in the composer" : "Inactive — hidden from pickers"}
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4"
              />
              Active
            </label>
          </div>
        )}

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Display name">
              <Input
                className="h-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mashreq Collections"
              />
            </Field>
            <Field label="Lender">
              <Select value={lenderId} onValueChange={(v) => setLenderId(v ?? "general")}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>{lenderLabel(lenderId)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General (cross-lender)</SelectItem>
                  {lenders.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="ESP / route">
            <Select value={esp} onValueChange={(v) => setEsp((v as EspRoute) ?? "infobip_uae")}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue>{ESP_LABEL[esp]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ESP_LABEL) as Array<[EspRoute, string]>).map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Email routing for this profile — the composer never picks a raw provider.
            </p>
          </Field>

          <Field label="From name (what recipients see)">
            <Input
              className="h-10"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="e.g. Mashreq Collections"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="From email">
              <Input
                className="h-10"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="collections@mashreq.com"
              />
              {fromEmailStatus && (
                <FromEmailStatusLine status={fromEmailStatus} domain={domainFromEmail} />
              )}
            </Field>
            <Field label="Reply-to">
              <Input
                className="h-10"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="reply@mashreq.com"
              />
            </Field>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prefix">
                <Input
                  className="h-10"
                  value={prefixInput}
                  onChange={(e) => setPrefixInput(e.target.value)}
                  placeholder={effectivePrefix || "e.g. support"}
                />
              </Field>
              <Field label="Domains">
                <DomainMultiSelect
                  value={effectiveDomains}
                  onChange={setSelectedDomains}
                  primary={domainFromEmail}
                />
              </Field>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Journey sends rotate <code className="font-mono text-foreground/80">prefix@domain</code> across these
              domains, skipping any that are blocked, paused or out of today&apos;s volume.
              Composer sends still use the from email above.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="CC (comma-separated)">
              <Input
                className="h-10"
                value={ccList}
                onChange={(e) => setCcList(e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field label="BCC (comma-separated)">
              <Input
                className="h-10"
                value={bccList}
                onChange={(e) => setBccList(e.target.value)}
                placeholder="compliance-log@…"
              />
            </Field>
          </div>

          <Field label="Description (optional)">
            <Input
              className="h-10"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When should agents use this profile?"
            />
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{isEdit ? "Save" : "Create profile"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FromEmailStatusLine({
  status,
  domain,
}: {
  status: ReturnType<typeof statusForDomain>
  domain: string
}) {
  return (
    <div className="mt-1 flex items-center gap-1.5 text-[10.5px]">
      <DomainStatusDot domain={domain} size="xs" />
      <span className="font-mono text-foreground">{domain}</span>
      <span className="text-muted-foreground">·</span>
      <span
        className={cn(
          status.status === "healthy" && "text-emerald-300",
          status.status === "watch" && "text-amber-300",
          status.status === "at_risk" && "text-orange-300",
          status.status === "blocked" && "text-red-300",
          status.status === "no_data" && "text-neutral-300",
        )}
      >
        {status.status === "healthy"
          ? "Healthy"
          : status.status === "watch"
          ? "Watch"
          : status.status === "at_risk"
          ? "At risk"
          : status.status === "blocked"
          ? "Blocked"
          : "No data"}
      </span>
      {status.status === "blocked" && (
        <span className="text-[10px] text-red-300">· Composer sends will fail safety checks</span>
      )}
    </div>
  )
}

function DomainMultiSelect({
  value,
  onChange,
  primary,
}: {
  value: string[]
  onChange: (next: string[]) => void
  primary: string
}) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  // Close on click outside.
  React.useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  // Universe = every Warmy-known domain + every domain already on a
  // seeded profile + the current from-email domain.
  const all = React.useMemo(() => {
    const set = new Set<string>()
    for (const w of listWarmyDomains()) set.add(w.name.toLowerCase())
    for (const p of SEED_PROFILES) {
      for (const d of p.domains) set.add(d.domain.toLowerCase())
    }
    if (primary) set.add(primary.toLowerCase())
    const list = [...set].map((d) => statusForDomain(d))
    const rank: Record<string, number> = {
      healthy: 0,
      watch: 1,
      at_risk: 2,
      blocked: 3,
      no_data: 4,
    }
    list.sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name))
    return list
  }, [primary])

  const selected = new Set(value.map((v) => v.toLowerCase()))
  const toggle = (name: string) => {
    const lower = name.toLowerCase()
    const next = new Set(selected)
    if (next.has(lower)) next.delete(lower)
    else next.add(lower)
    onChange([...next])
  }

  const healthy = value.filter((v) => statusForDomain(v).status === "healthy").length
  const atRisk = value.filter((v) => statusForDomain(v).status === "at_risk").length
  const blocked = value.filter((v) => statusForDomain(v).status === "blocked").length
  const watch = value.filter((v) => statusForDomain(v).status === "watch").length

  const label = value.length === 0
    ? "Select one or more domains"
    : value.length <= 2
    ? value.join(", ")
    : `${value.slice(0, 2).join(", ")} +${value.length - 2}`

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30",
          value.length === 0 && "text-muted-foreground",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg"
          style={{ maxHeight: "min(16rem, 40vh)" }}
        >
          {all.map((s) => {
            const isSelected = selected.has(s.name.toLowerCase())
            const isPrimary = s.name.toLowerCase() === primary.toLowerCase()
            const w = s.warmy
            const gmailRec = w?.recommended_volume_today.gmail.volume ?? null
            const gmailSent = w ? getSentToday(w.name, "gmail") : 0
            const gmailLeft = gmailRec != null ? Math.max(0, gmailRec - gmailSent) : null
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => toggle(s.name)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px]",
                  isSelected ? "bg-primary/10" : "hover:bg-muted/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="h-3 w-3 shrink-0"
                />
                <DomainStatusDot domain={s.name} size="xs" />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="text-[10.5px] text-muted-foreground">
                  {w ? `health ${w.health_score.total}` : "no Warmy"}
                </span>
                {gmailLeft != null && (
                  <span className="text-[10.5px] tabular-nums text-muted-foreground">
                    {gmailLeft.toLocaleString()} left
                  </span>
                )}
                {isPrimary && (
                  <span className="rounded bg-primary/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                    From-email
                  </span>
                )}
                {s.status === "blocked" && (
                  <span className="text-[10px] text-red-600 dark:text-red-300">Blocked</span>
                )}
                {s.paused && (
                  <span className="text-[10px] text-neutral-600 dark:text-neutral-300">Paused</span>
                )}
              </button>
            )
          })}
        </div>
      )}
      {value.length > 0 && (
        <p className="text-[10.5px] text-muted-foreground">
          {value.length} domain{value.length === 1 ? "" : "s"} · {healthy} healthy
          {watch ? ` · ${watch} watch` : ""}
          {atRisk ? ` · ${atRisk} at risk` : ""}
          {blocked ? ` · ${blocked} blocked by Gmail` : ""}
        </p>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  // Field wrapper used throughout the create/edit sender-profile modal.
  return (
    <div className="space-y-1.5">
      <label className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

