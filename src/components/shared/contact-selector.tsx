"use client"

/**
 * ContactSelector — the shared UI for B2B multi-contact recipient rules.
 *
 * Used by AI Call, Email, SMS and Human Campaign editors when the current
 * lender has `tamara_b2b_contacts` enabled. No per-surface variants —
 * anywhere an author asks "who on this account should this reach?", they
 * see this component.
 */

import * as React from "react"
import { Info, Route, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_RECIPIENT_RULE,
  DESIGNATION_LABEL,
  describeRule,
  resolveRecipients,
  B2B_ACCOUNTS,
  type Designation,
  type RecipientRule,
} from "@/data/contacts"

const DESIGNATIONS: Designation[] = [
  "ceo_office",
  "finance",
  "admin",
  "ap",
  "procurement",
  "other",
]

const MODE_OPTIONS: Array<{
  id: RecipientRule["mode"]
  label: string
  hint: string
}> = [
  {
    id: "primary_only",
    label: "Primary contact only",
    hint: "The single primary contact on each account.",
  },
  {
    id: "all_contacts",
    label: "All contacts",
    hint: "Every non-DNC contact on the account, in the order returned.",
  },
  {
    id: "by_designation",
    label: "By designation",
    hint: "Only contacts whose designation matches your selection.",
  },
  {
    id: "priority_order",
    label: "Priority order",
    hint: "Every contact, sorted by priority rank (1 = highest).",
  },
]

interface ContactSelectorProps {
  value: RecipientRule
  onChange: (next: RecipientRule) => void
  /** When provided, the "resolves to ~N contacts" hint uses this cohort. */
  sampleAccountIds?: string[]
  className?: string
}

export function ContactSelector({
  value,
  onChange,
  sampleAccountIds,
  className,
}: ContactSelectorProps) {
  const rule = { ...DEFAULT_RECIPIENT_RULE, ...value }
  const set = <K extends keyof RecipientRule>(k: K, v: RecipientRule[K]) =>
    onChange({ ...rule, [k]: v })

  const toggleDesignation = (d: Designation) => {
    const cur = rule.designations ?? []
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]
    set("designations", next)
  }

  const preview = React.useMemo(() => {
    const cohort = sampleAccountIds ?? B2B_ACCOUNTS
    if (cohort.length === 0) return { totalContacts: 0, sampleN: 0 }
    let sum = 0
    for (const acct of cohort) sum += resolveRecipients(acct, rule).length
    return { totalContacts: sum, sampleN: cohort.length }
  }, [rule, sampleAccountIds])

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-primary" />
        <div className="text-[12px] font-semibold text-foreground">Recipients</div>
      </div>

      {/* Mode radio cards */}
      <div className="grid gap-1.5 sm:grid-cols-2">
        {MODE_OPTIONS.map((o) => {
          const active = rule.mode === o.id
          return (
            <label
              key={o.id}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 transition-colors",
                active
                  ? "border-primary/60 bg-primary/[0.05]"
                  : "border-border bg-background/60 hover:bg-muted/40",
              )}
            >
              <input
                type="radio"
                checked={active}
                onChange={() => set("mode", o.id)}
                className="mt-0.5 h-3.5 w-3.5 accent-primary"
              />
              <div>
                <div className="text-[11px] font-medium text-foreground">
                  {o.label}
                </div>
                <div className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
                  {o.hint}
                </div>
              </div>
            </label>
          )
        })}
      </div>

      {rule.mode === "by_designation" && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Designations
          </div>
          <div className="flex flex-wrap gap-1">
            {DESIGNATIONS.map((d) => {
              const active = (rule.designations ?? []).includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDesignation(d)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[10px] font-medium",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {DESIGNATION_LABEL[d]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-background/60 px-2.5 py-1.5">
          <div>
            <div className="text-[11px] font-medium text-foreground">
              Include unverified numbers
            </div>
            <div className="mt-0.5 text-[9px] text-muted-foreground">
              Both AI and human agents dial these.
            </div>
          </div>
          <input
            type="checkbox"
            checked={rule.includeUnverifiedNumbers}
            onChange={(e) => set("includeUnverifiedNumbers", e.target.checked)}
            className="h-4 w-8"
          />
        </label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-foreground">
              Max contacts / account
            </div>
            <div className="mt-0.5 text-[9px] text-muted-foreground">
              Blank = no cap.
            </div>
          </div>
          <Input
            type="number"
            min={1}
            max={20}
            value={rule.maxContactsPerAccount ?? ""}
            onChange={(e) => {
              const raw = e.target.value.trim()
              set(
                "maxContactsPerAccount",
                raw === "" ? undefined : Math.max(1, Math.min(20, Number(raw))),
              )
            }}
            placeholder="—"
            className="h-7 w-14 text-center text-[11px] tabular-nums"
          />
        </div>
      </div>

      {rule.mode !== "primary_only" && (
        <div className="rounded-md border border-border bg-background/60 px-2.5 py-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Fallback when no contact matches
          </div>
          <div className="mt-1.5 flex gap-3">
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-foreground">
              <input
                type="radio"
                checked={rule.fallback === "use_primary"}
                onChange={() => set("fallback", "use_primary")}
                className="h-3.5 w-3.5 accent-primary"
              />
              Use primary
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-foreground">
              <input
                type="radio"
                checked={rule.fallback === "skip_account"}
                onChange={() => set("fallback", "skip_account")}
                className="h-3.5 w-3.5 accent-primary"
              />
              Skip account
            </label>
          </div>
        </div>
      )}

      {/* Resolution preview */}
      <div className="flex items-start gap-2 rounded-md border border-info-500/40 bg-info-500/[0.05] px-2.5 py-1.5 text-[10px] text-info-300">
        <Route className="mt-0.5 h-3 w-3 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            Resolves to ~{preview.totalContacts} contacts across{" "}
            {preview.sampleN} sample account
            {preview.sampleN === 1 ? "" : "s"}
          </div>
          <div className="mt-0.5 text-muted-foreground">{describeRule(rule)}</div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/[0.04] px-2.5 py-1.5 text-[10px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          When a rule resolves to multiple contacts, outreach runs
          sequentially — the next contact starts only after the current
          one&apos;s retries are exhausted or its outcome triggers rotation.
          Frequency caps apply per contact, not per account.
        </span>
      </div>
    </div>
  )
}
