/**
 * Audience sample data layer for the Send Email / Send SMS node preview.
 *
 * Ops open a Send node and need to see the message filled in for real
 * borrowers BEFORE the first run, so missing names, bad amounts, or an
 * Arabic value forcing a second SMS segment show up at author time rather
 * than after borrowers receive the message.
 *
 * This module is the ONE data layer the preview reads from. Everything is
 * deterministic + seeded off (journeyId, nodeId) so the same author sees
 * the same rows across reloads, and so other previews over the same node
 * line up with each other.
 *
 * ──────────────────────────────────────────────────────────────────────
 * Data contracts assumed (every one a TODO for the backend)
 * ──────────────────────────────────────────────────────────────────────
 *
 *   TODO (backend contract #1 — audience sampler): given a journey id,
 *   the API returns up to 20 borrower records drawn from the journey's
 *   entry audience. For Segment Membership this is a reservoir sample of
 *   current members; for Specific Users it's the first N of the enrolled
 *   list; for Excel Upload it's the first N parsed rows (see #3). The
 *   sample MUST be stable across calls for a given (journeyId, seed) so
 *   paging and navigation feel deterministic.
 *
 *   TODO (backend contract #2 — variable resolver): given a borrower
 *   record and a message body, return {resolved, missing} where `missing`
 *   lists every mustache variable that could not be filled (undefined,
 *   empty string, or no value under the fallback key). Resolution MUST
 *   use the same filling pipeline the sender uses at send time — the
 *   preview is only useful if what the author sees matches what the
 *   borrower receives.
 *
 *   TODO (backend contract #3 — Excel upload sample): given an upstream
 *   Excel Upload trigger id, the API returns up to 20 parsed rows (the
 *   `uploadRows` column values keyed by column id) plus a `nameColumn`
 *   hint so the picker can label each row. Prototype seeds plausible
 *   rows off the file name + column kinds.
 *
 *   TODO (backend contract #4 — contactability): per borrower, the
 *   following flags come from the borrower/deal record and drive the
 *   won't-send tag: `{has_address, has_number, address_valid,
 *   number_valid, email_dnc, sms_opted_out, frequency_cap_hit}`. These
 *   mirror the Not-sent reasons the analytics API emits (see
 *   `NotSentReason`), so author-time preview labels match the post-run
 *   analytics bars.
 *
 *   TODO (backend contract #5 — journey entry resolver): walk the
 *   journey graph from the Send node back to the entry trigger. For
 *   Segment Membership, resolve the segment id against the segment
 *   service to pick a reservoir sample; for Journey Handoff Entry,
 *   sample from the handing-off journey; for Event / Webhook /
 *   Inbound Message triggers, sample from the last 7 days of records
 *   that fired the event. The prototype just checks `triggerType` and
 *   falls through to a generic deterministic sample.
 */

import type { Borrower } from "./borrowers"
import { borrowers, getBorrowerEmails, getBorrowerPhones } from "./borrowers"
import type { NotSentReason } from "./journey-metrics"
import type { UploadColumn } from "./journeys"
import type { PhoneSelection, EmailSelection } from "./borrower-channels"

/* ─────────── Seeded PRNG ─────────── */

