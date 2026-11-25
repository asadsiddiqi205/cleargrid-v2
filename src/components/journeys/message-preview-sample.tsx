"use client"

/**
 * Preview sample picker + filled-in message preview for Send Email and
 * Send SMS nodes. Replaces the plain "pick from the first 20 borrowers"
 * dropdown with a proper audience sample drawn from the journey's entry
 * trigger, so ops can see the message filled in for real-looking
 * borrowers BEFORE the first run.
 *
 * Both the inline inspector preview (`node-config-panel`) and the
 * fullscreen editor preview (`message-node-full-editor`) render through
 * this component so the two surfaces behave identically.
 */

import * as React from "react"
import type { Node, Edge } from "@xyflow/react"
import {
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  Ban,
  Info,
  User,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  MessagePreview,
  type MessageChannel,
} from "@/components/shared/message-preview"
import { SmsDeviceMockup, type DeviceKind } from "@/components/shared/sms-device-mockup"
import {
  buildAudienceSample,
  buildReachedSample,
  fullAudience,
  resolveText,
  rowForBorrowerId,
  summarizeMissing,
  type AudienceSampleRow,
  type SampleChannel,
  type SampleSource,
} from "@/data/audience-sample"
import type { PhoneSelection, EmailSelection } from "@/data/borrower-channels"
import {
  DEFAULT_PHONE_SELECTION,
  DEFAULT_EMAIL_SELECTION,
} from "@/data/borrower-channels"
import {
  findUpstreamExcelColumns,
  type UploadColumn,
} from "@/data/journeys"
import { NOT_SENT_REASON_LABEL, type NotSentReason } from "@/data/journey-metrics"
import { isRtl, segmentSms } from "@/lib/sms-encoding"

const DEFAULT_SAMPLE_SIZE = 20

/* ───────── Helpers to walk the graph for the entry trigger ───────── */

interface EntryContext {
  entryTriggerType: string | null
  uploadColumns: UploadColumn[] | null
  uploadFileName?: string
}

/**
 * Walk upstream from the Send node and surface (a) whether an entry
 * trigger exists at all, (b) what kind of trigger it is, (c) if it's
 * an Excel upload, the parsed columns + file name. When there's no
 * entry trigger, `entryTriggerType` is null — the picker's empty state
 * fires.
 */
function useEntryContext(
  nodeId: string,
  nodes: Node[] | undefined,
  edges: Edge[] | undefined,
): EntryContext {
  return React.useMemo(() => {
    if (!nodes || !edges) {
      return { entryTriggerType: null, uploadColumns: null }
    }
    const byId = new Map(nodes.map((n) => [n.id, n] as const))
    let cursor = nodeId
    const seen = new Set<string>()
    let trigger: string | null = null
    let uploadColumns: UploadColumn[] | null = null
    let uploadFileName: string | undefined
    for (let i = 0; i < 25; i++) {
      if (seen.has(cursor)) break
      seen.add(cursor)
      const n = byId.get(cursor)
      if (!n) break
      const d = (n.data ?? {}) as {
        triggerType?: string
        uploadColumns?: UploadColumn[]
        uploadFileName?: string
      }
      if (d.triggerType) {
        trigger = d.triggerType
        if (d.triggerType === "excel_upload" && d.uploadColumns) {
          uploadColumns = d.uploadColumns
          uploadFileName = d.uploadFileName
        }
        break
      }
      const inbound = edges.find((e) => e.target === cursor)
      if (!inbound) break
      cursor = inbound.source
    }
    // Fallback lookup for Excel columns using the existing helper — this
    // handles nested branches the straight walk above might miss.
    if (!uploadColumns) {
      uploadColumns = findUpstreamExcelColumns(
        nodes.map((n) => ({ id: n.id, data: n.data as Record<string, unknown> | undefined })),
        edges.map((e) => ({ source: e.source, target: e.target })),
        nodeId,
      )
      if (uploadColumns && !trigger) trigger = "excel_upload"
    }
    return { entryTriggerType: trigger, uploadColumns, uploadFileName }
  }, [nodeId, nodes, edges])
}

