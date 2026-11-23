/**
 * Experiment / A-B Test node — config shape, defaults, migration and helpers.
 *
 * Every Experiment node on the canvas stores one `ExperimentConfig` under
 * `node.data.experiment`. This file is the single source of truth for what
 * an experiment is — its arms, its goal, its duration, its winner policy,
 * and its status lifecycle — so the setup form, the canvas card, the
 * Analytics tab and the Journey Report all read the same shape.
 *
 * Prototype rules:
 *  - Up to 5 arms total, including the optional Control (holdout) arm.
 *  - Arm → React Flow handle id is positional: arms[0]='a', [1]='b',
 *    [2]='c', [3]='d', [4]='e'. Downstream edges attach to those handle ids.
 *  - Legacy nodes with just `{variantCount, splitA, splitB, splitC, splitD}`
 *    are upgraded on first read via `migrateLegacyExperiment()` so existing
 *    journeys keep working.
 *
 * TODO (backend contract): persisted alongside the node graph in the same
 * journey document. The `experimentId` is the stable salt used to bucket
 * borrowers into arms; bumping the version suffix re-buckets and resets
 * results.
 */

export type ArmHandle = "a" | "b" | "c" | "d" | "e"

export const ARM_HANDLES: ArmHandle[] = ["a", "b", "c", "d", "e"]

export interface ExperimentArm {
  /** Stable id within the experiment version. */
  id: string
  /** React Flow source handle on the Experiment node. */
  handle: ArmHandle
  /** Display name, used on the canvas card and in every analytics column. */
  name: string
  /** Optional one-liner describing what this arm tests. */
  description: string
  /** Percentage of enrolled borrowers routed to this arm. 0–100. */
  share: number
  /** True for the Control (holdout) arm. Control gets no messages or calls
   *  from this experiment; borrowers assigned to it exit the journey with
   *  the `experiment_control` outcome tag but are still tracked through
   *  the attribution window. */
  isControl: boolean
}

/** Primary / secondary / guardrail metric identifiers. These overlap with
 *  `MessageMetricId` in `journey-metrics.ts` but are a separate set so a
 *  future refactor can keep experiment-level metrics distinct from
 *  message-level ones. */
export type PrimaryMetricId =
  | "ptp_rate"
  | "ptp_kept_rate"
  | "payment_rate"
  | "collection_pct"
  | "recovery_pct"
  | "cost_per_recovery"
  | "rpc_rate"

export type SecondaryMetricId =
  | PrimaryMetricId
  | "delivery_rate"
  | "ctr"
  | "contacts_per_borrower"

export type GuardrailId =
  | "opt_out_rate"
  | "spam_rate"
  | "ptp_broken_rate"
  | "cost_per_borrower"

export interface Guardrail {
  id: GuardrailId
  /** Threshold expressed in the metric's native units — percentage points
   *  (as a decimal, e.g. 0.005 = 0.5pp) for rate metrics, or percent
   *  (e.g. 0.10 = 10% worse) for amount metrics. */
  threshold: number
}

export type DurationMode = "fixed_end_date" | "per_arm_count"

export interface ExperimentDuration {
  mode: DurationMode
  /** ISO date (YYYY-MM-DD) when `mode === "fixed_end_date"`. */
  endDate?: string
  /** Target borrowers per arm when `mode === "per_arm_count"`. */
  perArmBorrowers?: number
}

export interface SampleSizeInputs {
  /** Baseline value of the primary metric, prefilled from the journey's
   *  last 30 days. Rates are stored as decimals (0.12 = 12%); amounts are
   *  stored as whole numbers. */
  baselineValue: number
  /** Minimum detectable effect — absolute pp (as decimal) for rates, or
   *  relative % (as decimal) for amount metrics. */
  minDetectableEffect: number
  /** Fixed at 0.95 / 0.80 for now. Stored so a future version can edit. */
  confidence: number
  power: number
}

export type WinnerMode = "manual" | "automatic"

export type NoWinnerPolicy = "keep_split" | "send_to_best"

export type ExperimentStatus =
  | "draft"
  | "running"
  | "paused"
  | "concluded_winner"
  | "concluded_no_winner"

