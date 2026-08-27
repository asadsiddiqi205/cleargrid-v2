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

export default function SenderProfilesPage() {
  const [profiles, setProfiles] = React.useState<SenderProfile[]>(SEED_PROFILES)
  const [search, setSearch] = React.useState("")
  const [lenderFilter, setLenderFilter] = React.useState<string>("all")
  const [createOpen, setCreateOpen] = React.useState(false)

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
        <Button className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New sender profile
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left">
              <Th>Profile</Th>
              <Th>From</Th>
              <Th>Reply-to</Th>
              <Th>Domain</Th>
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

function ProfileRow({ profile }: { profile: SenderProfile }) {
  const verified = profile.domain.verified
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
          <span className="text-[11px] font-medium text-foreground">{profile.domain.domain}</span>
          <div className="flex flex-wrap items-center gap-1">
            <StateChip label="SPF" state={profile.domain.spf} />
            <StateChip label="DKIM" state={profile.domain.dkim} />
            <StateChip label="DMARC" state={profile.domain.dmarc} />
          </div>
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
    }
  }, [open])

  const domainFromEmail = fromEmail.includes("@") ? fromEmail.split("@")[1] : ""
  // Domain verification is stubbed — anything with a properly-formed domain
  // starts as "verification pending" and needs an admin to mark verified in a
  // real workflow.
  const willBeVerified = false

  function handleSave() {
    if (!name.trim() || !fromName.trim() || !fromEmail.trim() || !replyTo.trim() || !domainFromEmail) {
      toast.error("Fill in the name, from-name, from-email, and reply-to.")
      return
    }
    const now = new Date().toISOString()
    const lender = lenders.find((l) => l.id === lenderId)
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
      domain: {
        domain: domainFromEmail,
        verified: willBeVerified,
        spf: "pending",
        dkim: "pending",
        dmarc: "pending",
      },
      esp,
      status: willBeVerified ? "active" : "inactive",
      description: description.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      updatedBy: "You",
    }
    onCreate(profile)
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
