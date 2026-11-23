/**
 * Statistics helpers for experiment analytics.
 *
 * Covers only what the experiment Analytics tab needs:
 *  - Two-proportion z-test (rate metric uplift vs control)
 *  - Welch's t-test (per-borrower amount uplift vs control)
 *  - Holm-Bonferroni multiple-comparison correction (when > 2 arms vs control)
 *  - Chi-square goodness-of-fit (sample ratio check)
 *  - Normal CDF + inverse (for z-based CIs)
 *
 * Intentionally pure functions, no dependencies.
 */

export interface RateCell {
  successes: number
  trials: number
}

export interface AmountCell {
  sum: number
  sumSquares: number
  n: number
}

export interface UpliftResult {
  /** Absolute delta (arm − control) for rates; relative delta (percent) for amounts. */
  delta: number
  /** 95% confidence interval on `delta`. */
  ci95: [number, number]
  /** Two-sided p-value. */
  pValue: number
  /** 1 − p, bounded to [0, 1]. UI shows this as "confident". */
  confidence: number
  /** z or t statistic. */
  statistic: number
  /** The direction of the observed delta — up means arm > control. */
  direction: "up" | "down" | "flat"
}

/* ─────────── Normal distribution ─────────── */

/** Standard normal CDF via Abramowitz & Stegun 7.1.26. */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x)
  return 0.5 * (1 + sign * y)
}

/** Standard normal quantile, Beasley-Springer-Moro approximation. */
export function normalQuantile(p: number): number {
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

/* ─────────── Two-proportion z-test ─────────── */

/** Uplift for a rate metric: arm vs control, two-sided z-test on pooled SE.
 *  CI uses the UNPOOLED SE (standard for display). */
export function twoProportionZ(arm: RateCell, control: RateCell, confidence = 0.95): UpliftResult {
  const p1 = safeRate(arm)
  const p2 = safeRate(control)
  const n1 = arm.trials
  const n2 = control.trials
  if (n1 === 0 || n2 === 0) return emptyResult(p1 - p2)
  const pooled = (arm.successes + control.successes) / (n1 + n2)
  const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
  const seUnpooled = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2)
  const delta = p1 - p2
  const z = sePooled === 0 ? 0 : delta / sePooled
  const pValue = 2 * (1 - normalCdf(Math.abs(z)))
  const zAlpha = normalQuantile(1 - (1 - confidence) / 2)
  return {
    delta,
    ci95: [delta - zAlpha * seUnpooled, delta + zAlpha * seUnpooled],
    pValue,
    confidence: 1 - pValue,
    statistic: z,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  }
}

function safeRate(c: RateCell): number {
  if (c.trials === 0) return 0
  return c.successes / c.trials
}

function emptyResult(delta: number): UpliftResult {
  return { delta, ci95: [delta, delta], pValue: 1, confidence: 0, statistic: 0, direction: "flat" }
}

/* ─────────── Welch's t-test ─────────── */

/** Uplift for a per-borrower amount metric: arm vs control, two-sided Welch's
 *  t-test. We don't carry a t-distribution here — with the degrees of freedom
 *  typical in these experiments (hundreds of borrowers) the t distribution is
 *  effectively normal, so we use the z approximation. */
export function welchT(arm: AmountCell, control: AmountCell, confidence = 0.95): UpliftResult {
  const m1 = safeMean(arm)
  const m2 = safeMean(control)
  const v1 = sampleVariance(arm)
  const v2 = sampleVariance(control)
  const n1 = arm.n
  const n2 = control.n
  if (n1 < 2 || n2 < 2) return emptyResult(m1 - m2)
  const se = Math.sqrt(v1 / n1 + v2 / n2)
  const delta = m1 - m2
  const t = se === 0 ? 0 : delta / se
  const pValue = 2 * (1 - normalCdf(Math.abs(t)))
  const zAlpha = normalQuantile(1 - (1 - confidence) / 2)
  // Report relative delta (percent) so the Analytics tab can show "+12%".
  const relative = m2 === 0 ? delta : delta / m2
  const relativeHalf = m2 === 0 ? zAlpha * se : (zAlpha * se) / Math.abs(m2)
  return {
    delta: relative,
    ci95: [relative - relativeHalf, relative + relativeHalf],
    pValue,
    confidence: 1 - pValue,
    statistic: t,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  }
}

function safeMean(c: AmountCell): number {
  return c.n === 0 ? 0 : c.sum / c.n
}

function sampleVariance(c: AmountCell): number {
  if (c.n < 2) return 0
  const mean = c.sum / c.n
  return (c.sumSquares - c.n * mean * mean) / (c.n - 1)
}

/* ─────────── Holm correction ─────────── */

/** Given raw p-values keyed by arm id, return the Holm-adjusted p-values
 *  (same keys). Lower adjusted p = still significant after correction. */
export function holmAdjust(raw: Record<string, number>): Record<string, number> {
  const keys = Object.keys(raw)
  if (keys.length === 0) return {}
  const sorted = keys.map((k) => ({ k, p: raw[k] })).sort((a, b) => a.p - b.p)
  const n = sorted.length
  const adjusted: Record<string, number> = {}
  let runningMax = 0
  sorted.forEach((item, i) => {
    const factor = n - i
    const p = Math.min(1, item.p * factor)
    runningMax = Math.max(runningMax, p)
    adjusted[item.k] = runningMax
  })
  return adjusted
}

/* ─────────── Chi-square goodness-of-fit (sample ratio check) ─────────── */

/** Compare actual assignment counts against the configured split.
 *  `expected` is given as shares in [0, 1] summing to ~1. Returns p-value. */
export function sampleRatioP(actual: number[], expected: number[]): number {
  if (actual.length !== expected.length) return 1
  const total = actual.reduce((s, x) => s + x, 0)
  if (total === 0) return 1
  let chi = 0
  for (let i = 0; i < actual.length; i++) {
    const exp = total * expected[i]
    if (exp === 0) continue
    chi += (actual[i] - exp) ** 2 / exp
  }
  const dof = Math.max(1, actual.length - 1)
  return chiSquareSurvival(chi, dof)
}

/** Survival (1 − CDF) of chi-square with k degrees of freedom.
 *  Uses a regularized upper-incomplete gamma via series/continued-fraction. */
export function chiSquareSurvival(x: number, k: number): number {
  if (x <= 0) return 1
  const a = k / 2
  const z = x / 2
  return 1 - lowerIncompleteGammaRegularized(a, z)
}

function lowerIncompleteGammaRegularized(a: number, x: number): number {
  if (x < 0 || a <= 0) return 0
  if (x < a + 1) {
    // Series expansion
    let term = 1 / a
    let sum = term
    for (let n = 1; n < 200; n++) {
      term *= x / (a + n)
      sum += term
      if (term < 1e-12 * Math.abs(sum)) break
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a))
  }
  // Continued fraction
  const EPS = 1e-12
  let b = x + 1 - a
  let c = 1 / 1e-30
  let d = 1 / b
  let h = d
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = b + an / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h
}

function logGamma(x: number): number {
  // Lanczos approximation.
  const g = 7
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ]
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  }
  x -= 1
  let a = c[0]
  const t = x + g + 0.5
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}
