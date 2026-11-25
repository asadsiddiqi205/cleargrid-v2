"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Plug,
  RefreshCw,
  Unplug,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  connectWarmy,
  disconnectWarmy,
  getConnectionState,
  isWarmyAdmin,
  listWarmyDomains,
  syncNow,
  type ConnectionState,
} from "@/data/warmy"
import { WARMY_THRESHOLDS } from "@/data/warmy-thresholds"
import { senderProfiles } from "@/data/sender-profiles"
import { WarmyDevFireEvent } from "@/components/warmy/warmy-alerts"

/** TODO: swap for the real app URL when the webhook endpoint lands. */
const WEBHOOK_URL = "https://command.cleargrid.co/api/warmy/webhook"

function relative(iso?: string) {
  if (!iso) return "never"
  const ms = Date.now() - Date.parse(iso)
  if (ms < 60_000) return "just now"
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)} min ago`
  if (ms < 24 * 60 * 60_000) return `${Math.floor(ms / (60 * 60_000))} h ago`
  return `${Math.floor(ms / (24 * 60 * 60_000))} d ago`
}

function connectionLabel(c: ConnectionState): {
  text: string
  tone: "connected" | "fresh" | "stale" | "error" | "disconnected"
} {
  if (!c.connected) return { text: "Warmy · Not connected", tone: "disconnected" }
  if (c.lastError) return { text: "Warmy · Sync error", tone: "error" }
  const synced = c.lastSyncAt ? Date.parse(c.lastSyncAt) : 0
  const age = Date.now() - synced
  if (age <= WARMY_THRESHOLDS.freshSyncMs) {
    return { text: `Warmy · Synced ${relative(c.lastSyncAt)}`, tone: "fresh" }
  }
  if (age > WARMY_THRESHOLDS.staleSyncMs) {
    return { text: `Warmy · Stale (${relative(c.lastSyncAt)})`, tone: "stale" }
  }
  return { text: `Warmy · Synced ${relative(c.lastSyncAt)}`, tone: "connected" }
}

export function WarmyConnectionButton() {
  const [state, setState] = React.useState<ConnectionState>(() => getConnectionState())
  const [open, setOpen] = React.useState(false)
  const admin = isWarmyAdmin()

  // Re-read on open and after mutations.
  const refresh = React.useCallback(() => setState({ ...getConnectionState() }), [])

  const label = connectionLabel(state)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] font-medium",
          label.tone === "disconnected" && "border-neutral-700 bg-neutral-800 text-neutral-200",
          label.tone === "error" && "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
          label.tone === "stale" && "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
          (label.tone === "connected" || label.tone === "fresh") &&
            "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        )}
      >
        <Activity className="h-3.5 w-3.5" />
        {label.text}
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Warmy connection
          </SheetTitle>
          <SheetDescription>
            Pulls domain health, placement estimates and today&apos;s recommended volumes.
            Every Command screen reads from the synced data; nothing calls Warmy directly.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 overflow-y-auto px-4 pb-6 pt-2">
          {!admin && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-200">
              Admin-only. Ask a Sender profile admin to connect or sync.
            </div>
          )}

          <ConnectionPanel state={state} onChange={refresh} admin={admin} />
          <DomainMatchingPanel />
          <WebhookPanel />
          <LastSyncPanel state={state} />
          {admin && (
            <div className="pt-1">
              <WarmyDevFireEvent />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ConnectionPanel({
  state,
  onChange,
  admin,
}: {
  state: ConnectionState
  onChange: () => void
  admin: boolean
}) {
  const [apiKey, setApiKey] = React.useState("")
  const [workspace, setWorkspace] = React.useState(state.workspaceId ?? "")
  const [show, setShow] = React.useState(false)

  const displayKey = state.apiKeyLastFour
    ? `••••••••••••${state.apiKeyLastFour}`
    : apiKey

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        API credentials
      </h3>
      <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
        <label className="block space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            API key
          </span>
          <div className="flex items-center gap-1">
            <Input
              type={show ? "text" : "password"}
              value={state.connected ? displayKey : apiKey}
              readOnly={state.connected}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="warmy_sk_…"
              className="h-8 font-mono text-[11px]"
            />
            <Button variant="ghost" size="icon" onClick={() => setShow((s) => !s)}>
              {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Workspace ID
          </span>
          <Input
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            placeholder="ws_cleargrid_01"
            className="h-8 font-mono text-[11px]"
            readOnly={state.connected}
          />
        </label>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {state.connected ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={!admin}
                onClick={() => {
                  syncNow()
                  onChange()
                  toast.success("Warmy synced")
                }}
              >
                <RefreshCw className="h-3 w-3" />
                Sync now
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!admin}
                onClick={() => {
                  disconnectWarmy()
                  onChange()
                  toast.info("Warmy disconnected")
                }}
              >
                <Unplug className="h-3 w-3" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              disabled={!admin || !apiKey.trim() || !workspace.trim()}
              onClick={() => {
                connectWarmy({ apiKey: apiKey.trim(), workspaceId: workspace.trim() })
                onChange()
                toast.success("Warmy connected")
              }}
            >
              <Plug className="h-3 w-3" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

function DomainMatchingPanel() {
  // Every domain in Command: each profile's domain pool + every
  // from-email domain. Matched / unmatched against Warmy by name.
  const commandDomains = React.useMemo(() => {
    const set = new Set<string>()
    for (const p of senderProfiles) {
      for (const d of p.domains) set.add(d.domain.toLowerCase())
      const email = p.fromEmail
      if (email.includes("@")) set.add(email.split("@")[1]!.toLowerCase())
    }
    return [...set].sort()
  }, [])

  const warmyDomains = React.useMemo(
    () => listWarmyDomains().map((d) => d.name.toLowerCase()),
    [],
  )

  const inCommandNotWarmy = commandDomains.filter((d) => !warmyDomains.includes(d))
  const inWarmyNotCommand = warmyDomains.filter((d) => !commandDomains.includes(d))
  const matched = commandDomains.filter((d) => warmyDomains.includes(d))

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Domain matching
      </h3>
      <div className="rounded-md border border-border bg-muted/20 p-3 text-[11px]">
        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          <span>{matched.length} of {commandDomains.length} Command domains matched</span>
        </div>
        <DomainMismatchList
          title="In Command, not in Warmy"
          hint="These fall back to ops caps."
          domains={inCommandNotWarmy}
          emptyText="Every Command domain is matched."
        />
        <DomainMismatchList
          title="In Warmy, not on any profile"
          hint="Unused warmed capacity."
          domains={inWarmyNotCommand}
          emptyText="Every Warmy domain is in use."
        />
      </div>
    </section>
  )
}

function DomainMismatchList({
  title,
  hint,
  domains,
  emptyText,
}: {
  title: string
  hint: string
  domains: string[]
  emptyText: string
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>{title}</span>
        <span className="font-normal text-muted-foreground/70">{hint}</span>
      </div>
      {domains.length === 0 ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1">
          {domains.map((d) => (
            <span
              key={d}
              className="rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground"
            >
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function WebhookPanel() {
  const [copied, setCopied] = React.useState(false)
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Webhook
      </h3>
      <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-center gap-1">
          <Input value={WEBHOOK_URL} readOnly className="h-8 font-mono text-[11px]" />
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(WEBHOOK_URL)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
            aria-label="Copy webhook URL"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[10.5px] text-muted-foreground">
          {copied
            ? "Copied."
            : "Add this URL in Warmy's Notification Hub to get alerts as they happen."}
        </p>
      </div>
    </section>
  )
}

function LastSyncPanel({ state }: { state: ConnectionState }) {
  if (!state.connected && !state.lastSyncAt) return null
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Last sync
      </h3>
      <div className="space-y-1 rounded-md border border-border bg-muted/20 p-3 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">At</span>
          <span className="tabular-nums text-foreground">
            {state.lastSyncAt ? new Date(state.lastSyncAt).toLocaleString() : "—"}
          </span>
        </div>
        {state.lastError && (
          <div className="flex items-start gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10.5px] text-red-700 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{state.lastError}</span>
          </div>
        )}
      </div>
    </section>
  )
}
