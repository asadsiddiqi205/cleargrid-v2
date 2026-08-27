"use client"

/**
 * DncCheck — paste phone numbers, get the subset that's on the ClearVoice
 * DNC list. Shared component used inline on the sender-profiles page and
 * inside the Trigger AI Call node's Callback Handling section.
 */

import * as React from "react"
import { AlertTriangle, Ban, CheckCircle2, Copy, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { checkNumbers } from "@/data/dnc-list"

interface DncCheckProps {
  /** Optional pre-filled numbers (e.g. from a Trigger AI Call node's audience). */
  initialNumbers?: string
  /** Compact mode — smaller footprint, no header, used inside inspector panels. */
  compact?: boolean
  /** Client / tenant name shown in the header. */
  clientLabel?: string
}

export function DncCheck({
  initialNumbers = "",
  compact = false,
  clientLabel,
}: DncCheckProps) {
  const [text, setText] = React.useState(initialNumbers)
  const [result, setResult] = React.useState<ReturnType<typeof checkNumbers> | null>(null)

  const run = () => {
    setResult(checkNumbers(text))
  }

  const copyOnList = () => {
    if (!result) return
    const list = result.normalized.filter((n) => n.onList).map((n) => n.digits).join("\n")
    navigator.clipboard.writeText(list)
    toast.success("On-list numbers copied to clipboard")
  }

  return (
    <div className={cn("space-y-3", compact ? "" : "")}>
      {!compact && (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-error-500/15">
            <Ban className="h-4 w-4 text-error-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-foreground">DNC check</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Paste phone numbers — every one is checked against the ClearVoice DNC list. Only
              the numbers that are on it are listed below.
            </p>
          </div>
          {clientLabel && (
            <span className="rounded-full border border-border bg-muted/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {clientLabel}
            </span>
          )}
        </div>
      )}

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={compact
          ? "One number per line…"
          : "971500000001\n+971 50 000 0002\n971500000003"}
        className={cn("resize-y font-mono text-[11px]", compact ? "min-h-[80px]" : "min-h-[140px]")}
      />
      <p className="text-[10px] text-muted-foreground">
        One number per line (commas and spaces work too). Duplicates are dropped, non-digits stripped.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={run} disabled={!text.trim()} className="h-8 text-[11px]">
          <Ban className="h-3 w-3" />
          Check DNC
        </Button>
        {result && result.onListCount > 0 && (
          <button
            type="button"
            onClick={copyOnList}
            className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
          >
            <Copy className="h-2.5 w-2.5" />
            Copy on-list
          </button>
        )}
      </div>

      {result && (
        <div className={cn(
          "rounded-md border px-3 py-2",
          result.onListCount > 0
            ? "border-error-500/40 bg-error-500/[0.06]"
            : "border-primary/40 bg-primary/[0.06]",
        )}>
          <p className={cn(
            "flex items-center gap-2 text-[11px] font-medium",
            result.onListCount > 0 ? "text-error-300" : "text-primary",
          )}>
            {result.onListCount > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {result.onListCount === 0
              ? `All ${result.totalScanned.toLocaleString()} numbers are clean — none on the DNC list.`
              : `${result.onListCount.toLocaleString()} of ${result.totalScanned.toLocaleString()} numbers are on the DNC list.`}
          </p>
          {result.onListCount > 0 && (
            <ul className="mt-2 space-y-0.5">
              {result.normalized.filter((n) => n.onList).map((n) => (
                <li key={n.digits} className="flex items-center gap-2 rounded bg-background/40 px-2 py-1 font-mono text-[11px]">
                  <XCircle className="h-3 w-3 text-error-400" />
                  <span className="text-foreground">{n.raw}</span>
                  {n.raw !== n.digits && (
                    <span className="text-[10px] text-muted-foreground">
                      → {n.digits}
                    </span>
                  )}
                  <span className="ml-auto text-[9px] uppercase tracking-wider text-error-400">
                    On DNC
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
