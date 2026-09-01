"use client"

/**
 * CampaignScheduleTab — the "Schedule" tab shared by /campaigns/[id]/edit
 * AND the Trigger Human Campaign node's full-page editor. Matches the
 * reference ClearGrid design shared as screenshots:
 *
 *   · When to run (Start immediately / Schedule for later)
 *   · Start & end date/time (end reveals when Set end time is on)
 *   · Calling hours only (9 AM – 6 PM)
 *   · Recurring campaign (weekdays / daily time / recurrence end)
 *   · Redial settings: enable, max attempts, try multiple numbers
 *   · Round sequence builder: draggable contact chips per round,
 *     Add contact popover with remaining slots, wait between rounds,
 *     Add round, Repeat last round, fallback info banner.
 *   · Pause by default.
 */

import * as React from "react"
import {
  Clock,
  Info,
  Plus,
  RefreshCw,
  X,
  GripVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DEFAULT_CAMPAIGN_SCHEDULE,
  type CampaignContactSlot,
  type CampaignRedialRound,
  type CampaignSchedule,
  type CampaignWeekday,
} from "@/data/campaigns-seed"

const WEEKDAYS: CampaignWeekday[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
]

const ALL_CONTACT_SLOTS: CampaignContactSlot[] = [
  "Contact 1",
  "Contact 2",
  "Contact 3",
  "Contact 4",
  "Contact 5",
]

const WAIT_OPTIONS: Array<{ min: number; label: string }> = [
  { min: 5, label: "5 min" },
  { min: 15, label: "15 min" },
  { min: 30, label: "30 min" },
  { min: 60, label: "1 hour" },
  { min: 120, label: "2 hours" },
  { min: 240, label: "4 hours" },
  { min: 1440, label: "1 day" },
]

interface CampaignScheduleTabProps {
  schedule: CampaignSchedule
  onChange: (next: CampaignSchedule) => void
}