/* ───────── Public API ───────── */

export interface MessagePreviewWithSamplingProps {
  journeyId?: string
  nodeId: string
  channel: MessageChannel
  /** Subject source (may contain {{tokens}}). */
  subject?: string
  /** Body source (may contain {{tokens}}). */
  body: string
  /** From-identity resolved by the caller. */
  fromName?: string
  fromAddress?: string
  /** SMS sender id. */
  senderId?: string
  /** Click-tracking flag — passed through to the shared preview. */
  clickTracking?: boolean
  /** Phone-selection strategy configured on the node. */
  phoneSelection?: PhoneSelection
  /** Email-selection strategy configured on the node. */
  emailSelection?: EmailSelection
  /** "one_per_contact" | "one_with_cc" from the email send mode setting. */
  emailSendMode?: string
  /** Canvas nodes + edges, so the picker can walk upstream to the trigger. */
  nodes?: Node[]
  edges?: Edge[]
  /** Currently-selected canvas run. Enables the "Reached this node" source. */
  selectedRunId?: string | null
  /**
   * Controlled device toggle for SMS. Omit to render the picker's own copy.
   */
  device?: DeviceKind
  onDeviceChange?: (d: DeviceKind) => void
}

/**
 * Entry point used by both the inline inspector preview and the
 * fullscreen editor preview. Owns the sample picker + the rendered
 * preview (filled body, SMS counters, won't-send banner).
 */
