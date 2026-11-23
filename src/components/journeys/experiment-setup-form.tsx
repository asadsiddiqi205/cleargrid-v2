"use client"

/**
 * Experiment setup form — mounted inside the Experiment node config panel.
 *
 * Exposes three sections because the config panel splits them across tabs:
 *   • GeneralSection  → General tab (below the generic Name / Block type)
 *   • ArmsSection     → Branches tab (replaces generic rename-branches UI)
 *   • GoalLogicSection → Logic tab (Goal + Duration + Winner + Status)
 *
 * All three take and mutate the same `ExperimentConfig` via `onChange`.
 * The outer panel is responsible for persisting the updated config back
 * onto the React Flow node (`update("experiment", cfg)`).
 */

import { Copy, Plus, Shield, Shuffle, Trash2 } from "lucide-react"
import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  addArm,
  distributeEvenly,
  estimateDaysToSampleSize,
  generateExperimentId,
  GUARDRAIL_LABEL,
  isConcluded,
  PRIMARY_METRIC_KIND,
  PRIMARY_METRIC_LABEL,
  removeArm,
  requiredSampleSizePerArm,
  SECONDARY_METRIC_LABEL,
  setControl,
  startNewVersion,
  statusLabel,
  totalShare,
} from "@/data/experiments"
import type {
  ExperimentArm,
  ExperimentConfig,
  GuardrailId,
  PrimaryMetricId,
  SecondaryMetricId,
} from "@/data/experiments"

interface SectionProps {
  cfg: ExperimentConfig
  onChange: (next: ExperimentConfig) => void
}

/* ─────────── General section ─────────── */

export function ExperimentGeneralSection({ cfg, onChange }: SectionProps) {
  const running = cfg.status === "running" || cfg.status === "paused"
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Experiment name</Label>
        <Input
          value={cfg.name}
          onChange={(e) => {
            const name = e.target.value
            onChange({
              ...cfg,
              name,
              // Keep the id in sync with the name only while still editable.
              experimentId: running ? cfg.experimentId : generateExperimentId(name, cfg.version),
            })
          }}
          placeholder="e.g. Drop AI calls for 31-60 DPD"
          className="h-7 text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Hypothesis</Label>
        <Input
          value={cfg.hypothesis}
          onChange={(e) => onChange({ ...cfg, hypothesis: e.target.value })}
          placeholder="e.g. Dropping calls for 31-60 DPD keeps collection within 1pp at lower cost"
          className="h-7 text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Experiment ID</Label>
        <div className="flex items-center gap-1.5">
          <Input
            readOnly
            value={cfg.experimentId}
            className="h-7 flex-1 bg-muted/20 font-mono text-[10px]"
          />
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                void navigator.clipboard.writeText(cfg.experimentId)
              }
            }}
            className="rounded border border-border/60 bg-muted/20 p-1.5 text-muted-foreground hover:bg-muted/40"
            aria-label="Copy experiment ID"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Generated from the name plus a version suffix. Used as the bucketing salt.
        </p>
      </div>
      <StatusRow cfg={cfg} onChange={onChange} />
    </div>
  )
}

function StatusRow({ cfg }: SectionProps) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/40 bg-muted/10 px-2.5 py-2">
      <div>
        <p className="text-[10px] text-muted-foreground">Status</p>
        <p className="text-xs font-medium text-foreground">{statusLabel(cfg.status)}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] text-muted-foreground">Version</p>
        <p className="text-xs font-medium text-foreground">v{cfg.version}</p>
      </div>
    </div>
  )
}

/* ─────────── Arms section ─────────── */