export interface ExperimentConfigVersion {
  /** Monotonic version; bumped by `startNewVersion()`. */
  version: number
  /** Stable salt used by the bucketer; bumped on every new version. */
  experimentId: string
  name: string
  hypothesis: string
  arms: ExperimentArm[]
  /** Sticky assignment on re-entry. Default true. Off breaks the comparison. */
  sticky: boolean
  primaryMetric: PrimaryMetricId
  secondaryMetrics: SecondaryMetricId[]
  guardrails: Guardrail[]
  /** Overrides the journey-level `defaultAttributionDays` for this experiment. */
  attributionDays: number
  duration: ExperimentDuration
  sampleSize: SampleSizeInputs
  winnerMode: WinnerMode
  noWinnerPolicy: NoWinnerPolicy
  status: ExperimentStatus
  /** ISO date set when the journey is published with this experiment running. */
  startedAt?: string
  /** ISO date set when status becomes `concluded_*`. */
  endedAt?: string
  /** Set when a winner is rolled out. */
  rolledOutArmId?: string
}

export interface ExperimentConfig extends ExperimentConfigVersion {
  /** Earlier versions kept viewable from the version picker. Most recent
   *  first. The CURRENT version is NOT in this array. */
  previousVersions: ExperimentConfigVersion[]
}

/* ─────────── Defaults ─────────── */

export function defaultArms(): ExperimentArm[] {
  return [
    { id: "arm_a", handle: "a", name: "Variant A", description: "", share: 50, isControl: false },
    { id: "arm_b", handle: "b", name: "Variant B", description: "", share: 50, isControl: false },
  ]
}

export function defaultExperimentConfig(nodeId: string): ExperimentConfig {
  const base = defaultSuggestedName()
  return {
    version: 1,
    experimentId: generateExperimentId(base, 1),
    name: base,
    hypothesis: "",
    arms: defaultArms(),
    sticky: true,
    primaryMetric: "ptp_rate",
    secondaryMetrics: [],
    guardrails: [{ id: "opt_out_rate", threshold: 0.005 }],
    attributionDays: 7,
    duration: { mode: "fixed_end_date" },
    sampleSize: {
      baselineValue: 0.12,
      minDetectableEffect: 0.02,
      confidence: 0.95,
      power: 0.8,
    },
    winnerMode: "manual",
    noWinnerPolicy: "keep_split",
    status: "draft",
    previousVersions: [],
    // nodeId is kept outside the config so the type stays identity-free; the
    // node's own React Flow id ties config → node.
  }
  void nodeId
}

function defaultSuggestedName(): string {
  return "Untitled experiment"
}

/* ─────────── ID generation ─────────── */

/** Slugify a name and append a version suffix. Produces ids like
 *  `dpd31_60_no_calls_v1`. Safe for empty names. */
export function generateExperimentId(name: string, version: number): string {
  const slug = slugify(name)
  const base = slug.length > 0 ? slug : "experiment"
  return `${base}_v${Math.max(1, Math.floor(version))}`
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48)
}

/* ─────────── Arm utilities ─────────── */

/** Distribute 100% across arms evenly, rounding to integers and giving
 *  any remainder to the first arm so the total stays exactly 100. */
export function distributeEvenly(arms: ExperimentArm[]): ExperimentArm[] {
  const n = arms.length
  if (n === 0) return arms
  const even = Math.floor(100 / n)
  const remainder = 100 - even * n
  return arms.map((a, i) => ({ ...a, share: i === 0 ? even + remainder : even }))
}

export function totalShare(arms: ExperimentArm[]): number {
  return arms.reduce((s, a) => s + (a.share || 0), 0)
}

export function nextHandle(arms: ExperimentArm[]): ArmHandle | null {
  const used = new Set(arms.map((a) => a.handle))
  for (const h of ARM_HANDLES) {
    if (!used.has(h)) return h
  }
  return null
}

export function addArm(arms: ExperimentArm[], init?: Partial<ExperimentArm>): ExperimentArm[] {
  if (arms.length >= 5) return arms
  const handle = nextHandle(arms)
  if (!handle) return arms
  const index = arms.length
  const name = init?.name ?? `Variant ${String.fromCharCode(65 + index)}`
  const arm: ExperimentArm = {
    id: init?.id ?? `arm_${handle}`,
    handle,
    name,
    description: init?.description ?? "",
    share: init?.share ?? 0,
    isControl: init?.isControl ?? false,
  }
  return [...arms, arm]
}

