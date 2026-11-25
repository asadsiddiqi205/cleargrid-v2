"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  fireSampleEvent,
  listDevSamples,
  listNotifications,
  markAllRead,
  markOneRead,
  subscribe,
  unreadCount,
  type WarmyNotification,
} from "@/data/warmy-notifications"
import { listWarmyDomains } from "@/data/warmy"
import { statusForDomain } from "@/data/domain-health"

function useNotifications() {
  const [snapshot, setSnapshot] = React.useState(() => ({
    items: listNotifications(),
    unread: unreadCount(),
  }))
  React.useEffect(() => {
    return subscribe(() => {
      setSnapshot({ items: listNotifications(), unread: unreadCount() })
    })
  }, [])
  return snapshot
}

/** Banner shown at the top of the Sender profiles page when any domain
 *  is Blocked or has an open alert. */
export function WarmyAlertBanner() {
  const problems = React.useMemo(() => {
    const out: Array<{ domain: string; reason: string }> = []
    for (const w of listWarmyDomains()) {
      const s = statusForDomain(w.name)
      if (s.status === "blocked") out.push({ domain: w.name, reason: "Blocked" })
      else if (s.alerts.some((a) => a.state !== "resolved")) {
        out.push({ domain: w.name, reason: `${s.alerts.length} open alert${s.alerts.length === 1 ? "" : "s"}` })
      }
    }
    return out
  }, [])

  if (problems.length === 0) return null
  return (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-[11.5px] text-red-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">
          {problems.length} sender domain{problems.length === 1 ? "" : "s"} need attention
        </p>
        <p className="mt-0.5 text-[10.5px] text-red-200/80">
          {problems
            .slice(0, 4)
            .map((p) => `${p.domain} · ${p.reason}`)
            .join(" · ")}
          {problems.length > 4 && ` · +${problems.length - 4} more`}
        </p>
      </div>
      <Link
        href="/sender-profiles"
        className="shrink-0 rounded border border-red-500/40 bg-red-500/20 px-2 py-0.5 text-[10.5px] font-medium text-red-100 hover:bg-red-500/30"
      >
        Open Domains
      </Link>
    </div>
  )
}

/** Bell icon + notifications list, intended for the top bar. */
export function WarmyNotificationsBell() {
  const { items, unread } = useNotifications()
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Warmy notifications"
            className="relative inline-flex h-8 items-center justify-center rounded-md px-2 text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                {unread}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Warmy
          </div>
          <button
            type="button"
            onClick={markAllRead}
            className="text-[10.5px] font-medium text-primary hover:underline"
          >
            Mark all read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-4 text-center text-[11px] text-muted-foreground">No alerts.</p>
          ) : (
            items.map((n) => <NotificationRow key={n.id} n={n} />)
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationRow({ n }: { n: WarmyNotification }) {
  const Icon =
    n.severity === "error"
      ? AlertCircle
      : n.severity === "warning"
      ? AlertTriangle
      : CheckCircle2
  return (
    <button
      type="button"
      onClick={() => markOneRead(n.id)}
      className={cn(
        "flex w-full items-start gap-2 border-b border-border/60 px-3 py-2 text-left text-[11px] hover:bg-muted/40",
        !n.read && "bg-primary/[0.03]",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-3.5 w-3.5 shrink-0",
          n.severity === "error" && "text-red-400",
          n.severity === "warning" && "text-amber-400",
          n.severity === "info" && "text-emerald-400",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate font-medium text-foreground">{n.title}</span>
          {!n.read && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" aria-label="Unread" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[10.5px] text-muted-foreground">{n.detail}</p>
        <p className="mt-0.5 text-[9.5px] text-muted-foreground">
          {new Date(n.at).toLocaleString()}
        </p>
      </div>
    </button>
  )
}

/** Dev-only control that fires a synthetic webhook event into the
 *  mock. Mounted inside the Warmy drawer so it's reachable only by
 *  admins with the connection open. */
export function WarmyDevFireEvent() {
  const [open, setOpen] = React.useState(false)
  const samples = listDevSamples()
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded border border-border bg-muted/30 px-2 py-1 text-[10.5px] text-muted-foreground hover:text-foreground"
          >
            <Zap className="h-3 w-3" />
            Fire sample event (dev)
          </button>
        }
      />
      <SheetContent className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-400" />
            Fire a sample Warmy event
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-1.5 p-4">
          {samples.map((s, i) => (
            <Button
              key={s.label}
              variant="outline"
              size="sm"
              className="w-full justify-start text-left"
              onClick={() => {
                fireSampleEvent(i)
                setOpen(false)
              }}
            >
              {s.label}
            </Button>
          ))}
          <p className="pt-2 text-[10px] text-muted-foreground">
            Dev-only. Appends a synthetic webhook event to the Warmy mock so you can preview
            the notification UI without waiting for a real Warmy event.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