export function MessagePreviewWithSampling(props: MessagePreviewWithSamplingProps) {
  const {
    journeyId = "unknown",
    nodeId,
    channel,
    subject = "",
    body,
    fromName,
    fromAddress,
    senderId,
    clickTracking,
    phoneSelection = DEFAULT_PHONE_SELECTION,
    emailSelection = DEFAULT_EMAIL_SELECTION,
    emailSendMode = "one_per_contact",
    nodes,
    edges,
    selectedRunId,
    device,
    onDeviceChange,
  } = props

  const sampleChannel: SampleChannel =
    channel === "email" ? "email" : channel === "sms" ? "sms" : "whatsapp"

  const entry = useEntryContext(nodeId, nodes, edges)
  const hasAudience = entry.entryTriggerType !== null

  const [shuffleSalt, setShuffleSalt] = React.useState(0)
  const [cursor, setCursor] = React.useState(0)
  const [source, setSource] = React.useState<SampleSource>("audience")
  const [showMissingOnly, setShowMissingOnly] = React.useState(false)
  const [extraRows, setExtraRows] = React.useState<AudienceSampleRow[]>([])

  // Whether "Reached this node" is available — currently only once a run is
  // selected. The post-run resolver is a TODO (contract #6 in audience-sample.ts).
  const reachedEnabled = !!selectedRunId

  // Promote "reached" to the default source once a run is selected.
  React.useEffect(() => {
    if (reachedEnabled) setSource("reached_node")
    else setSource("audience")
    setCursor(0)
  }, [reachedEnabled])

  const baseSample = React.useMemo(() => {
    if (!hasAudience) return []
    if (source === "reached_node") {
      return buildReachedSample({
        journeyId,
        nodeId,
        channel: sampleChannel,
        phoneSelection,
        emailSelection,
        shuffleSalt,
        limit: DEFAULT_SAMPLE_SIZE,
        runId: selectedRunId ?? null,
      })
    }
    return buildAudienceSample({
      journeyId,
      nodeId,
      entryTriggerType: entry.entryTriggerType,
      uploadColumns: entry.uploadColumns,
      uploadFileName: entry.uploadFileName,
      channel: sampleChannel,
      phoneSelection,
      emailSelection,
      shuffleSalt,
      limit: DEFAULT_SAMPLE_SIZE,
    })
  }, [
    hasAudience,
    source,
    journeyId,
    nodeId,
    entry.entryTriggerType,
    entry.uploadColumns,
    entry.uploadFileName,
    sampleChannel,
    phoneSelection,
    emailSelection,
    shuffleSalt,
    selectedRunId,
  ])

  // Merge the base sample with any borrowers the author searched in.
  // Extras are prepended and kept across shuffles.
  const sample = React.useMemo(() => {
    if (extraRows.length === 0) return baseSample
    const baseIds = new Set(baseSample.map((r) => r.id))
    const unique = extraRows.filter((r) => !baseIds.has(r.id))
    return [...unique, ...baseSample]
  }, [baseSample, extraRows])

  // Summary across all rows (for the row-above-picker "4 of 20 have missing data" line).
  const missingSummary = React.useMemo(
    () => summarizeMissing(sample, subject, body),
    [sample, subject, body],
  )

  // Optional "only show missing" filter.
  const visibleSample = React.useMemo(() => {
    if (!showMissingOnly) return sample
    return sample.filter((row) => {
      const subjMissing = resolveText(subject, row.variables).missing.length
      const bodyMissing = resolveText(body, row.variables).missing.length
      return subjMissing + bodyMissing > 0
    })
  }, [sample, subject, body, showMissingOnly])

  React.useEffect(() => {
    if (cursor >= visibleSample.length) setCursor(0)
  }, [visibleSample.length, cursor])

  const active = visibleSample[cursor] ?? null

  const subjResolved = React.useMemo(
    () => resolveText(subject, active?.variables ?? {}),
    [subject, active?.variables],
  )
  const bodyResolved = React.useMemo(
    () => resolveText(body, active?.variables ?? {}),
    [body, active?.variables],
  )

  const missingTokens = React.useMemo(() => {
    const set = new Set<string>([...subjResolved.missing, ...bodyResolved.missing])
    return Array.from(set)
  }, [subjResolved.missing, bodyResolved.missing])

  // Empty states.
  if (!hasAudience) {
    return <NoAudienceState channel={channel} />
  }

  if (!active) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/[0.04] p-4 text-[11.5px] text-muted-foreground">
        No borrowers in the sample.
      </div>
    )
  }

  const recipientLine = buildRecipientLine({
    channel,
    row: active,
    senderId,
    fromName,
    fromAddress,
    subject: subjResolved.text,
    emailSendMode,
  })

  const smsSegmentation = channel === "sms" ? segmentSms(bodyResolved.text) : null

  return (
    <div className="space-y-2.5">
      {/* Summary + source switch */}
      <SummaryBar
        summary={missingSummary}
        showMissingOnly={showMissingOnly}
        onToggleMissingOnly={() => setShowMissingOnly((s) => !s)}
      />
      <SourceSwitch
        source={source}
        onChange={setSource}
        reachedEnabled={reachedEnabled}
      />

      {/* Picker row (prev/next, counter, shuffle, search) */}
      <PickerRow
        active={active}
        index={cursor}
        total={visibleSample.length}
        onPrev={() => setCursor((c) => (c - 1 + visibleSample.length) % visibleSample.length)}
        onNext={() => setCursor((c) => (c + 1) % visibleSample.length)}
        onShuffle={() => {
          setShuffleSalt((s) => s + 1)
          setCursor(0)
        }}
        onSearch={(borrowerId) => {
          if (!borrowerId) return
          const row = rowForBorrowerId(borrowerId, {
            journeyId,
            nodeId,
            entryTriggerType: entry.entryTriggerType,
            uploadColumns: entry.uploadColumns,
            uploadFileName: entry.uploadFileName,
            channel: sampleChannel,
            phoneSelection,
            emailSelection,
          })
          if (!row) return
          setExtraRows((rows) => (rows.find((r) => r.id === row.id) ? rows : [row, ...rows]))
          setCursor(0)
        }}
      />

      <HelperLine />

      {/* Recipient line */}
      <RecipientLine channel={channel} text={recipientLine} />

      {/* Won't-send banner */}
      {active.wontSend && <WontSendBanner reason={active.wontSend} />}

      {/* The actual preview — same component the Composer uses. We render
          highlighted bodies alongside it so authors can see which tokens
          came back empty. */}
      <div className={cn(active.wontSend && "opacity-70")}>
        <PreviewWithHighlight
          channel={channel}
          subjectResolved={subjResolved}
          bodyResolved={bodyResolved}
          fromName={fromName}
          fromAddress={fromAddress}
          senderId={senderId}
          recipientName={active.name}
          recipientPhone={active.phonesToUse[0]}
          clickTracking={clickTracking}
          device={device}
          onDeviceChange={onDeviceChange}
        />
      </div>

      {/* SMS counters — always based on the FILLED body, so a long name
          or an Arabic value pushes the counter into UCS-2 / a second
          segment the way the real send will. */}
      {smsSegmentation && <SmsCounters seg={smsSegmentation} body={bodyResolved.text} />}

      {/* Missing-variable warning under the preview. */}
      {missingTokens.length > 0 && <MissingVariablesWarning tokens={missingTokens} />}
    </div>
  )
}