export function CampaignScheduleTab({
  schedule,
  onChange,
}: CampaignScheduleTabProps) {
  const s = mergeSchedule(schedule)
  const set = <K extends keyof CampaignSchedule>(k: K, v: CampaignSchedule[K]) =>
    onChange({ ...s, [k]: v })
  const setRedial = <K extends keyof CampaignSchedule["redial"]>(
    k: K,
    v: CampaignSchedule["redial"][K],
  ) => {
    const nextRedial = { ...s.redial, [k]: v }
    onChange({
      ...s,
      redial: nextRedial,
      redialEnabled: k === "enabled" ? Boolean(v) : nextRedial.enabled,
    })
  }
  const setRecurring = <K extends keyof CampaignSchedule["recurring"]>(
    k: K,
    v: CampaignSchedule["recurring"][K],
  ) => onChange({ ...s, recurring: { ...s.recurring, [k]: v } })

  return (
    <div className="space-y-4">
      {/* When to run */}
      <Section title="When to run">
        <div className="space-y-2">
          <RadioCard
            checked={s.mode === "immediate"}
            onSelect={() => set("mode", "immediate")}
            title="Start immediately"
            description="Campaign begins as soon as you click Start Campaign."
          />
          <RadioCard
            checked={s.mode === "scheduled"}
            onSelect={() => set("mode", "scheduled")}
            title="Schedule for later"
            description="One-time: use start/end below. Recurring: turn on below — then weekdays, daily time, and recurrence end replace those fields (values are kept if you switch back)."
          />
        </div>
      </Section>

      {s.mode === "scheduled" && !s.recurring.enabled && (
        <>
          <Field label="Start date & time">
            <DateTimeInput
              value={s.startsAt ?? ""}
              onChange={(v) => set("startsAt", v)}
              placeholder="Select start date and time"
            />
          </Field>

          <ToggleRow
            title="Set end time"
            description="When on, the campaign stops after the end date and time you choose."
            checked={s.setEndTime}
            onChange={(v) => set("setEndTime", v)}
            tone={s.setEndTime ? "warn" : "default"}
          />

          {s.setEndTime && (
            <Field label="End date & time" hint="Must be after the start.">
              <DateTimeInput
                value={s.endsAt ?? ""}
                onChange={(v) => set("endsAt", v)}
                placeholder="Select end date and time"
              />
            </Field>
          )}
        </>
      )}

      {/* Calling hours only */}
      <ToggleRow
        title="Calling hours only (9 AM – 6 PM)"
        description="Campaign auto-pauses outside these hours and resumes the next day."
        checked={s.callingHoursOnly}
        onChange={(v) => set("callingHoursOnly", v)}
      />

      {/* Recurring */}
      <ToggleRow
        icon={<RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />}
        title="Recurring campaign"
        description={
          s.recurring.enabled
            ? "The campaign repeats on the days and time set below."
            : "Repeat on chosen weekdays and a specific daily time."
        }
        checked={s.recurring.enabled}
        onChange={(v) => setRecurring("enabled", v)}
      />
      {s.mode === "scheduled" && s.recurring.enabled && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/[0.04] p-3">
          <Field label="Weekdays">
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((d) => {
                const active = s.recurring.weekdays.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setRecurring(
                        "weekdays",
                        active
                          ? s.recurring.weekdays.filter((x) => x !== d)
                          : [...s.recurring.weekdays, d],
                      )
                    }
                    className={cn(
                      "rounded-md border px-2 py-1 text-[11px] font-medium",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Daily time">
              <TimeInput
                value={s.recurring.dailyTime}
                onChange={(v) => setRecurring("dailyTime", v)}
              />
            </Field>
            <Field label="Recurrence end" hint="Leave blank to repeat forever.">
              <DateInput
                value={s.recurring.endDate}
                onChange={(v) => setRecurring("endDate", v)}
              />
            </Field>
          </div>
        </div>
      )}

      {/* Pause by default */}
      <ToggleRow
        title="Pause by default"
        description="Campaign starts paused — an operator has to un-pause it before dialing begins."
        checked={s.pauseByDefault}
        onChange={(v) => set("pauseByDefault", v)}
      />

      {/* Redial settings */}
      <Section title="Redial settings" description="Configure how the dialer handles unanswered and failed calls.">
        <ToggleRow
          title="Enable redial / multiple attempts"
          description="After an unanswered call, retry using the rules below."
          checked={s.redial.enabled}
          onChange={(v) => setRedial("enabled", v)}
        />
        {s.redial.enabled && (
          <>
            <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-foreground">
                  Max attempts per contact
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  After this many unanswered attempts, the contact is marked as
                  exhausted and skipped.
                </div>
              </div>
              <input
                type="number"
                min={1}
                max={10}
                value={s.redial.maxAttemptsPerContact}
                onChange={(e) =>
                  setRedial(
                    "maxAttemptsPerContact",
                    Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                  )
                }
                className="ml-3 h-8 w-16 rounded-md border border-input bg-background px-2 text-center text-[13px] tabular-nums outline-none focus-visible:border-ring"
              />
            </div>
            <ToggleRow
              className="mt-3"
              title="Try multiple numbers"
              description="Call alternate numbers if the primary is unavailable."
              checked={s.redial.tryMultipleNumbers}
              onChange={(v) => setRedial("tryMultipleNumbers", v)}
            />
            <RoundSequenceBuilder
              rounds={s.redial.rounds}
              onChange={(rounds) => setRedial("rounds", rounds)}
            />
            <ToggleRow
              className="mt-3"
              title="Repeat last round if attempts exceed rounds defined"
              description="Keeps using the final round configuration for extra attempts."
              checked={s.redial.repeatLastRound}
              onChange={(v) => setRedial("repeatLastRound", v)}
            />
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/[0.04] px-3 py-2 text-[10px] text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                If a borrower has no number saved for a contact slot (e.g.{" "}
                <span className="text-foreground">Contact 3</span>), that slot
                is skipped and the borrower&apos;s primary contact will be
                called instead. The primary contact is always available as a
                fallback.
              </span>
            </div>
          </>
        )}
      </Section>
    </div>
  )
}

/* ─────────── Round sequence builder ─────────── */

function RoundSequenceBuilder({
  rounds,
  onChange,
}: {
  rounds: CampaignRedialRound[]
  onChange: (next: CampaignRedialRound[]) => void
}) {
  const nextRoundId = () =>
    `round-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`

  const removeRound = (id: string) => {
    if (rounds.length <= 1) return
    onChange(rounds.filter((r) => r.id !== id))
  }
  const addRound = () => {
    onChange([
      ...rounds,
      {
        id: nextRoundId(),
        contacts: [],
        waitBeforeMin: 30,
      },
    ])
  }
  const updateRound = (id: string, patch: Partial<CampaignRedialRound>) =>
    onChange(rounds.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const reorderContactsInRound = (
    id: string,
    from: number,
    to: number,
  ) => {
    const round = rounds.find((r) => r.id === id)
    if (!round) return
    if (from === to || from < 0 || to < 0 || from >= round.contacts.length) return
    const next = round.contacts.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    updateRound(id, { contacts: next })
  }

  return (
    <div className="mt-4">
      <div className="text-[13px] font-semibold text-foreground">
        Round sequence builder
      </div>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        Up to 5 contacts per round in any order. Drag chips to reorder. Use{" "}
        <span className="text-foreground font-medium">+ Add contact</span> to
        pick from remaining slots. Wait before each round after the first is
        set inside that round&apos;s card.
      </p>
      <div className="mt-3 space-y-2">
        {rounds.map((round, i) => (
          <RoundCard
            key={round.id}
            index={i}
            round={round}
            onRemove={rounds.length > 1 ? () => removeRound(round.id) : undefined}
            onUpdate={(patch) => updateRound(round.id, patch)}
            onReorderContacts={(from, to) =>
              reorderContactsInRound(round.id, from, to)
            }
          />
        ))}
      </div>
      <button
        type="button"
        onClick={addRound}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/60 bg-primary/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10"
      >
        <Plus className="h-3 w-3" />
        Add round
      </button>
    </div>
  )
}

function RoundCard({
  index,
  round,
  onRemove,
  onUpdate,
  onReorderContacts,
}: {
  index: number
  round: CampaignRedialRound
  onRemove?: () => void
  onUpdate: (patch: Partial<CampaignRedialRound>) => void
  onReorderContacts: (from: number, to: number) => void
}) {
  const available = ALL_CONTACT_SLOTS.filter((s) => !round.contacts.includes(s))
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12px] font-semibold text-foreground">
          Round {index + 1}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Remove round"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {round.contacts.length === 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="italic">
            No contacts selected — add contacts to define the sequence
          </span>
          <AddContactButton
            available={available}
            onPick={(c) => onUpdate({ contacts: [...round.contacts, c] })}
          />
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {round.contacts.map((c, i) => (
            <React.Fragment key={c}>
              <ContactChip
                label={c}
                onRemove={() =>
                  onUpdate({ contacts: round.contacts.filter((x) => x !== c) })
                }
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(i))
                  e.dataTransfer.effectAllowed = "move"
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "move"
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const from = Number(e.dataTransfer.getData("text/plain"))
                  if (!Number.isNaN(from)) onReorderContacts(from, i)
                }}
              />
              {i < round.contacts.length - 1 && (
                <span className="text-muted-foreground">→</span>
              )}
            </React.Fragment>
          ))}
          {available.length > 0 && (
            <AddContactButton
              available={available}
              onPick={(c) => onUpdate({ contacts: [...round.contacts, c] })}
            />
          )}
        </div>
      )}
      {index > 0 && (
        <>
          <div className="my-2 border-t border-border/60" />
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Wait</span>
            <WaitSelect
              value={round.waitBeforeMin}
              onChange={(v) => onUpdate({ waitBeforeMin: v })}
            />
            <span>before this round</span>
          </div>
        </>
      )}
    </div>
  )
}