export function removeArm(arms: ExperimentArm[], armId: string): ExperimentArm[] {
  // Preserve handle positions of remaining arms — downstream edges use handle ids,
  // so removing an arm must NOT reassign handles on others.
  return arms.filter((a) => a.id !== armId)
}

export function setControl(arms: ExperimentArm[], enabled: boolean, defaultShare = 10): ExperimentArm[] {
  const hasControl = arms.some((a) => a.isControl)
  if (enabled && !hasControl) {
    const withControl = addArm(arms, {
      id: "arm_control",
      name: "Control (holdout)",
      description: "Receives no messages or calls from this experiment; still tracked for outcomes.",
      share: defaultShare,
      isControl: true,
    })
    return withControl
  }
  if (!enabled && hasControl) {
    return arms.filter((a) => !a.isControl)
  }
  return arms
}

/* ─────────── Status helpers ─────────── */

export function isConcluded(status: ExperimentStatus): boolean {
  return status === "concluded_winner" || status === "concluded_no_winner"
}

export function statusLabel(status: ExperimentStatus): string {
  switch (status) {
    case "draft":
      return "Draft"
    case "running":
      return "Running"
    case "paused":
      return "Paused"
    case "concluded_winner":
      return "Concluded · Winner rolled out"
    case "concluded_no_winner":
      return "Concluded · Stopped without winner"
  }
}

/* ─────────── Versioning ─────────── */

/** Bump the version suffix, archive the current state, and reset `status`
 *  to `draft` so the next publish starts the clock fresh.
 *  Used when an edit requires a re-bucket (adding/removing arms, changing
 *  the primary metric, renaming the experiment id). */
export function startNewVersion(cfg: ExperimentConfig, applyEdits?: (c: ExperimentConfigVersion) => ExperimentConfigVersion): ExperimentConfig {
  const { previousVersions, ...currentVersion } = cfg
  const archived: ExperimentConfigVersion = { ...currentVersion }
  const nextVersion = cfg.version + 1
  const edited: ExperimentConfigVersion = {
    ...currentVersion,
    version: nextVersion,
    experimentId: generateExperimentId(cfg.name, nextVersion),
    status: "draft",
    startedAt: undefined,
    endedAt: undefined,
    rolledOutArmId: undefined,
  }
  const applied = applyEdits ? applyEdits(edited) : edited
  return {
    ...applied,
    previousVersions: [archived, ...previousVersions],
  }
}

/* ─────────── Migration ─────────── */

/** Read the experiment config off a React Flow node's `data`, upgrading
 *  legacy split fields on the fly. Idempotent — safe to call every read. */
export function readExperimentConfig(data: Record<string, unknown> | undefined): ExperimentConfig {
  const existing = data?.experiment as ExperimentConfig | undefined
  if (existing && Array.isArray(existing.arms)) {
    return existing
  }
  return migrateLegacyExperiment(data)
}

function migrateLegacyExperiment(data: Record<string, unknown> | undefined): ExperimentConfig {
  const d = data ?? {}
  const variantCount = Number(d.variantCount ?? 2)
  const shares = [
    Number(d.splitA ?? 50),
    Number(d.splitB ?? 50),
    Number(d.splitC ?? 0),
    Number(d.splitD ?? 0),
  ]
  const count = Math.max(2, Math.min(4, variantCount))
  const arms: ExperimentArm[] = []
  for (let i = 0; i < count; i++) {
    const handle = ARM_HANDLES[i]
    arms.push({
      id: `arm_${handle}`,
      handle,
      name: `Variant ${String.fromCharCode(65 + i)}`,
      description: "",
      share: shares[i] ?? 0,
      isControl: false,
    })
  }
  const label = (d.label as string) ?? "Experiment"
  const name = label === "Experiment" ? defaultSuggestedName() : label
  return {
    version: 1,
    experimentId: generateExperimentId(name, 1),
    name,
    hypothesis: "",
    arms,
    sticky: true,
    primaryMetric: "ptp_rate",
    secondaryMetrics: [],
    guardrails: [{ id: "opt_out_rate", threshold: 0.005 }],
    attributionDays: 7,
    duration: { mode: "fixed_end_date" },
    sampleSize: {
      baselineValue: 0.12,
      minDetectableEffect: 0.02,
      confidence: 0.95,
      power: 0.8,
    },
    winnerMode: "manual",
    noWinnerPolicy: "keep_split",
    status: "draft",
    previousVersions: [],
  }
}

