/**
 * Prompt-attribute lint — Part 1.4.
 *
 * Walks every merge tag in a Send Email / Send SMS / Trigger AI Call prompt,
 * cross-checks each tag against a sample borrower payload, and returns the
 * ones that resolve to empty / null / undefined so the Validate pass can
 * highlight them.
 *
 * Runs automatically on Validate — not behind a separate button.
 */

import { extractMergeTags } from "@/data/composer-registry-adapter"

export interface AttributeCoverageInput {
  /** The full prompt / subject / body string to lint. */
  text: string
  /** The resolved sample borrowers to check the tags against. In production
   *  this comes from the audience filter; the prototype passes a sampled set
   *  from `borrowers.ts`. */
  sample: Array<Record<string, unknown>>
}

export interface EmptyAttributeFinding {
  /** Merge tag as it appears in the prompt, e.g. "deal.ptp_date". */
  tag: string
  /** How many sample borrowers had an empty value for this tag. */
  emptyCount: number
  /** Total sample size. */
  sampleSize: number
  /** Percentage rounded to whole numbers. */
  emptyPct: number
  /** The prompt text with this tag stripped, for the "will render as" preview. */
  strippedPreview: string
}

/**
 * Resolve a dotted-path merge tag against a payload. Returns undefined if any
 * segment is missing; returns the value otherwise.
 */
export function resolveMergeTag(
  tag: string,
  payload: Record<string, unknown>,
): unknown {
  const parts = tag.split(".").map((p) => p.trim())
  let cur: unknown = payload
  for (const p of parts) {
    if (cur == null) return undefined
    if (typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === "string") return v.trim().length === 0
  if (Array.isArray(v)) return v.length === 0
  return false
}

/**
 * Compute the coverage stats + empty findings for the given prompt against
 * the sample. If sample is empty, returns an empty findings list — the caller
 * should surface that as a separate audience-empty warning.
 */
export function lintPromptAttributes({
  text,
  sample,
}: AttributeCoverageInput): {
  tags: string[]
  findings: EmptyAttributeFinding[]
} {
  const tags = extractMergeTags(text)
  const findings: EmptyAttributeFinding[] = []

  if (sample.length === 0) return { tags, findings }

  for (const tag of tags) {
    let emptyCount = 0
    for (const b of sample) {
      const v = resolveMergeTag(tag, b)
      if (isEmpty(v)) emptyCount++
    }
    if (emptyCount === 0) continue

    // Show the raw prompt with just THIS tag stripped, so the operator can
    // see how the message would render for the empty-attribute cohort.
    const strippedPreview = text.replace(
      new RegExp(`\\{\\{\\s*${escapeRe(tag)}\\s*\\}\\}`, "g"),
      "",
    )

    findings.push({
      tag,
      emptyCount,
      sampleSize: sample.length,
      emptyPct: Math.round((emptyCount / sample.length) * 100),
      strippedPreview,
    })
  }

  return { tags, findings }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Convert the raw prompt string into a set of segments so the Validate UI can
 * render the merge tags with red highlights inline.
 */
export interface PromptSegment {
  kind: "text" | "tag"
  value: string
  /** Only set on tag segments. */
  isEmpty?: boolean
}

export function segmentPromptForDisplay(
  text: string,
  emptyTags: Set<string>,
): PromptSegment[] {
  const out: PromptSegment[] = []
  const re = /\{\{\s*([^}]+?)\s*\}\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ kind: "text", value: text.slice(last, m.index) })
    const tag = m[1].trim()
    out.push({
      kind: "tag",
      value: tag,
      isEmpty: emptyTags.has(tag),
    })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) })
  return out
}