/* ───────── Sub-components ───────── */

function NoAudienceState({ channel }: { channel: MessageChannel }) {
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-dashed border-warning-500/40 bg-warning-500/[0.05] p-3 text-[11.5px] text-warning-200">
        <div className="flex items-center gap-1.5 font-medium">
          <AlertTriangle className="h-3 w-3" />
          No audience yet
        </div>
        <p className="mt-1 text-warning-200/80">
          Add an entry trigger to preview with real borrowers. The preview
          below shows unfilled variables as they'd appear in the raw
          template.
        </p>
      </div>
      <MessagePreview
        channel={channel}
        subject="(no borrower selected)"
        body="Variables like {{borrower.first_name}} stay unfilled until an entry trigger is added."
      />
    </div>
  )
}

function SummaryBar({
  summary,
  showMissingOnly,
  onToggleMissingOnly,
}: {
  summary: ReturnType<typeof summarizeMissing>
  showMissingOnly: boolean
  onToggleMissingOnly: () => void
}) {
  if (summary.rowsWithMissing === 0) {
    return (
      <div className="text-[10.5px] text-muted-foreground">
        All {summary.totalRows} sample borrowers have every variable filled.
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggleMissingOnly}
      className={cn(
        "flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-[10.5px] transition-colors",
        showMissingOnly
          ? "border-warning-500/40 bg-warning-500/10 text-warning-200"
          : "border-border bg-muted/[0.04] text-muted-foreground hover:bg-muted/[0.1]",
      )}
      title={showMissingOnly ? "Show every sample borrower" : "Show only borrowers with missing data"}
    >
      <span>
        <AlertTriangle className="mr-1 inline h-2.5 w-2.5 text-warning-300" />
        {summary.rowsWithMissing} of {summary.totalRows} sample borrowers have missing data
        {summary.mostCommon && (
          <> · most often: <span className="font-mono">{summary.mostCommon.token}</span> ({summary.mostCommon.count})</>
        )}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider">
        {showMissingOnly ? "Show all" : "Filter"}
      </span>
    </button>
  )
}

function SourceSwitch({
  source,
  onChange,
  reachedEnabled,
}: {
  source: SampleSource
  onChange: (s: SampleSource) => void
  reachedEnabled: boolean
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
      <SourceButton
        label="Audience sample"
        active={source === "audience"}
        onClick={() => onChange("audience")}
      />
      <SourceButton
        label="Reached this node"
        active={source === "reached_node"}
        disabled={!reachedEnabled}
        tooltip={!reachedEnabled ? "Available after a run reaches this node" : undefined}
        onClick={() => onChange("reached_node")}
      />
    </div>
  )
}

function SourceButton({
  label,
  active,
  disabled,
  tooltip,
  onClick,
}: {
  label: string
  active: boolean
  disabled?: boolean
  tooltip?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        "rounded px-2 py-0.5 text-[10.5px] font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-50 hover:text-muted-foreground",
      )}
    >
      {label}
    </button>
  )
}