/* ─────────── Metric catalogues ─────────── */

export const PRIMARY_METRIC_LABEL: Record<PrimaryMetricId, string> = {
  ptp_rate: "PTP rate",
  ptp_kept_rate: "PTP kept rate",
  payment_rate: "Payment rate",
  collection_pct: "Collection %",
  recovery_pct: "Recovery %",
  cost_per_recovery: "Cost per recovery",
  rpc_rate: "RPC rate",
}

export const SECONDARY_METRIC_LABEL: Record<SecondaryMetricId, string> = {
  ...PRIMARY_METRIC_LABEL,
  delivery_rate: "Delivery rate",
  ctr: "CTR",
  contacts_per_borrower: "Contacts per borrower",
}

export const GUARDRAIL_LABEL: Record<GuardrailId, string> = {
  opt_out_rate: "Opt-out rate",
  spam_rate: "Spam complaint rate",
  ptp_broken_rate: "PTP broken rate",
  cost_per_borrower: "Cost per borrower",
}

/** Whether a positive delta on this metric is good (`up`) or bad (`down`). */
export const PRIMARY_METRIC_DIRECTION: Record<PrimaryMetricId, "up" | "down"> = {
  ptp_rate: "up",
  ptp_kept_rate: "up",
  payment_rate: "up",
  collection_pct: "up",
  recovery_pct: "up",
  cost_per_recovery: "down",
  rpc_rate: "up",
}

export const GUARDRAIL_DIRECTION: Record<GuardrailId, "up" | "down"> = {
  // A guardrail is breached when an arm is WORSE than control by more than
  // its threshold, so "up" here means "worse when it goes up".
  opt_out_rate: "up",
  spam_rate: "up",
  ptp_broken_rate: "up",
  cost_per_borrower: "up",
}

/** Rates are stored and compared as decimals; amount-style metrics are
 *  compared in % change. */
export const PRIMARY_METRIC_KIND: Record<PrimaryMetricId, "rate" | "amount"> = {
  ptp_rate: "rate",
  ptp_kept_rate: "rate",
  payment_rate: "rate",
  collection_pct: "rate",
  recovery_pct: "rate",
  cost_per_recovery: "amount",
  rpc_rate: "rate",
}

/* ─────────── Sample size calculator ─────────── */

/** Required borrowers per arm to detect `mde` at 95% / 80% for a
 *  two-proportion rate metric. Uses the standard pooled formula.
 *  For amount metrics a different formula applies — we return a
 *  conservative approximation and leave a TODO. */
export function requiredSampleSizePerArm(
  kind: "rate" | "amount",
  baseline: number,
  mde: number,
  confidence = 0.95,
  power = 0.8,
): number {
  const zAlpha = normalQuantile(1 - (1 - confidence) / 2)
  const zBeta = normalQuantile(power)
  if (kind === "rate") {
    const p1 = clamp(baseline, 0.0001, 0.9999)
    const p2 = clamp(baseline + mde, 0.0001, 0.9999)
    const pbar = (p1 + p2) / 2
    const numerator = Math.pow(zAlpha * Math.sqrt(2 * pbar * (1 - pbar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2)
    const denominator = Math.pow(p2 - p1, 2)
    if (denominator <= 0) return Infinity
    return Math.ceil(numerator / denominator)
  }
  // TODO (backend contract): amount-metric sample size needs a real
  // variance input; here we assume a coefficient of variation of ~1 and
  // use σ = baseline. Replace with the real historical variance when the
  // analytics API lands.
  const sigma = Math.max(1, baseline)
  const delta = Math.max(1, Math.abs(baseline * mde))
  const n = 2 * Math.pow((zAlpha + zBeta) * sigma / delta, 2)
  return Math.ceil(n)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** Inverse standard normal CDF — Beasley-Springer-Moro approximation. */
function normalQuantile(p: number): number {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924]
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857]
  const c = [-7.78489400243029e-3, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878]
  const d = [7.78469570904146e-3, 0.32246712907004, 2.445134137143, 3.75440866190742]
  const plow = 0.02425
  const phigh = 1 - plow
  let q, r
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p <= phigh) {
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  }
  q = Math.sqrt(-2 * Math.log(1 - p))
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
}

