"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  AtSign,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Cog,
  Pencil,
  Reply,
  RotateCcw,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  getProfilesForLender,
  getSenderProfileById,
  senderProfiles,
  ESP_LABEL,
  type SenderProfile,
} from "@/data/sender-profiles"

interface SenderProfilePickerProps {
  /** Lender the campaign belongs to. Filters the list. If missing, we show
   *  general profiles + a warning. */
  lenderId: string | null
  value: string | null
  onChange: (id: string) => void
  /** Composer-level free-form overrides. When any is non-empty they win over
   *  the governed profile's From identity for this campaign. */
  customFromName?: string
  customFromEmail?: string
  customReplyTo?: string
  onCustomChange?: (patch: {
    customFromName?: string
    customFromEmail?: string
    customReplyTo?: string
  }) => void
  /** Compact mode — used inside the per-variation sender editor. */
  compact?: boolean
  /** Optional label override. */
  label?: string
}

export function SenderProfilePicker({
  lenderId,
  value,
  onChange,
  customFromName = "",
  customFromEmail = "",
  customReplyTo = "",
  onCustomChange,
  compact = false,
  label,
}: SenderProfilePickerProps) {
  const [open, setOpen] = React.useState(false)
  const profiles = React.useMemo(
    () => getProfilesForLender(lenderId ?? "general"),
    [lenderId],
  )
  const active = value ? getSenderProfileById(value) : null
  const missing = !active

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Sender profile <span className="text-red-400">*</span>
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md border bg-muted/10 px-3 py-2 text-left transition-colors hover:border-zinc-700",
                missing
                  ? "border-red-500/40"
                  : "border-border",
              )}
            />
          }
        >
          {active ? (
            <ActiveSummary profile={active} />
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[12px] text-muted-foreground">
              <AtSign className="h-3.5 w-3.5" />
              <span className="truncate">Pick a governed sender profile…</span>
            </div>
          )}
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[380px] p-1">
          <div className="max-h-72 space-y-0.5 overflow-y-auto">
            {profiles.length === 0 ? (
              <div className="space-y-2 px-3 py-4 text-center">
                <ShieldAlert className="mx-auto h-5 w-5 text-amber-400" />
                <p className="text-[12px] font-medium text-foreground">
                  No approved sender profiles for this lender.
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Admins can add one at Lender Configuration → Sender Profiles.
                </p>
              </div>
            ) : (
              profiles.map((p) => (
                <ProfileRow
                  key={p.id}
                  profile={p}
                  active={value === p.id}
                  onClick={() => {
                    onChange(p.id)
                    setOpen(false)
                  }}
                />
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Resolved sender identity — read-only mirror + editable overrides. */}
      {active && (
        <ResolvedIdentity
          profile={active}
          customFromName={customFromName}
          customFromEmail={customFromEmail}
          customReplyTo={customReplyTo}
          onCustomChange={onCustomChange}
          compact={compact}
        />
      )}

      {missing && (
        <p className="text-[10px] text-red-400">
          Required — sender identity is governed. Ask an admin to add a profile if none appear above.
        </p>
      )}

      {/* Lender-scope hint when no lender is selected yet */}
      {!lenderId && profiles.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Showing cross-lender profiles only. Pick a lender-scoped playbook or template to see more.
        </p>
      )}
    </div>
  )
}

function ActiveSummary({ profile }: { profile: SenderProfile }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-500/15 text-emerald-300">
        <Building2 className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-foreground">{profile.name}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {profile.fromEmail} · {ESP_LABEL[profile.esp]}
        </p>
      </div>
      {profile.domain.verified ? (
        <Badge className="shrink-0 border-emerald-500/30 bg-emerald-500/10 text-[9px] text-emerald-300">
          <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
          Verified
        </Badge>
      ) : (
        <Badge className="shrink-0 border-amber-500/30 bg-amber-500/10 text-[9px] text-amber-300">
          Unverified
        </Badge>
      )}
    </div>
  )
}

function ProfileRow({
  profile,
  active,
  onClick,
}: {
  profile: SenderProfile
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2.5 rounded px-2.5 py-2 text-left transition-colors",
        active ? "bg-emerald-500/10" : "hover:bg-muted",
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-300">
        <Building2 className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[12px] font-medium text-foreground">{profile.name}</p>
          {active && <Check className="h-3 w-3 text-emerald-400" />}
        </div>
        <p className="truncate text-[10px] text-muted-foreground">
          {profile.fromName} &lt;{profile.fromEmail}&gt;
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          <Badge className="border-zinc-700 bg-zinc-800 text-[9px] text-zinc-300">
            {ESP_LABEL[profile.esp]}
          </Badge>
          <Badge className="border-zinc-700 bg-zinc-800 text-[9px] text-zinc-300">
            {profile.lenderName}
          </Badge>
          {profile.domain.verified ? (
            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-[9px] text-emerald-300">
              <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
              {profile.domain.domain}
            </Badge>
          ) : (
            <Badge className="border-amber-500/30 bg-amber-500/10 text-[9px] text-amber-300">
              {profile.domain.domain} · unverified
            </Badge>
          )}
        </div>
        {profile.description && (
          <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground/80">
            {profile.description}
          </p>
        )}
      </div>
    </button>
  )
}

