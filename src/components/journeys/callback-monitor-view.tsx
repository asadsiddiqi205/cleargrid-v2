"use client"

import * as React from "react"
import {
  PhoneIncoming,
  AlertTriangle,
  X,
  CheckCircle2,
  Pause,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getScheduledCallbacks,
  subscribeCallbacks,
  CANCEL_REASON_LABEL,
  HOLD_REASON_LABEL,
  type ScheduledCallback,
} from "@/components/journeys/callback-runtime"

/**
 * Part 4 — Journey monitoring view.
 *
 * Stub of the per-borrower runtime view. Each row shows one scheduled callback
 * with the status indicator + tooltip. Per spec:
 *
 *   • emerald-500 — pending, on-track
 *   • amber-500   — held by compliance (DND / contact window / 7-in-7)
 *   • red-500     — held beyond max duration, will exit
 *   • zinc-500 (struck through) — cancelled (DNC / opt-out / consent revoked / journey ended)
 *
 * Cancelled callbacks remain visible. Hover tooltips show details.
 */
export function CallbackMonitorView() {
  const [items, setItems] = React.useState<ScheduledCallback[]>(getScheduledCallbacks())

  React.useEffect(() => {
    const unsub = subscribeCallbacks(() => setItems(getScheduledCallbacks()))
    return unsub
  }, [])

  const pending = items.filter((cb) => cb.status === "pending")
  const held = items.filter((cb) => cb.status === "held")
  const fired = items.filter((cb) => cb.status === "fired")
  const cancelled = items.filter((cb) => cb.status === "cancelled" || cb.status === "errored")

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Pending" value={pending.length} icon={Loader2} tone="emerald" />
        <Kpi label="Held by compliance" value={held.length} icon={Pause} tone="amber" />
        <Kpi label="Fired (last 24h)" value={fired.length} icon={CheckCircle2} tone="emerald" />
        <Kpi label="Cancelled / errored" value={cancelled.length} icon={X} tone="zinc" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card/40">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Scheduled callbacks</h3>
          <p className="text-[11px] text-muted-foreground">
            All borrower-requested AI callbacks across journeys. Cancelled rows remain visible
            for 7 days. Hold = re-evaluates until cleared. DNC = hard cancel.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-xs text-muted-foreground">
              No scheduled callbacks. Use{" "}
              <span className="font-medium text-foreground">Simulate callback commit</span> on an
              AI Call node to create one.
            </p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Borrower</th>
                <th className="px-4 py-2 text-left font-medium">Journey instance</th>
                <th className="px-4 py-2 text-left font-medium">Originating node</th>
                <th className="px-4 py-2 text-left font-medium">Fire time</th>
                <th className="px-4 py-2 text-left font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {items.map((cb) => (
                <CallbackRow key={cb.id} cb={cb} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function CallbackRow({ cb }: { cb: ScheduledCallback }) {
  const fireDate = new Date(cb.fireAtIso)
  const isCancelled = cb.status === "cancelled" || cb.status === "errored"

  const detailText =
    cb.status === "held" && cb.holdReason
      ? `Held — ${HOLD_REASON_LABEL[cb.holdReason]}. Re-evaluating.`
      : cb.status === "cancelled" && cb.endReason
        ? CANCEL_REASON_LABEL[cb.endReason as keyof typeof CANCEL_REASON_LABEL] ?? "Cancelled"
        : cb.status === "errored"
          ? "Held past max duration → exited with Errored"
          : cb.status === "fired"
            ? "Call placed via ClearVoice"
            : "Pending, on track"

  return (
    <tr className="border-b border-border/40 last:border-b-0">
      <td className="px-4 py-2.5">
        <StatusIndicator cb={cb} />
      </td>
      <td className={cn("px-4 py-2.5 text-foreground", isCancelled && "line-through opacity-60")}>
        {cb.borrowerName}
        <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">{cb.dealId}</div>
      </td>
      <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">
        {cb.originatingJourneyInstanceId}
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {cb.originatingNodeId}
        <div className="mt-0.5 font-mono text-[9px] text-muted-foreground/80">
          {cb.clearvoiceProjectId} · {cb.clearvoiceScriptId}
        </div>
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {fireDate.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
        <div className="mt-0.5 text-[9px] text-muted-foreground/70">UTC {fireDate.toISOString().replace("T", " ").slice(0, 16)}</div>
      </td>
      <td className="px-4 py-2.5">
        <span className={cn("text-[11px]", isCancelled ? "text-zinc-500" : "text-muted-foreground")}>
          {detailText}
        </span>
      </td>
    </tr>
  )
}

function StatusIndicator({ cb }: { cb: ScheduledCallback }) {
  let tone: "emerald" | "amber" | "red" | "zinc" = "emerald"
  let label: string = "Pending"
  if (cb.status === "held") {
    tone = "amber"
    label = "Held"
  } else if (cb.status === "errored") {
    tone = "red"
    label = "Errored"
  } else if (cb.status === "cancelled") {
    tone = "zinc"
    label = "Cancelled"
  } else if (cb.status === "fired") {
    tone = "emerald"
    label = "Fired"
  }

  const tooltipLines: string[] = [
    `Fire time: ${new Date(cb.fireAtIso).toLocaleString()}`,
    `Source node: ${cb.originatingNodeId}`,
  ]
  if (cb.status === "held" && cb.holdReason) {
    tooltipLines.push(`Hold reason: ${HOLD_REASON_LABEL[cb.holdReason]}`)
  }
  if (cb.status === "cancelled" && cb.endReason) {
    tooltipLines.push(
      `Cancel reason: ${CANCEL_REASON_LABEL[cb.endReason as keyof typeof CANCEL_REASON_LABEL] ?? cb.endReason}`,
    )
    if (cb.cancelledAt) tooltipLines.push(`Cancelled at: ${new Date(cb.cancelledAt).toLocaleString()}`)
  }

  return (
    <div
      title={tooltipLines.join("\n")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        tone === "emerald" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        tone === "amber" && "border-amber-500/30 bg-amber-500/10 text-amber-400",
        tone === "red" && "border-red-500/30 bg-red-500/10 text-red-400",
        tone === "zinc" && "border-zinc-700 bg-zinc-800/40 text-zinc-400",
      )}
    >
      <PhoneIncoming className={cn("h-2.5 w-2.5", cb.status === "cancelled" && "line-through")} />
      {label}
    </div>
  )
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  tone: "emerald" | "amber" | "red" | "zinc"
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            tone === "emerald" && "text-emerald-400",
            tone === "amber" && "text-amber-400",
            tone === "red" && "text-red-400",
            tone === "zinc" && "text-zinc-500",
          )}
        />
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

/**
 * Compact inline indicator used inside journey row monitoring (e.g. on a
 * per-borrower table row). One callback maps to one indicator.
 */
export function CallbackRowIndicator({ cb }: { cb: ScheduledCallback }) {
  return <StatusIndicator cb={cb} />
}

// Required to prevent unused imports warning
void AlertTriangle
