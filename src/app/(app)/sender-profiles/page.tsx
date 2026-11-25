"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  AtSign,
  Building2,
  CheckCircle2,
  Cog,
  Plus,
  Search,
  Shield,
  ShieldAlert,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { DncCheck } from "@/components/shared/dnc-check"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { listWarmyDomains } from "@/data/warmy"

type MainTab = "profiles" | "domains"

export default function SenderProfilesPage() {
  const [profiles, setProfiles] = React.useState<SenderProfile[]>(SEED_PROFILES)
  const [search, setSearch] = React.useState("")
  const [lenderFilter, setLenderFilter] = React.useState<string>("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [tab, setTab] = React.useState<MainTab>("profiles")

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
    toast.success(`Sender profile "${p.name}" created`, {
      description: p.domain.verified
        ? `Ready to use — routes via ${ESP_LABEL[p.esp]}.`
        : "Domain verification pending — profile will remain inactive until SPF / DKIM / DMARC pass.",
    })
  }

  return (
    <PageShell
      title="Sender profiles"
      description="Governed sender identities for outbound campaigns. Admin-only. The composer picks from this list — no free-typing of from-name, from-email, or route."
    >
      <WarmyAlertBanner />

      {/* Tabs */}
      <div className="mb-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-1">
          <TabButton active={tab === "profiles"} onClick={() => setTab("profiles")}>
            Profiles
          </TabButton>
          <TabButton active={tab === "domains"} onClick={() => setTab("domains")}>
            Domains
          </TabButton>
        </div>
        <div className="flex items-center gap-2 pb-1.5">
          <WarmyConnectionButton />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New sender profile
          </Button>
        </div>
      </div>

      {tab === "profiles" ? (
        <>
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or domain…"
                className="pl-8"
              />
            </div>
            <Select value={lenderFilter} onValueChange={(v) => setLenderFilter(v ?? "all")}>
              <SelectTrigger className="w-52">
                <SelectValue />
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
                  filtered.map((p) => <ProfileRow key={p.id} profile={p} />)
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
    </PageShell>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
        "-mb-px border-b-2 px-3 py-2 text-[12px] font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function ProfileRow({ profile }: { profile: SenderProfile }) {
  const verified = profile.domain.verified
  const domainStatuses = profile.domains.map((d) => statusForDomain(d.domain))
  const atRisk = domainStatuses.filter((s) => s.status === "at_risk").length
  const blocked = domainStatuses.filter((s) => s.status === "blocked").length
  const watch = domainStatuses.filter((s) => s.status === "watch").length
  const summary = (() => {
    const parts: string[] = [`${profile.domains.length} domain${profile.domains.length === 1 ? "" : "s"}`]
    if (blocked) parts.push(`${blocked} blocked`)
    if (atRisk) parts.push(`${atRisk} at risk`)
    if (!blocked && !atRisk && watch) parts.push(`${watch} watch`)
    return parts.join(" · ")
  })()

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/20">
      <td className="max-w-[240px] px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-emerald-500/15 text-emerald-300">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">{profile.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{profile.lenderName}</p>
          </div>
        </div>
      </td>
      <td className="max-w-[220px] px-3 py-3">
        <p className="truncate text-[12px] text-foreground">{profile.fromName}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{profile.fromEmail}</p>
      </td>
      <td className="max-w-[180px] px-3 py-3">
        <p className="truncate font-mono text-[11px] text-muted-foreground">{profile.replyTo}</p>
      </td>
      <td className="px-3 py-3">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-muted-foreground">
            {profile.prefix}@
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {profile.domains.map((d) => (
              <span
                key={d.domain}
                className="inline-flex items-center gap-1 rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground"
              >
                <DomainStatusDot domain={d.domain} size="xs" />
                {d.domain}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <StateChip label="SPF" state={profile.domain.spf} />
            <StateChip label="DKIM" state={profile.domain.dkim} />
            <StateChip label="DMARC" state={profile.domain.dmarc} />
          </div>
          <p className="text-[9.5px] text-muted-foreground">{summary}</p>
        </div>
      </td>
      <td className="px-3 py-3">
        <Badge className="border-zinc-700 bg-zinc-800 text-zinc-200">{ESP_LABEL[profile.esp]}</Badge>
      </td>
      <td className="px-3 py-3">
        {profile.status === "active" && verified ? (
          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Active
          </Badge>
        ) : !verified ? (
          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
            <ShieldAlert className="h-2.5 w-2.5" />
            Domain unverified
          </Badge>
        ) : (
          <Badge className="border-zinc-700 bg-zinc-800 text-zinc-400">Inactive</Badge>
        )}
      </td>
      <td className="px-3 py-3 text-[11px] text-muted-foreground">
        {new Date(profile.updatedAt).toLocaleDateString()}
        <br />
        <span className="text-[10px]">by {profile.updatedBy}</span>
      </td>
    </tr>
  )
}

function StateChip({
  label,
  state,
}: {
  label: string
  state: "pass" | "fail" | "pending"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium",
        state === "pass" && "bg-emerald-500/15 text-emerald-300",
        state === "fail" && "bg-red-500/15 text-red-300",
        state === "pending" && "bg-amber-500/15 text-amber-300",
      )}
    >
      {label} {state}
    </span>
  )
}

function NewProfileDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (p: SenderProfile) => void
}) {
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

  React.useEffect(() => {
    if (open) {
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
    }
  }, [open])

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
      id: `sp-new-${Date.now().toString(36)}`,
      lenderId,
      lenderName: lender?.name ?? "ClearGrid",
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
      status: willBeVerified ? "active" : "inactive",
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AtSign className="h-4 w-4 text-emerald-400" />
            New sender profile
          </DialogTitle>
          <DialogDescription>
            Governed sender identity. Domain verification is required before this profile can be
            picked in the composer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Display name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mashreq Collections" />
            </Field>
            <Field label="Lender">
              <select
                value={lenderId}
                onChange={(e) => setLenderId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="general">General (cross-lender)</option>
                {lenders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="From name (what recipients see)">
            <Input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="e.g. Mashreq Collections"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="From email">
              <Input
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="collections@mashreq.com"
                className="font-mono text-[12px]"
              />
              {fromEmailStatus && (
                <FromEmailStatusLine status={fromEmailStatus} domain={domainFromEmail} />
              )}
            </Field>
            <Field label="Reply-to">
              <Input
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="reply@mashreq.com"
                className="font-mono text-[12px]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-[120px,1fr] gap-3">
            <Field label="Prefix">
              <Input
                value={prefixInput}
                onChange={(e) => setPrefixInput(e.target.value)}
                placeholder={effectivePrefix || "collections"}
                className="font-mono text-[12px]"
              />
            </Field>
            <Field label="Domains (Journey rotation)">
              <DomainMultiSelect
                value={effectiveDomains}
                onChange={setSelectedDomains}
                primary={domainFromEmail}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Journey sends rotate {effectivePrefix || "<prefix>"}@domain across these domains,
                skipping any that are blocked, paused or out of today&apos;s volume. Composer
                sends still use the from email above.
              </p>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CC (comma-separated)">
              <Input
                value={ccList}
                onChange={(e) => setCcList(e.target.value)}
                placeholder="Optional"
                className="font-mono text-[12px]"
              />
            </Field>
            <Field label="BCC (comma-separated)">
              <Input
                value={bccList}
                onChange={(e) => setBccList(e.target.value)}
                placeholder="compliance-log@…"
                className="font-mono text-[12px]"
              />
            </Field>
          </div>

          <Field label="ESP / route">
            <Select value={esp} onValueChange={(v) => setEsp((v as EspRoute) ?? "infobip_uae")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ESP_LABEL) as Array<[EspRoute, string]>).map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[10px] text-muted-foreground">
              KSA-vs-UAE routing lives here — the composer never picks a raw provider.
            </p>
          </Field>

          <Field label="Description (optional)">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When should agents use this profile?"
            />
          </Field>

          {domainFromEmail && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-[11px]">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <div>
                <p className="font-medium text-amber-300">
                  {domainFromEmail} needs to be verified before this profile can be used.
                </p>
                <p className="mt-1 text-amber-300/80">
                  In production, DNS-based SPF / DKIM / DMARC checks run against the domain. In this
                  prototype we mark the state as pending — an admin flips it once real verification
                  completes.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Cog className="h-3 w-3" />
            Create profile
          </Button>
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
  // Universe = every Warmy-known domain + every domain already on a
  // seeded profile + the current from-email domain.
  const all = React.useMemo(() => {
    const set = new Set<string>()
    for (const w of listWarmyDomains()) {
      set.add(w.name.toLowerCase())
    }
    for (const p of SEED_PROFILES) {
      for (const d of p.domains) set.add(d.domain.toLowerCase())
    }
    if (primary) set.add(primary.toLowerCase())
    const list = [...set].map((d) => statusForDomain(d))
    // Healthiest first.
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

  return (
    <div className="space-y-1.5">
      <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border border-border bg-background/40 p-1">
        {all.map((s) => {
          const isSelected = selected.has(s.name.toLowerCase())
          const isPrimary = s.name.toLowerCase() === primary.toLowerCase()
          const w = s.warmy
          const vol = w ? w.recommended_volume_today.gmail : null
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => toggle(s.name)}
              className={cn(
                "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[11px]",
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
              <span className="min-w-0 flex-1 truncate font-mono">{s.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {w ? `health ${w.health_score.total}` : "no Warmy"}
              </span>
              {vol && vol.volume != null && (
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {vol.volume.toLocaleString()} today
                </span>
              )}
              {isPrimary && (
                <span className="rounded bg-primary/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                  From-email
                </span>
              )}
              {s.status === "blocked" && (
                <span className="text-[10px] text-red-300">Blocked — warn on send</span>
              )}
              {s.paused && (
                <span className="text-[10px] text-neutral-300">Paused</span>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-[10.5px] text-muted-foreground">
        {value.length} domain{value.length === 1 ? "" : "s"} · {healthy} healthy
        {watch ? ` · ${watch} watch` : ""}
        {atRisk ? ` · ${atRisk} at risk` : ""}
        {blocked ? ` · ${blocked} blocked by Gmail` : ""}
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