function ResolvedIdentity({
  profile,
  customFromName,
  customFromEmail,
  customReplyTo,
  onCustomChange,
  compact,
}: {
  profile: SenderProfile
  customFromName: string
  customFromEmail: string
  customReplyTo: string
  onCustomChange?: (patch: {
    customFromName?: string
    customFromEmail?: string
    customReplyTo?: string
  }) => void
  compact: boolean
}) {
  const hasCustom = Boolean(customFromName || customFromEmail || customReplyTo)
  const [expanded, setExpanded] = React.useState(hasCustom)

  // Draft state — edits stay local until the user explicitly Confirms. This
  // stops accidental typing from mutating the resolved sender identity on
  // every keystroke, and gives us a clear "commit" moment we can toast on.
  const [draft, setDraft] = React.useState({
    fromName: customFromName,
    fromEmail: customFromEmail,
    replyTo: customReplyTo,
  })

  // Re-sync the draft whenever the committed override changes from the
  // outside (e.g. switching variations, Reset to profile clears it).
  React.useEffect(() => {
    setDraft({
      fromName: customFromName,
      fromEmail: customFromEmail,
      replyTo: customReplyTo,
    })
  }, [customFromName, customFromEmail, customReplyTo])

  const dirty =
    draft.fromName !== customFromName ||
    draft.fromEmail !== customFromEmail ||
    draft.replyTo !== customReplyTo

  const effectiveFromName = customFromName || profile.fromName
  const effectiveFromEmail = customFromEmail || profile.fromEmail
  const effectiveReplyTo = customReplyTo || profile.replyTo

  // Committed-state domain check — drives the ResolvedRow badge at the top.
  const customDomain = customFromEmail.includes("@")
    ? customFromEmail.split("@")[1] ?? ""
    : ""
  const domainMismatch =
    customDomain && customDomain.toLowerCase() !== profile.domain.domain.toLowerCase()

  // Draft-state domain check — drives the inline warning inside the editor
  // so the user sees the SPF/DKIM issue *before* they hit Confirm.
  const draftDomain = draft.fromEmail.includes("@")
    ? draft.fromEmail.split("@")[1] ?? ""
    : ""
  const draftDomainMismatch =
    draftDomain && draftDomain.toLowerCase() !== profile.domain.domain.toLowerCase()

  const confirmChanges = () => {
    if (!onCustomChange || !dirty) return
    onCustomChange({
      customFromName: draft.fromName,
      customFromEmail: draft.fromEmail,
      customReplyTo: draft.replyTo,
    })
    toast.success("Sender identity override saved", {
      description:
        (draft.fromName || draft.fromEmail || draft.replyTo)
          ? "Applied for this campaign only. Governed profile still routes the send."
          : "Cleared — falling back to the governed profile.",
    })
    setExpanded(false)
  }

  const cancelChanges = () => {
    setDraft({
      fromName: customFromName,
      fromEmail: customFromEmail,
      replyTo: customReplyTo,
    })
  }

  return (
    <div className="space-y-1.5 rounded-md border border-border bg-muted/10 px-3 py-2.5">
      <ResolvedRow icon={<AtSign className="h-3 w-3" />} label="From">
        <span className="text-foreground">
          {effectiveFromName} &lt;{effectiveFromEmail}&gt;
        </span>
        {hasCustom && (
          <span className="ml-1.5 rounded bg-amber-500/15 px-1 py-px text-[9px] font-medium uppercase tracking-wider text-amber-300">
            Custom
          </span>
        )}
      </ResolvedRow>
      <ResolvedRow icon={<Reply className="h-3 w-3" />} label="Reply-to">
        <span className="text-foreground">{effectiveReplyTo}</span>
      </ResolvedRow>
      <ResolvedRow icon={<Shield className="h-3 w-3" />} label="Domain">
        <span className="inline-flex items-center gap-1 text-foreground">
          {customDomain || profile.domain.domain}
          {profile.domain.verified && !domainMismatch ? (
            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-[9px] text-emerald-300">
              <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
              Verified
            </Badge>
          ) : (
            <Badge className="border-amber-500/30 bg-amber-500/10 text-[9px] text-amber-300">
              {domainMismatch ? "Unverified · SPF/DKIM will fail" : "Unverified"}
            </Badge>
          )}
        </span>
      </ResolvedRow>
      {!compact && (
        <>
          <ResolvedRow icon={<Cog className="h-3 w-3" />} label="Route">
            <span className="text-foreground">{ESP_LABEL[profile.esp]}</span>
          </ResolvedRow>
          {(profile.cc?.length || profile.bcc?.length) && (
            <ResolvedRow icon={<Users className="h-3 w-3" />} label="Copies">
              <span className="text-foreground">
                {profile.cc?.length ? `CC ${profile.cc.length}` : ""}
                {profile.cc?.length && profile.bcc?.length ? " · " : ""}
                {profile.bcc?.length ? `BCC ${profile.bcc.length}` : ""}
              </span>
            </ResolvedRow>
          )}
        </>
      )}

      {onCustomChange && (
        <div className="pt-1.5">
          <button
            type="button"
            onClick={() => setExpanded((s) => !s)}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-primary-400 hover:text-primary-300"
          >
            <Pencil className="h-2.5 w-2.5" />
            {expanded ? "Hide custom From" : hasCustom ? "Edit custom From" : "Override From identity"}
          </button>
          {hasCustom && (
            <button
              type="button"
              onClick={() => {
                onCustomChange({
                  customFromName: "",
                  customFromEmail: "",
                  customReplyTo: "",
                })
                toast.info("Reverted to governed profile identity")
              }}
              className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              Reset to profile
            </button>
          )}
          {expanded && (
            <div className="mt-2 space-y-2 rounded-md border border-border/60 bg-canvas/50 p-2.5">
              <FieldRow label="From name">
                <input
                  value={draft.fromName}
                  onChange={(e) => setDraft((d) => ({ ...d, fromName: e.target.value }))}
                  placeholder={profile.fromName}
                  className="h-7 w-full rounded border border-input bg-transparent px-2 text-[11px] outline-none focus-visible:border-ring dark:bg-input/30"
                />
              </FieldRow>
              <FieldRow label="From email">
                <input
                  type="email"
                  value={draft.fromEmail}
                  onChange={(e) => setDraft((d) => ({ ...d, fromEmail: e.target.value }))}
                  placeholder={profile.fromEmail}
                  className="h-7 w-full rounded border border-input bg-transparent px-2 font-mono text-[11px] outline-none focus-visible:border-ring dark:bg-input/30"
                />
              </FieldRow>
              <FieldRow label="Reply-to">
                <input
                  type="email"
                  value={draft.replyTo}
                  onChange={(e) => setDraft((d) => ({ ...d, replyTo: e.target.value }))}
                  placeholder={profile.replyTo}
                  className="h-7 w-full rounded border border-input bg-transparent px-2 font-mono text-[11px] outline-none focus-visible:border-ring dark:bg-input/30"
                />
              </FieldRow>

              {/* Live preview of the resolved From identity if the draft is confirmed. */}
              <div className="rounded-md border border-primary/25 bg-primary/[0.06] px-2 py-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-primary/80">
                  Preview
                </p>
                <p className="mt-0.5 truncate text-[11px] text-foreground">
                  {(draft.fromName || profile.fromName) + " "}
                  &lt;{draft.fromEmail || profile.fromEmail}&gt;
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  Reply-to: {draft.replyTo || profile.replyTo}
                </p>
              </div>

              {draftDomainMismatch && (
                <div className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-2 py-1.5 text-[10px] leading-relaxed text-amber-300">
                  <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
                  <div>
                    <p className="font-medium">
                      Domain <span className="font-mono">{draftDomain}</span> isn&apos;t verified for this profile.
                    </p>
                    <p className="mt-0.5 text-amber-200/80">
                      SPF/DKIM will fail — messages will likely land in spam or bounce. Ask an admin
                      to add and verify this domain in Sender Profiles.
                    </p>
                  </div>
                </div>
              )}
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Custom From identity overrides the profile&apos;s fields for this campaign only.
                Governed profile still routes the send.
              </p>

              {/* Confirm / Cancel — changes only commit on Confirm. */}
              <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                <span
                  className={cn(
                    "text-[10px]",
                    dirty ? "text-amber-300" : "text-muted-foreground",
                  )}
                >
                  {dirty ? "Unsaved changes" : "Up to date"}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={cancelChanges}
                    disabled={!dirty}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={confirmChanges}
                    disabled={!dirty}
                  >
                    <Check className="h-3 w-3" />
                    Confirm changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function ResolvedRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </div>
  )
}

/** Try to derive a sensible default sender-profile from the composer's lender
 *  context (playbook / rich template). Used to preselect on first render. */
export function deriveDefaultSenderProfile(lenderId: string | null): string | null {
  if (!lenderId) {
    return senderProfiles.find((p) => p.lenderId === "general" && p.status === "active")?.id ?? null
  }
  const lenderPick = senderProfiles.find(
    (p) => p.lenderId === lenderId && p.status === "active" && p.domain.verified,
  )
  return lenderPick?.id ?? null
}
