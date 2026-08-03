/**
 * Estimate the resolved recipient count for a multi-segment audience.
 *
 * The prototype segments don't carry concrete borrowerIds — they only have
 * a `borrowers` count — so this helper produces a *deterministic estimate*
 * based on segment sizes + combiner + dedupe + exclude rules. The formula
 * intentionally reads like real math (union / intersection / dedupe factor)
 * so the number moves in the right direction as the operator tweaks segments.
 */

import type { Segment } from "@/data/segments"
import type { AudienceRule } from "@/components/composer/composer-view"

/** Fraction of members we assume are shared between any two included segments
 *  when combining with OR. Higher = more overlap = smaller union. */
const UNION_OVERLAP = 0.12

/** Fraction of the smallest segment we assume overlaps with the intersection
 *  when combining with AND. */
const AND_INTERSECTION = 0.3

/** Fraction of the included pool that we assume is in a given excluded segment
 *  of the same size. Scaled down for large excludes so exclude doesn't
 *  over-subtract. */
const EXCLUDE_REACH = 0.35

export interface ResolvedAudience {
  /** Segments actually resolved (invalid ids dropped). */
  includedSegments: Segment[]
  excludedSegments: Segment[]
  /** Estimated recipients after include, before exclude/dedupe. */
  raw: number
  /** After dedupe (if enabled). */
  afterDedupe: number
  /** After exclude. Final number that would be sent. */
  final: number
  /** How many the include rule matched, but exclude then removed. */
  removedByExclude: number
  /** How many were deduped (raw − afterDedupe). Zero if dedupe off or single segment. */
  removedByDedupe: number
}

export function resolveAudience(
  rule: AudienceRule,
  segments: Segment[],
): ResolvedAudience {
  const includedSegments = rule.includeSegmentIds
    .map((id) => segments.find((s) => s.id === id))
    .filter(Boolean) as Segment[]
  const excludedSegments = rule.excludeSegmentIds
    .map((id) => segments.find((s) => s.id === id))
    .filter(Boolean) as Segment[]

  if (includedSegments.length === 0) {
    return {
      includedSegments,
      excludedSegments,
      raw: 0,
      afterDedupe: 0,
      final: 0,
      removedByExclude: 0,
      removedByDedupe: 0,
    }
  }

  const sizes = includedSegments.map((s) => s.borrowers)

  let raw: number
  if (rule.includeCombiner === "all") {
    // Intersection — approximate as min(size) × intersection factor.
    // Grows harder as more segments intersect.
    const n = sizes.length
    const factor = Math.pow(AND_INTERSECTION, Math.max(0, n - 1))
    raw = Math.round(Math.min(...sizes) * factor)
  } else {
    // Union — sum minus assumed overlap between each pair.
    const sum = sizes.reduce((a, b) => a + b, 0)
    // Approximate pairwise overlap total.
    const overlap = sum * UNION_OVERLAP * (sizes.length - 1) * 0.5
    raw = Math.max(...sizes, Math.round(sum - overlap))
  }

  // Dedupe. When combining ANY of ≥2 segments, roughly 8% of the raw pool
  // are duplicates in the prototype's model. AND already has no duplicates.
  let afterDedupe = raw
  let removedByDedupe = 0
  if (rule.removeDuplicates && rule.includeCombiner === "any" && sizes.length > 1) {
    removedByDedupe = Math.round(raw * 0.08)
    afterDedupe = raw - removedByDedupe
  }

  // Exclude. Each exclude segment removes a portion of the included pool
  // proportional to its own size vs the largest included segment.
  let removedByExclude = 0
  if (excludedSegments.length > 0) {
    const anchor = Math.max(...sizes)
    for (const ex of excludedSegments) {
      const share = Math.min(1, ex.borrowers / Math.max(anchor, 1))
      removedByExclude += Math.round(afterDedupe * EXCLUDE_REACH * share)
    }
    // Cap at the current pool.
    removedByExclude = Math.min(removedByExclude, afterDedupe)
  }

  const final = Math.max(0, afterDedupe - removedByExclude)

  return {
    includedSegments,
    excludedSegments,
    raw,
    afterDedupe,
    final,
    removedByExclude,
    removedByDedupe,
  }
}