function PickerRow({
  active,
  index,
  total,
  onPrev,
  onNext,
  onShuffle,
  onSearch,
}: {
  active: AudienceSampleRow
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onShuffle: () => void
  onSearch: (borrowerId: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[10px] font-semibold text-foreground">
        {active.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12px] font-medium text-foreground">{active.name}</span>
          {active.wontSend && <WontSendTag reason={active.wontSend} />}
        </div>
        <div className="truncate text-[10px] text-muted-foreground">{active.subtitle}</div>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={total <= 1}
          aria-label="Previous"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span className="min-w-[2.5rem] text-center text-[10px] tabular-nums text-muted-foreground">
          {total === 0 ? "0 of 0" : `${index + 1} of ${total}`}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={total <= 1}
          aria-label="Next"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onShuffle}
          aria-label="Shuffle"
          title="Draw a new sample"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Shuffle className="h-3 w-3" />
        </button>
        <SearchPopover onSelect={onSearch} />
      </div>
    </div>
  )
}

function SearchPopover({ onSelect }: { onSelect: (borrowerId: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const pool = fullAudience()
    return pool
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          b.phone.includes(q) ||
          b.emiratesId.includes(q),
      )
      .slice(0, 8)
  }, [query])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Search any borrower"
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Search className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-[260px] rounded-md border border-border bg-popover shadow-xl">
            <div className="border-b border-border p-1.5">
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, phone, account ID…"
                className="h-7 text-[11px]"
              />
            </div>
            <ul className="max-h-[220px] overflow-y-auto p-1">
              {query.trim() === "" && (
                <li className="px-2 py-2 text-[10.5px] text-muted-foreground">
                  Search the full audience to add a borrower to the picker.
                </li>
              )}
              {query.trim() !== "" && results.length === 0 && (
                <li className="px-2 py-2 text-[10.5px] text-muted-foreground">
                  No matches.
                </li>
              )}
              {results.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(b.id)
                      setOpen(false)
                      setQuery("")
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted/60"
                  >
                    <User className="h-3 w-3 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] text-foreground">{b.name}</div>
                      <div className="truncate text-[9.5px] text-muted-foreground">
                        {b.dpdBucket} DPD · {b.product}
                      </div>
                    </div>
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

function HelperLine() {
  return (
    <p className="text-[9.5px] text-muted-foreground">
      Sample from the journey's audience. Conditions before this node aren't applied.
    </p>
  )
}

function WontSendTag({ reason }: { reason: NotSentReason }) {
  return (
    <span
      className="rounded border border-error-500/30 bg-error-500/10 px-1 py-px text-[8.5px] font-semibold uppercase tracking-wider text-error-300"
      title={NOT_SENT_REASON_LABEL[reason]}
    >
      {NOT_SENT_REASON_LABEL[reason]}
    </span>
  )
}

function WontSendBanner({ reason }: { reason: NotSentReason }) {
  return (
    <div className="flex items-start gap-1.5 rounded-md border border-neutral-500/30 bg-neutral-500/10 px-2 py-1.5 text-[10.5px] text-neutral-200">
      <Ban className="mt-px h-3 w-3" />
      <span>
        Won't be sent: <span className="font-medium">{NOT_SENT_REASON_LABEL[reason]}</span>
      </span>
    </div>
  )
}

function RecipientLine({ channel, text }: { channel: MessageChannel; text: string }) {
  return (
    <div className="flex items-start gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1.5 text-[10.5px] text-muted-foreground">
      <Info className="mt-px h-3 w-3 text-muted-foreground" />
      <span className="truncate font-mono text-[10px] text-foreground" title={text}>
        {text || (channel === "email" ? "(no address resolved)" : "(no number resolved)")}
      </span>
    </div>
  )
}

function buildRecipientLine(args: {
  channel: MessageChannel
  row: AudienceSampleRow
  senderId?: string
  fromName?: string
  fromAddress?: string
  subject: string
  emailSendMode: string
}): string {
  const { channel, row, senderId, fromName, fromAddress, subject, emailSendMode } = args
  if (channel === "sms" || channel === "whatsapp") {
    const to = row.phonesToUse[0] ?? "(no number on file)"
    return `${senderId ?? "ClearGrid"} → ${to}`
  }
  const to = row.emailsToUse[0] ?? "(no address on file)"
  const cc =
    emailSendMode === "one_with_cc" && row.ccEmails.length > 0
      ? ` · CC ${row.ccEmails.join(", ")}`
      : ""
  // With no profile picked, drop the empty angle-brackets segment and
  // let the From read as just the name.
  const name = fromName ?? "ClearGrid"
  const addr = fromAddress && fromAddress.trim().length > 0 ? fromAddress : null
  const from = addr ? `${name} <${addr}>` : name
  return `From ${from} · To ${to}${cc} · Subject "${subject}"`
}

function MissingVariablesWarning({ tokens }: { tokens: string[] }) {
  return (
    <div className="rounded-md border border-warning-500/30 bg-warning-500/[0.08] px-2 py-1.5 text-[10.5px] text-warning-200">
      <div className="flex items-center gap-1 font-medium">
        <AlertTriangle className="h-2.5 w-2.5" />
        Missing for this borrower:
      </div>
      <div className="mt-0.5 flex flex-wrap gap-1 font-mono text-[10px]">
        {tokens.map((t) => (
          <span
            key={t}
            className="rounded bg-warning-500/15 px-1 py-px text-warning-100"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

function SmsCounters({
  seg,
  body,
}: {
  seg: ReturnType<typeof segmentSms>
  body: string
}) {
  const { encoding, characterCount, segments, perSegmentCap, nonGsmSample } = seg
  const warn = encoding === "ucs2" || segments > 1
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border px-2 py-1 text-[10px] tabular-nums",
        warn
          ? "border-warning-500/40 bg-warning-500/[0.05] text-warning-200"
          : "border-border bg-background/60 text-muted-foreground",
      )}
      title={`Filled body: ${body.length} JS chars · computed with carrier semantics for this borrower`}
    >
      <span>
        <span className="font-medium">{characterCount}</span> chars
      </span>
      <span>·</span>
      <span>
        <span className="font-medium">{segments}</span> segment{segments === 1 ? "" : "s"}
        <span className="opacity-70"> (cap {perSegmentCap})</span>
      </span>
      <span>·</span>
      <span className="font-medium uppercase">{encoding === "ucs2" ? "UCS-2" : "GSM-7"}</span>
      {encoding === "ucs2" && nonGsmSample.length > 0 && (
        <span className="opacity-70">
          · forced by{" "}
          <span className="font-mono">{nonGsmSample.join(" ")}</span>
        </span>
      )}
    </div>
  )
}

/* ───────── Preview body + token highlighting ───────── */

function PreviewWithHighlight({
  channel,
  subjectResolved,
  bodyResolved,
  fromName,
  fromAddress,
  senderId,
  recipientName,
  recipientPhone,
  clickTracking,
  device,
  onDeviceChange,
}: {
  channel: MessageChannel
  subjectResolved: { text: string; missing: string[] }
  bodyResolved: { text: string; missing: string[] }
  fromName?: string
  fromAddress?: string
  senderId?: string
  recipientName?: string
  recipientPhone?: string
  clickTracking?: boolean
  device?: DeviceKind
  onDeviceChange?: (d: DeviceKind) => void
}) {
  const hasMissing = subjectResolved.missing.length + bodyResolved.missing.length > 0

  // When there are no missing tokens we hand off to the shared preview
  // as-is so emails and WhatsApp look identical to how they do anywhere
  // else. When there ARE missing tokens we fall through to the
  // channel-specific highlighted variant below so empty tokens show in
  // amber.
  if (!hasMissing) {
    return (
      <MessagePreview
        channel={channel}
        subject={subjectResolved.text}
        body={bodyResolved.text}
        fromName={fromName}
        fromAddress={fromAddress}
        senderId={senderId}
        recipientName={recipientName}
        recipientPhone={recipientPhone}
        clickTracking={clickTracking}
        device={device}
        onDeviceChange={onDeviceChange}
      />
    )
  }

  if (channel === "email") {
    return (
      <HighlightedEmailPreview
        subject={subjectResolved.text}
        subjectMissing={subjectResolved.missing}
        body={bodyResolved.text}
        bodyMissing={bodyResolved.missing}
        fromName={fromName}
        fromAddress={fromAddress}
      />
    )
  }

  // SMS + WhatsApp: hand off to the shared device mockup with a
  // highlighted body. The bubble itself still renders through
  // SmsDeviceMockup / WhatsAppPreview via MessagePreview — we inject
  // the highlighted text by prefixing a "[MISSING]" marker inline so
  // RTL + segmentation behaviour stays untouched.
  return (
    <div>
      <SmsDeviceMockup
        body={bodyResolved.text || " "}
        senderId={senderId}
        recipientPhone={recipientPhone}
        clickTracking={clickTracking}
        device={device}
        onDeviceChange={onDeviceChange}
      />
      {bodyResolved.missing.length > 0 && (
        <p className="mt-1 text-[9.5px] text-muted-foreground">
          Blank spots above are unfilled{" "}
          <span className="font-mono">{"{{"}</span>
          variables
          <span className="font-mono">{"}}"}</span>. Highlighted list below.
        </p>
      )}
    </div>
  )
}

function HighlightedEmailPreview({
  subject,
  subjectMissing,
  body,
  bodyMissing,
  fromName = "ClearGrid Collections",
  fromAddress = "collections@cleargrid.ae",
}: {
  subject: string
  subjectMissing: string[]
  body: string
  bodyMissing: string[]
  fromName?: string
  fromAddress?: string
}) {
  const subjectRtl = isRtl(subject)
  const bodyRtl = isRtl(body)
  const subjectHighlighted = highlightBlanks(subject, subjectMissing)
  const bodyHighlighted = highlightBlanks(body, bodyMissing)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
            {(fromName || "CG").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium text-foreground">{fromName}</div>
            <div className="truncate text-[10px] text-muted-foreground">{fromAddress}</div>
          </div>
        </div>
      </div>
      <div className="space-y-1 px-3 py-2">
        <div
          dir={subjectRtl ? "rtl" : "ltr"}
          className={cn(
            "text-[13px] font-semibold text-foreground",
            subjectRtl && "text-right",
          )}
        >
          {subjectHighlighted}
        </div>
      </div>
      <div
        dir={bodyRtl ? "rtl" : "ltr"}
        className={cn(
          "max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-border/60 px-3 py-3 text-[11px] leading-relaxed text-foreground",
          bodyRtl && "text-right",
        )}
      >
        {bodyHighlighted}
      </div>
    </div>
  )
}

/**
 * Render body text with a subtle amber pill where a `{{token}}` resolved
 * to empty. We can only point at the position AFTER resolution — the
 * body is already a string of plain text — so we insert a narrow
 * zero-width-looking marker at the token's position. For emails where
 * the empty token leaves a visible gap, the marker makes the gap
 * easy to spot. If every missing variable produced a non-empty
 * fallback, we don't highlight anything inline.
 */
function highlightBlanks(text: string, missing: string[]): React.ReactNode {
  if (!missing.length || !text.includes("  ")) {
    // Empty-string tokens usually collapse neighbouring spaces into a
    // double-space ("Hi ,"). We detect that and mark it, otherwise we
    // just return the resolved text as-is — the missing-vars warning
    // below still calls them out.
    return text
  }
  const parts = text.split("  ")
  const out: React.ReactNode[] = []
  parts.forEach((part, i) => {
    out.push(part)
    if (i < parts.length - 1) {
      out.push(
        <span
          key={i}
          className="mx-0.5 rounded bg-warning-500/25 px-1 text-[10px] font-mono text-warning-100"
          title="Empty variable"
        >
          ∅
        </span>,
      )
    }
  })
  return out
}