function ContactChip({
  label,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  label: string
  onRemove: () => void
  onDragStart: React.DragEventHandler<HTMLSpanElement>
  onDragOver: React.DragEventHandler<HTMLSpanElement>
  onDrop: React.DragEventHandler<HTMLSpanElement>
}) {
  return (
    <span
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
    >
      <GripVertical className="h-3 w-3 cursor-grab text-primary/70" />
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="ml-0.5 text-primary/80 hover:text-primary"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

function AddContactButton({
  available,
  onPick,
}: {
  available: CampaignContactSlot[]
  onPick: (c: CampaignContactSlot) => void
}) {
  const [open, setOpen] = React.useState(false)
  if (available.length === 0) return null
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-primary/60 bg-primary/[0.06] px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
      >
        + Add contact
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
            <ul className="py-1">
              {available.map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(c)
                      setOpen(false)
                    }}
                    className="flex w-full items-center px-3 py-1.5 text-left text-[12px] text-foreground hover:bg-muted/60"
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

function WaitSelect({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-7 rounded-md border border-input bg-background px-2 text-[11px] outline-none focus-visible:border-ring"
    >
      {WAIT_OPTIONS.map((o) => (
        <option key={o.min} value={o.min}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/* ─────────── Small building blocks ─────────── */

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="text-[13px] font-semibold text-foreground">{title}</div>
      {description && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      )}
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-[11px] font-medium text-foreground">{label}</div>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function RadioCard({
  checked,
  onSelect,
  title,
  description,
}: {
  checked: boolean
  onSelect: () => void
  title: string
  description: string
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
        checked
          ? "border-primary/50 bg-primary/[0.06]"
          : "border-border bg-background/60 hover:bg-muted/40",
      )}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 h-4 w-4 accent-primary"
      />
      <div>
        <div className="text-[12px] font-semibold text-foreground">{title}</div>
        <div className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
          {description}
        </div>
      </div>
    </label>
  )
}

function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
  className,
  tone = "default",
}: {
  icon?: React.ReactNode
  title: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  className?: string
  tone?: "default" | "warn"
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2",
        checked
          ? tone === "warn"
            ? "border-warning-500/40 bg-warning-500/[0.06]"
            : "border-primary/40 bg-primary/[0.05]"
          : "border-border bg-background/60 hover:bg-muted/40",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        {icon}
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-foreground">{title}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {description}
          </div>
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} tone={tone} />
    </label>
  )
}