/** Given a per-arm target and the journey's daily enrolment rate,
 *  estimate days to hit the target across every arm. */
export function estimateDaysToSampleSize(perArmTarget: number, dailyEnrolment: number, arms: ExperimentArm[]): number {
  if (dailyEnrolment <= 0 || arms.length === 0) return Infinity
  const slowestArm = arms.reduce((min, a) => (a.share < min ? a.share : min), 100)
  if (slowestArm <= 0) return Infinity
  const dailyToSlowest = dailyEnrolment * (slowestArm / 100)
  return Math.ceil(perArmTarget / dailyToSlowest)
}

/* ─────────── Validation ─────────── */

export interface ExperimentValidation {
  errors: string[]
  warnings: string[]
}

export function validateExperiment(cfg: ExperimentConfig, armHasDownstream: (handle: ArmHandle) => boolean): ExperimentValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (!cfg.name.trim()) errors.push("Experiment needs a name")
  if (!cfg.primaryMetric) errors.push("Experiment needs a primary metric")

  const share = totalShare(cfg.arms)
  if (share !== 100) errors.push(`Arm shares total ${share}% — must be 100%`)

  cfg.arms.forEach((a) => {
    if (!a.isControl && !armHasDownstream(a.handle)) {
      errors.push(`Arm "${a.name}" has no nodes attached`)
    }
  })

  const duration = cfg.duration
  if (duration.mode === "fixed_end_date" && duration.endDate && cfg.startedAt) {
    const days = daysBetween(cfg.startedAt, duration.endDate)
    if (days < cfg.attributionDays) {
      errors.push(`Duration (${days}d) shorter than attribution window (${cfg.attributionDays}d)`)
    }
  }

  // Sample-size warning
  const kind = PRIMARY_METRIC_KIND[cfg.primaryMetric]
  const n = requiredSampleSizePerArm(kind, cfg.sampleSize.baselineValue, cfg.sampleSize.minDetectableEffect)
  if (Number.isFinite(n) && duration.mode === "fixed_end_date" && duration.endDate && cfg.startedAt) {
    // We cannot know daily enrolment from here — the validator caller wires it in.
    // Warn only if the target is obviously huge for the fixed window. Left as a
    // note; the richer check is done by the config form with live inputs.
    void n
  }

  if (!cfg.sticky) warnings.push("Sticky assignment is off — comparison may be unreliable")

  return { errors, warnings }
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime()
  const b = new Date(bIso).getTime()
  if (isNaN(a) || isNaN(b)) return 0
  return Math.max(0, Math.round((b - a) / (24 * 3600 * 1000)))
}

/* ─────────── Bucketing (for synthesizer and runtime) ─────────── */

/** FNV-1a 32-bit on a UTF-16 string. Shared with `message-analytics.ts`. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Deterministic arm assignment for a borrower, given the experiment id
 *  (which encodes the version) and the configured shares.
 *
 *  TODO (backend contract): mirror this in the runtime router so the UI,
 *  the mock data and the real bucketer all agree. The salt is the
 *  `experimentId` string, and the borrower id is the borrower's canonical
 *  id; no other inputs. */
export function assignArm(experimentId: string, borrowerId: string, arms: ExperimentArm[]): ExperimentArm {
  if (arms.length === 0) throw new Error("assignArm: no arms")
  const u = (fnv1a(`arm|${experimentId}|${borrowerId}`) % 10_000) / 10_000
  let cumulative = 0
  const total = totalShare(arms) || 100
  for (const arm of arms) {
    cumulative += arm.share / total
    if (u < cumulative) return arm
  }
  return arms[arms.length - 1]
}