function hash(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

function seeded(seed: number): () => number {
  let s = seed || 1
  return () => {
    s = Math.imul(1664525, s) + 1013904223
    s = (s + 0x9e3779b9) >>> 0
    return ((s >>> 8) & 0xffffff) / 0xffffff
  }
}

/* ─────────── Types ─────────── */

export type SampleSource = "audience" | "reached_node"

export type SampleChannel = "email" | "sms" | "whatsapp"

/**
 * One row in the sample picker. For a borrower-record audience (segment,
 * specific users, generic) this wraps the `Borrower` plus derived
 * contact + contactability. For an Excel-upload audience the borrower
 * is null and the row is keyed by upload column values.
 */
export interface AudienceSampleRow {
  /** Stable id — borrower id OR `upload-row-<n>`. */
  id: string
  /** Display name — borrower name OR the upload "name" column. */
  name: string
  /** Secondary label — DPD bucket + product for borrowers, file name for uploads. */
  subtitle: string
  /** Full borrower record when audience is record-based; null for upload rows. */
  borrower: Borrower | null
  /** Upload-row mapping (column id → cell value) when the audience is Excel. */
  uploadRow: Record<string, string> | null
  /** Variable map used to resolve `{{token}}` placeholders in subject/body. */
  variables: Record<string, string>
  /** Phones this node would try (after `PhoneSelection`). First is the send address. */
  phonesToUse: string[]
  /** Emails this node would try (after `EmailSelection`). First is the To address. */
  emailsToUse: string[]
  /** Addresses beyond the first used as CC when email send mode is one_with_cc. */
  ccEmails: string[]
  /** `null` when the node WOULD send; a reason when it wouldn't. */
  wontSend: NotSentReason | null
}

export interface AudienceSampleInput {
  journeyId: string
  nodeId: string
  /** Entry trigger type (`segment_entry` / `excel_upload` / `specific_users` / …). */
  entryTriggerType: string | null
  /** Upload columns when the audience is Excel; null otherwise. */
  uploadColumns: UploadColumn[] | null
  /** Upload file name, labelled on upload rows so authors see the source. */
  uploadFileName?: string
  channel: SampleChannel
  /** Resolved phone-selection strategy from the node config. */
  phoneSelection: PhoneSelection
  /** Resolved email-selection strategy from the node config. */
  emailSelection: EmailSelection
  /**
   * Reshuffle salt — a number the UI's "shuffle" button increments to
   * draw a new sample. Preserved across picks in the same editor session.
   */
  shuffleSalt?: number
  /** How many rows to return. Default 20. */
  limit?: number
}

/* ─────────── Mustache-style variable resolver ─────────── */

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g

/**
 * Fill every `{{token}}` in `text` from `variables`. Returns the resolved
 * string and the set of tokens that were missing or empty — used by the
 * preview to highlight blanks in amber.
 *
 * Fallback: when a token is missing but one was provided under the
 * `fallbacks` map (e.g. `{{deal.User_firstName}}` → "Customer"), the
 * fallback value is substituted AND the token is still reported in the
 * missing set so the author sees it was empty.
 */
export interface ResolvedText {
  text: string
  missing: string[]
}

export function resolveText(
  text: string,
  variables: Record<string, string>,
  fallbacks: Record<string, string> = {},
): ResolvedText {
  if (!text) return { text: "", missing: [] }
  const missing = new Set<string>()
  const resolved = text.replace(TOKEN_RE, (_match, token: string) => {
    const value = variables[token] ?? variables[aliasKey(token)]
    if (value && value.trim().length > 0) return value
    missing.add(token)
    const fb = fallbacks[token]
    return fb && fb.length > 0 ? fb : ""
  })
  return { text: resolved, missing: Array.from(missing) }
}

/**
 * Minimal alias layer so authors can write `{{first_name}}` and
 * `{{borrower.first_name}}` interchangeably — the resolver falls back to
 * the alternate form if the first lookup misses.
 */
function aliasKey(token: string): string {
  if (token.startsWith("borrower.")) return token.slice("borrower.".length)
  return `borrower.${token}`
}

/* ─────────── Borrower variable map ─────────── */

/**
 * Build the variable map a borrower record contributes. Mirrors the
 * tokens the Add-variable popover offers in `message-node-full-editor`.
 *
 * TODO (backend contract #2): replace with the real resolver that walks
 * `borrower.*`, `deal.*`, `lender.*` namespaces and honours each lender's
 * token overrides.
 */
export function variablesForBorrower(b: Borrower): Record<string, string> {
  const first = b.name.split(" ")[0] ?? b.name
  const emails = getBorrowerEmails(b)
  const phones = getBorrowerPhones(b)
  const outstanding = `AED ${b.outstanding.toLocaleString()}`
  return {
    "borrower.first_name": first,
    "borrower.name": b.name,
    "borrower.phone": phones[0] ?? b.phone,
    "borrower.email": emails[0] ?? "",
    "borrower.product": b.product,
    "borrower.dpd": b.dpdBucket,
    "borrower.outstanding": outstanding,
    "borrower.id": b.id,
    "borrower.emirates_id": b.emiratesId,
    // Fillable from borrower attributes — kept as empty strings when
    // the record doesn't carry them, so the preview highlights them
    // in amber. Mirrors the TODO in the spec about `deal.User_firstName`
    // and other deal-scoped tokens.
    "deal.User_firstName": first,
    "deal.outstanding": outstanding,
    amount: outstanding,
    cut_off_balance: outstanding,
    first_name: first,
    "lender.name": "ClearGrid",
    payment_link: "cg.co/p/" + b.id.slice(-4),
    ptp_date: "",
    last_agent: "",
    days: computeDpdDays(b.dpdBucket),
  }
}

function computeDpdDays(bucket: string): string {
  const m = /^(\d+)\s*-\s*(\d+)$/.exec(bucket)
  if (m) return m[1]
  if (/^180\+$/.test(bucket)) return "180"
  return ""
}

/* ─────────── Contactability (won't-send reasons) ─────────── */

/**
 * Determine why the node WOULDN'T send to this borrower, if anything.
 * Returns `null` when the send would go through.
 *
 * Reasons mirror the `NotSentReason` enum so the preview labels match
 * the post-run Analytics "Not sent" breakdown. Seeding is deterministic
 * so the same borrower on the same node always carries the same tag.
 *
 * TODO (backend contract #4): replace with the real contactability
 * check that reads `has_address`, `address_valid`, `email_dnc`,
 * `sms_opted_out`, `frequency_cap_hit` off the borrower/deal record.
 */
function wontSendReasonFor(
  borrower: Borrower,
  channel: SampleChannel,
  nodeId: string,
): NotSentReason | null {
  const seed = hash(`${channel}:${nodeId}:${borrower.id}`)
  const r = seeded(seed)
  // Roughly 20% of rows carry a won't-send tag so authors see a mix of
  // deliverable and skipped rows. The buckets below match the share each
  // reason has in message-analytics Not-sent breakdown.
  const roll = r()
  if (roll < 0.06) return "no_address"
  if (roll < 0.09) return "invalid_address"
  if (roll < 0.13) return "dnc_or_opted_out"
  if (roll < 0.15) return "blocked_prior_bounce"
  if (roll < 0.19) return "frequency_cap"
  // Legal / Closed borrowers are commonly DNC'd by policy on live journeys.
  if (borrower.status === "Legal" && r() < 0.4) return "dnc_or_opted_out"
  return null
}

/* ─────────── Sample building ─────────── */

/**
 * Entry point — returns up to `limit` rows for the Send-node preview.
 *
 * Record-based audiences (segment / specific users / generic) produce
 * borrower-backed rows. Excel-upload audiences produce upload-row-backed
 * rows that only know what the file columns provided.
 */
export function buildAudienceSample(
  input: AudienceSampleInput,
): AudienceSampleRow[] {
  const {
    journeyId,
    nodeId,
    entryTriggerType,
    uploadColumns,
    uploadFileName,
    channel,
    phoneSelection,
    emailSelection,
    shuffleSalt = 0,
    limit = 20,
  } = input

  if (entryTriggerType === "excel_upload" && uploadColumns) {
    return buildUploadSample({
      journeyId,
      nodeId,
      uploadColumns,
      uploadFileName: uploadFileName ?? "uploaded.xlsx",
      channel,
      shuffleSalt,
      limit,
    })
  }

  // Borrower-record audience (segment / specific users / event / webhook / …).
  // Reservoir-style pick seeded off the journey + shuffle salt so Shuffle
  // gives a new set of faces without destabilising the order inside one draw.
  const sampleSeed = hash(`audience:${journeyId}:${entryTriggerType ?? ""}:${shuffleSalt}`)
  const r = seeded(sampleSeed)
  const pool = borrowers.slice()
  const picks: Borrower[] = []
  const used = new Set<string>()
  while (picks.length < Math.min(limit, pool.length)) {
    const idx = Math.floor(r() * pool.length)
    const b = pool[idx]
    if (used.has(b.id)) continue
    used.add(b.id)
    picks.push(b)
  }

  return picks.map((b) => rowForBorrower(b, nodeId, channel, phoneSelection, emailSelection))
}

/**
 * Look up a borrower by id in the full audience pool and return a sample
 * row for them. Used by the search box ("add any borrower to the picker").
 */
export function rowForBorrowerId(
  borrowerId: string,
  input: Omit<AudienceSampleInput, "shuffleSalt" | "limit">,
): AudienceSampleRow | null {
  const b = borrowers.find((x) => x.id === borrowerId)
  if (!b) return null
  return rowForBorrower(b, input.nodeId, input.channel, input.phoneSelection, input.emailSelection)
}

/** Full audience (for the search popover). TODO (contract #1): paginated endpoint. */
export function fullAudience(): Borrower[] {
  return borrowers
}

function rowForBorrower(
  b: Borrower,
  nodeId: string,
  channel: SampleChannel,
  phoneSelection: PhoneSelection,
  emailSelection: EmailSelection,
): AudienceSampleRow {
  const variables = variablesForBorrower(b)
  const phones = applyPhoneSelection(getBorrowerPhones(b), phoneSelection)
  const emails = applyEmailSelection(getBorrowerEmails(b), emailSelection)
  const ccEmails = emailSelection.mode === "one_message_cc_rest" ? emails.slice(1) : []

  // Apply channel-specific no-address detection — a borrower with no
  // phones effectively has `no_address` for SMS, same for emails on
  // Email. This overrides the probabilistic reason.
  let wontSend: NotSentReason | null = null
  if (channel === "email" && emails.length === 0) wontSend = "no_address"
  else if (channel !== "email" && phones.length === 0) wontSend = "no_address"
  else wontSend = wontSendReasonFor(b, channel, nodeId)

  return {
    id: b.id,
    name: b.name,
    subtitle: `${b.dpdBucket} DPD · ${b.product}`,
    borrower: b,
    uploadRow: null,
    variables,
    phonesToUse: phones,
    emailsToUse: emails,
    ccEmails,
    wontSend,
  }
}

function applyPhoneSelection(all: string[], sel: PhoneSelection): string[] {
  if (sel.useAll) return all
  return all.slice(0, Math.max(1, sel.limit ?? 1))
}

function applyEmailSelection(all: string[], sel: EmailSelection): string[] {
  if (sel.useAll) return all
  return all.slice(0, Math.max(1, sel.limit ?? 1))
}

/* ─────────── Upload-row sampling ─────────── */

/**
 * Build a synthetic set of parsed rows for an upstream Excel Upload
 * trigger. Each row covers every `uploadColumns` entry with a plausible
 * value seeded off (journey, column id, row index). Two or three rows
 * per draw carry gaps so the preview's missing-variable highlight has
 * something to point at.
 *
 * TODO (backend contract #3): swap for the real `uploadRows` endpoint
 * that returns parsed cells for the first N rows of the upstream file.
 */
function buildUploadSample(args: {
  journeyId: string
  nodeId: string
  uploadColumns: UploadColumn[]
  uploadFileName: string
  channel: SampleChannel
  shuffleSalt: number
  limit: number
}): AudienceSampleRow[] {
  const {
    journeyId,
    nodeId,
    uploadColumns,
    uploadFileName,
    channel,
    shuffleSalt,
    limit,
  } = args

  const sampleSeed = hash(`upload:${journeyId}:${shuffleSalt}`)
  const r = seeded(sampleSeed)
  const rows: AudienceSampleRow[] = []
  // Draw fake person names from the borrower pool so the picker still
  // reads as real humans.
  for (let i = 0; i < Math.min(limit, 20); i++) {
    const nameSource = borrowers[Math.floor(r() * borrowers.length)]
    const uploadRow: Record<string, string> = {}
    const variables: Record<string, string> = {}
    for (const col of uploadColumns) {
      const value = synthesizeCell(col, nameSource, i, r)
      uploadRow[col.id] = value
      // Upload-column variables are exposed as `{{upload.<name>}}` and
      // also under the bare column name so authors can use either form.
      variables[`upload.${col.name}`] = value
      variables[col.name] = value
    }
    // Build the won't-send tag from the row's channel address.
    let wontSend: NotSentReason | null = null
    const addressCol = uploadColumns.find(
      (c) => c.kind === (channel === "email" ? "email" : "phone"),
    )
    const addressValue = addressCol ? uploadRow[addressCol.id] : ""
    if (!addressValue) wontSend = "no_address"
    else if (addressValue === "__invalid__") wontSend = "invalid_address"

    const nameCol =
      uploadColumns.find((c) => c.name.toLowerCase() === "name") ??
      uploadColumns.find((c) => c.kind === "text")
    const displayName = (nameCol && uploadRow[nameCol.id]) || `Row ${i + 1}`

    rows.push({
      id: `upload-row-${nodeId}-${journeyId}-${i}`,
      name: displayName,
      subtitle: `${uploadFileName} · row ${i + 1}`,
      borrower: null,
      uploadRow,
      variables,
      phonesToUse:
        addressCol?.kind === "phone" && addressValue !== "__invalid__"
          ? [addressValue]
          : [],
      emailsToUse:
        addressCol?.kind === "email" && addressValue !== "__invalid__"
          ? [addressValue]
          : [],
      ccEmails: [],
      wontSend,
    })
  }
  return rows
}

/** Deterministic plausible value for a parsed column cell. */
function synthesizeCell(
  col: UploadColumn,
  seedBorrower: Borrower,
  rowIndex: number,
  r: () => number,
): string {
  // Scatter a few gaps and a few invalids into the sample so the won't-send
  // + missing-variable states are visible even on a fresh journey.
  if (col.kind === "phone") {
    const miss = r()
    if (miss < 0.06) return ""
    if (miss < 0.09) return "__invalid__"
    return seedBorrower.phone
  }
  if (col.kind === "email") {
    const miss = r()
    if (miss < 0.06) return ""
    if (miss < 0.09) return "__invalid__"
    return getBorrowerEmails(seedBorrower)[0] ?? ""
  }
  if (col.kind === "number") {
    return `${1000 + Math.floor(r() * 50000)}`
  }
  if (col.kind === "date") {
    const d = new Date(Date.now() - rowIndex * 86400000)
    return d.toISOString().slice(0, 10)
  }
  // Text.
  if (col.name.toLowerCase() === "name") {
    // 10% gap so missing-data highlight has something to show.
    if (r() < 0.1) return ""
    return seedBorrower.name
  }
  if (col.name.toLowerCase().includes("amount")) {
    return `AED ${(1000 + Math.floor(r() * 90000)).toLocaleString()}`
  }
  return seedBorrower.product
}

/* ─────────── Reached-this-node rows ─────────── */

/**
 * Borrowers who reached this node in the given run. In the prototype
 * we re-use `listBorrowersInJourney` and tag each one — the post-run
 * resolver would read the borrower-trace spine to find the actual
 * reached set + their resolved variable snapshot.
 *
 * TODO (backend contract #6 — reached-set): given (journeyId, runId,
 * nodeId) return every borrower whose trace includes a hop at this
 * node, with the variable snapshot captured at the moment the node
 * fired.
 */
export function buildReachedSample(
  input: Omit<AudienceSampleInput, "entryTriggerType" | "uploadColumns" | "uploadFileName"> & {
    runId: string | null
  },
): AudienceSampleRow[] {
  const { journeyId, nodeId, channel, phoneSelection, emailSelection, shuffleSalt = 0, limit = 20, runId } = input
  if (!runId) return []
  const sampleSeed = hash(`reached:${journeyId}:${runId}:${nodeId}:${shuffleSalt}`)
  const r = seeded(sampleSeed)
  const picks: Borrower[] = []
  const used = new Set<string>()
  while (picks.length < Math.min(limit, borrowers.length)) {
    const idx = Math.floor(r() * borrowers.length)
    const b = borrowers[idx]
    if (used.has(b.id)) continue
    used.add(b.id)
    picks.push(b)
  }
  return picks.map((b) => rowForBorrower(b, nodeId, channel, phoneSelection, emailSelection))
}

/* ─────────── Summary across the sample ─────────── */

export interface MissingSummary {
  /** How many rows carry at least one missing token. */
  rowsWithMissing: number
  /** Total rows the summary was computed across. */
  totalRows: number
  /** Most-often-missing token + its count. Null when every row is clean. */
  mostCommon: { token: string; count: number } | null
}

export function summarizeMissing(
  rows: AudienceSampleRow[],
  subject: string,
  body: string,
  fallbacks: Record<string, string> = {},
): MissingSummary {
  let rowsWithMissing = 0
  const counts = new Map<string, number>()
  for (const row of rows) {
    const subjMissing = resolveText(subject, row.variables, fallbacks).missing
    const bodyMissing = resolveText(body, row.variables, fallbacks).missing
    const all = new Set<string>([...subjMissing, ...bodyMissing])
    if (all.size > 0) rowsWithMissing++
    for (const token of all) counts.set(token, (counts.get(token) ?? 0) + 1)
  }
  let mostCommon: MissingSummary["mostCommon"] = null
  for (const [token, count] of counts) {
    if (!mostCommon || count > mostCommon.count) mostCommon = { token, count }
  }
  return { rowsWithMissing, totalRows: rows.length, mostCommon }
}