function ToggleSwitch({
  checked,
  onChange,
  tone = "default",
}: {
  checked: boolean
  onChange: (v: boolean) => void
  tone?: "default" | "warn"
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked
          ? tone === "warn"
            ? "bg-warning-500/80"
            : "bg-primary"
          : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

function DateTimeInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-2 text-[12px] outline-none focus-visible:border-ring"
      />
    </div>
  )
}

function DateInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-2 text-[12px] outline-none focus-visible:border-ring"
    />
  )
}

function TimeInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-2 text-[12px] outline-none focus-visible:border-ring"
    />
  )
}

/** Fills in any missing new-schedule fields on legacy campaign records. */
function mergeSchedule(input: CampaignSchedule): CampaignSchedule {
  return {
    ...DEFAULT_CAMPAIGN_SCHEDULE,
    ...input,
    recurring: { ...DEFAULT_CAMPAIGN_SCHEDULE.recurring, ...(input.recurring ?? {}) },
    redial: {
      ...DEFAULT_CAMPAIGN_SCHEDULE.redial,
      ...(input.redial ?? {}),
      rounds:
        input.redial?.rounds && input.redial.rounds.length > 0
          ? input.redial.rounds
          : DEFAULT_CAMPAIGN_SCHEDULE.redial.rounds,
    },
  }
}