export function ExperimentArmsSection({ cfg, onChange }: SectionProps) {
  const hasControl = cfg.arms.some((a) => a.isControl)
  const sum = totalShare(cfg.arms)
  const running = cfg.status === "running" || cfg.status === "paused"
  const concluded = isConcluded(cfg.status)

  const onUpdateArm = (id: string, patch: Partial<ExperimentArm>) => {
    onChange({ ...cfg, arms: cfg.arms.map((a) => (a.id === id ? { ...a, ...patch } : a)) })
  }

  const onAddArm = () => {
    if (cfg.arms.length >= 5) return
    if (running) {
      onChange(startNewVersion(cfg, (c) => ({ ...c, arms: addArm(c.arms) })))
      return
    }
    onChange({ ...cfg, arms: addArm(cfg.arms) })
  }

  const onRemoveArm = (armId: string) => {
    if (running) {
      onChange(startNewVersion(cfg, (c) => ({ ...c, arms: removeArm(c.arms, armId) })))
      return
    }
    onChange({ ...cfg, arms: removeArm(cfg.arms, armId) })
  }

  const onToggleControl = (next: boolean) => {
    if (running) {
      onChange(startNewVersion(cfg, (c) => ({ ...c, arms: setControl(c.arms, next) })))
      return
    }
    onChange({ ...cfg, arms: setControl(cfg.arms, next) })
  }

  const onDistributeEvenly = () => {
    onChange({ ...cfg, arms: distributeEvenly(cfg.arms) })
  }

  return (
    <div className="space-y-3">
      {running && (
        <div className="rounded-md border border-warning-500/40 bg-warning-500/10 p-2 text-[10px] text-warning-400">
          Changing percentages distorts the comparison. Adding or removing arms
          starts a new version (v{cfg.version + 1}) and re-buckets.
        </div>
      )}
      {concluded && (
        <div className="rounded-md border border-border/60 bg-muted/20 p-2 text-[10px] text-muted-foreground">
          Experiment is concluded — edits are disabled.
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Arms</Label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onDistributeEvenly}
            disabled={concluded}
            className="flex items-center gap-1 rounded border border-border/60 bg-muted/20 px-2 py-1 text-[10px] text-foreground hover:bg-muted/40 disabled:opacity-50"
          >
            <Shuffle className="h-3 w-3" />
            Distribute evenly
          </button>
          <button
            type="button"
            onClick={onAddArm}
            disabled={concluded || cfg.arms.length >= 5}
            className="flex items-center gap-1 rounded border border-border/60 bg-muted/20 px-2 py-1 text-[10px] text-foreground hover:bg-muted/40 disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Add arm
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {cfg.arms.map((arm) => (
          <div
            key={arm.id}
            className={cn(
              "space-y-1.5 rounded-md border px-2.5 py-2",
              arm.isControl ? "border-muted-foreground/40 bg-muted/10" : "border-border/40 bg-muted/5",
            )}
          >
            <div className="flex items-center gap-1.5">
              {arm.isControl && <Shield className="h-3 w-3 text-muted-foreground" />}
              <Input
                value={arm.name}
                onChange={(e) => onUpdateArm(arm.id, { name: e.target.value })}
                disabled={concluded}
                className="h-6 flex-1 text-xs"
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={arm.share}
                onChange={(e) =>
                  onUpdateArm(arm.id, { share: Math.max(0, Math.min(100, Number(e.target.value))) })
                }
                disabled={concluded}
                className="h-6 w-16 text-right text-xs"
              />
              <span className="text-[10px] text-muted-foreground">%</span>
              {cfg.arms.length > 2 && !concluded && (
                <button
                  type="button"
                  onClick={() => onRemoveArm(arm.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-error-500/10 hover:text-error-400"
                  aria-label={`Remove ${arm.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <Input
              value={arm.description}
              onChange={(e) => onUpdateArm(arm.id, { description: e.target.value })}
              placeholder="What does this arm test?"
              disabled={concluded}
              className="h-6 text-[10px]"
            />
          </div>
        ))}
      </div>

      <div
        className={cn(
          "rounded-md px-2.5 py-1.5 text-xs font-medium",
          sum === 100 ? "bg-primary-500/10 text-primary-400" : "bg-error-500/10 text-error-400",
        )}
      >
        Total: {sum}%{sum !== 100 && " — must equal 100%"}
      </div>

      <label className="flex items-center justify-between rounded-md border border-border/40 bg-muted/5 px-2.5 py-2">
        <div className="flex-1">
          <p className="text-xs text-foreground">Add control (holdout)</p>
          <p className="text-[10px] text-muted-foreground">
            Control gets no messages or calls from this experiment and exits with tag
            {" "}<code className="rounded bg-muted/20 px-1 py-0.5 text-[9px]">experiment_control</code>.
            Still tracked for outcomes through the attribution window.
          </p>
        </div>
        <Switch checked={hasControl} onCheckedChange={onToggleControl} disabled={concluded} size="sm" />
      </label>

      <label className="flex items-center justify-between rounded-md border border-border/40 bg-muted/5 px-2.5 py-2">
        <div className="flex-1">
          <p className="text-xs text-foreground">Sticky assignment on re-entry</p>
          <p className="text-[10px] text-muted-foreground">
            Same borrower re-entering the step lands in the same arm. Turning this
            off breaks the comparison.
          </p>
        </div>
        <Switch
          checked={cfg.sticky}
          onCheckedChange={(v) => onChange({ ...cfg, sticky: v })}
          disabled={concluded}
          size="sm"
        />
      </label>
      {!cfg.sticky && (
        <div className="rounded-md border border-warning-500/40 bg-warning-500/10 p-2 text-[10px] text-warning-400">
          Sticky assignment is off — a borrower re-entering the step can be re-bucketed,
          which breaks the comparison.
        </div>
      )}
    </div>
  )
}

/* ─────────── Goal + Duration + Winner section ─────────── */

interface GoalLogicSectionProps extends SectionProps {
  /** Journey's daily enrolment rate — used only to estimate duration. */
  dailyEnrolment?: number
}

export function ExperimentGoalLogicSection({ cfg, onChange, dailyEnrolment = 100 }: GoalLogicSectionProps) {
  const concluded = isConcluded(cfg.status)
  const kind = PRIMARY_METRIC_KIND[cfg.primaryMetric]

  const perArmTarget = useMemo(
    () => requiredSampleSizePerArm(kind, cfg.sampleSize.baselineValue, cfg.sampleSize.minDetectableEffect),
    [kind, cfg.sampleSize.baselineValue, cfg.sampleSize.minDetectableEffect],
  )
  const estimatedDays = useMemo(
    () => estimateDaysToSampleSize(perArmTarget, dailyEnrolment, cfg.arms),
    [perArmTarget, dailyEnrolment, cfg.arms],
  )

  const durationDays = useMemo(() => {
    if (cfg.duration.mode === "fixed_end_date" && cfg.duration.endDate && cfg.startedAt) {
      const start = new Date(cfg.startedAt).getTime()
      const end = new Date(cfg.duration.endDate).getTime()
      if (!isNaN(start) && !isNaN(end)) {
        return Math.max(0, Math.round((end - start) / (24 * 3600 * 1000)))
      }
    }
    return null
  }, [cfg.duration, cfg.startedAt])

  const planShorterThanAttribution = durationDays !== null && durationDays < cfg.attributionDays
  const planShorterThanSample = durationDays !== null && durationDays < estimatedDays

  const onPrimaryChange = (v: PrimaryMetricId) => {
    // Changing primary metric requires a new version while running.
    if (cfg.status === "running" || cfg.status === "paused") {
      onChange(startNewVersion(cfg, (c) => ({ ...c, primaryMetric: v })))
      return
    }
    onChange({ ...cfg, primaryMetric: v })
  }

  return (
    <div className="space-y-4">
      {/* Goal */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Goal</p>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Primary metric</Label>
          <NativeSelect
            value={cfg.primaryMetric}
            onChange={(e) => onPrimaryChange(e.target.value as PrimaryMetricId)}
            disabled={concluded}
          >
            {Object.entries(PRIMARY_METRIC_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Secondary metrics</Label>
          <MultiSelectChips
            options={Object.entries(SECONDARY_METRIC_LABEL)
              .filter(([id]) => id !== cfg.primaryMetric)
              .map(([id, label]) => ({ id: id as SecondaryMetricId, label }))}
            value={cfg.secondaryMetrics}
            onChange={(next) => onChange({ ...cfg, secondaryMetrics: next })}
            disabled={concluded}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Guardrails</Label>
          <div className="space-y-1.5">
            {(Object.keys(GUARDRAIL_LABEL) as GuardrailId[]).map((gid) => {
              const existing = cfg.guardrails.find((g) => g.id === gid)
              const on = Boolean(existing)
              return (
                <div
                  key={gid}
                  className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/5 px-2 py-1.5"
                >
                  <Switch
                    checked={on}
                    size="sm"
                    disabled={concluded}
                    onCheckedChange={(v) => {
                      if (v) {
                        onChange({
                          ...cfg,
                          guardrails: [...cfg.guardrails, { id: gid, threshold: defaultThreshold(gid) }],
                        })
                      } else {
                        onChange({ ...cfg, guardrails: cfg.guardrails.filter((g) => g.id !== gid) })
                      }
                    }}
                  />
                  <span className="flex-1 text-[11px] text-foreground">{GUARDRAIL_LABEL[gid]}</span>
                  {on && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">worse by &gt;</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={(existing!.threshold * (gid === "cost_per_borrower" ? 100 : 100)).toFixed(1)}
                        onChange={(e) =>
                          onChange({
                            ...cfg,
                            guardrails: cfg.guardrails.map((g) =>
                              g.id === gid ? { ...g, threshold: Math.max(0, Number(e.target.value) / 100) } : g,
                            ),
                          })
                        }
                        disabled={concluded}
                        className="h-5 w-14 text-right text-[10px]"
                      />
                      <span className="text-[9px] text-muted-foreground">
                        {gid === "cost_per_borrower" ? "%" : "pp"}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Attribution window</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={30}
              value={cfg.attributionDays}
              onChange={(e) =>
                onChange({
                  ...cfg,
                  attributionDays: Math.max(1, Math.min(30, Number(e.target.value))),
                })
              }
              disabled={concluded}
              className="h-7 w-20 text-xs"
            />
            <span className="text-[10px] text-muted-foreground">days</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Starts when a borrower is assigned to an arm. Delays inside an arm (waits,
            business hours) use up the window — plan for them.
          </p>
        </div>
      </div>

      {/* Duration & sample size */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Duration & sample size
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Run until</Label>
          <NativeSelect
            value={cfg.duration.mode}
            onChange={(e) =>
              onChange({ ...cfg, duration: { ...cfg.duration, mode: e.target.value as "fixed_end_date" | "per_arm_count" } })
            }
            disabled={concluded}
          >
            <option value="fixed_end_date">A fixed end date</option>
            <option value="per_arm_count">Each arm reaches a target count</option>
          </NativeSelect>
          {cfg.duration.mode === "fixed_end_date" ? (
            <Input
              type="date"
              value={cfg.duration.endDate ?? ""}
              onChange={(e) => onChange({ ...cfg, duration: { ...cfg.duration, endDate: e.target.value } })}
              disabled={concluded}
              className="h-7 text-xs"
            />
          ) : (
            <Input
              type="number"
              min={100}
              value={cfg.duration.perArmBorrowers ?? perArmTarget}
              onChange={(e) =>
                onChange({
                  ...cfg,
                  duration: { ...cfg.duration, perArmBorrowers: Math.max(100, Number(e.target.value)) },
                })
              }
              disabled={concluded}
              className="h-7 text-xs"
            />
          )}
        </div>

        <div className="rounded-md border border-border/40 bg-muted/10 p-2.5">
          <p className="text-[10px] font-semibold text-foreground">Sample size helper</p>
          <div className="mt-1.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="w-32 text-[10px] text-muted-foreground">Baseline</Label>
              <Input
                type="number"
                step={kind === "rate" ? 0.001 : 1}
                value={cfg.sampleSize.baselineValue}
                onChange={(e) =>
                  onChange({
                    ...cfg,
                    sampleSize: { ...cfg.sampleSize, baselineValue: Number(e.target.value) },
                  })
                }
                disabled={concluded}
                className="h-6 flex-1 text-[11px]"
              />
              <span className="w-10 text-right text-[9px] text-muted-foreground">
                {kind === "rate" ? "(decimal)" : "(AED)"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-32 text-[10px] text-muted-foreground">MDE</Label>
              <Input
                type="number"
                step={kind === "rate" ? 0.005 : 0.01}
                value={cfg.sampleSize.minDetectableEffect}
                onChange={(e) =>
                  onChange({
                    ...cfg,
                    sampleSize: { ...cfg.sampleSize, minDetectableEffect: Number(e.target.value) },
                  })
                }
                disabled={concluded}
                className="h-6 flex-1 text-[11px]"
              />
              <span className="w-10 text-right text-[9px] text-muted-foreground">
                {kind === "rate" ? "(pp)" : "(%)"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Fixed at 95% confidence · 80% power.
            </p>
            <div className="mt-1.5 rounded bg-background/40 px-2 py-1.5 text-[10px]">
              <span className="font-semibold text-foreground">
                {Number.isFinite(perArmTarget) ? perArmTarget.toLocaleString() : "—"}
              </span>{" "}
              borrowers per arm
              <br />
              <span className="font-semibold text-foreground">
                {Number.isFinite(estimatedDays) ? `~${estimatedDays} days` : "—"}
              </span>{" "}
              at {dailyEnrolment.toLocaleString()}/day journey enrolment
            </div>
          </div>
        </div>

        {planShorterThanAttribution && (
          <div className="rounded-md border border-error-500/40 bg-error-500/10 p-2 text-[10px] text-error-400">
            Planned duration ({durationDays}d) is shorter than the attribution window
            ({cfg.attributionDays}d). Outcomes won't have time to credit.
          </div>
        )}
        {!planShorterThanAttribution && planShorterThanSample && (
          <div className="rounded-md border border-warning-500/40 bg-warning-500/10 p-2 text-[10px] text-warning-400">
            Planned duration ({durationDays}d) is shorter than the sample size estimate
            (~{estimatedDays}d). Results may not reach significance.
          </div>
        )}
      </div>

      {/* Winner */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Winner</p>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Selection</Label>
          <NativeSelect
            value={cfg.winnerMode}
            onChange={(e) => onChange({ ...cfg, winnerMode: e.target.value as "manual" | "automatic" })}
            disabled={concluded}
          >
            <option value="manual">Manual</option>
            <option value="automatic">Automatic</option>
          </NativeSelect>
          <p className="text-[10px] text-muted-foreground">
            Automatic: once duration ends and every arm has a full attribution window,
            the best arm on {PRIMARY_METRIC_LABEL[cfg.primaryMetric]} is rolled out
            if it beats control at 95% confidence and breaches no guardrail.
            Control is never rolled out automatically.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">If no significant winner</Label>
          <NativeSelect
            value={cfg.noWinnerPolicy}
            onChange={(e) => onChange({ ...cfg, noWinnerPolicy: e.target.value as "keep_split" | "send_to_best" })}
            disabled={concluded}
          >
            <option value="keep_split">Keep the split</option>
            <option value="send_to_best">Send everyone to the best arm</option>
          </NativeSelect>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Helpers ─────────── */

function defaultThreshold(gid: GuardrailId): number {
  // Stored as decimals: 0.005 = 0.5pp for rates, 0.10 = 10% for cost.
  switch (gid) {
    case "cost_per_borrower":
      return 0.1
    default:
      return 0.005
  }
}

interface ChipOption<T extends string> {
  id: T
  label: string
}

function MultiSelectChips<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: ChipOption<T>[]
  value: T[]
  onChange: (next: T[]) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const selected = value.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (selected) onChange(value.filter((v) => v !== o.id))
              else onChange([...value, o.id])
            }}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] transition-colors disabled:opacity-50",
              selected
                ? "bg-primary-500/20 text-primary-400"
                : "bg-muted/20 text-muted-foreground hover:bg-muted/40",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
