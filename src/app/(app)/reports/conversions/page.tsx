"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  BadgeCheck,
  Info,
  ShieldCheck,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  loadConversionEvents,
  saveConversionEvents,
  type ConversionEventDefinition,
} from "@/data/conversion-events"

export default function ConversionSetupPage() {
  const [events, setEvents] = React.useState<ConversionEventDefinition[]>([])
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    setEvents(loadConversionEvents())
  }, [])

  const patch = (id: string, next: Partial<ConversionEventDefinition>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...next } : e)))
    setDirty(true)
  }

  const commit = () => {
    saveConversionEvents(events)
    setDirty(false)
    toast.success("Conversion events saved", {
      description: "Applied to email campaigns, SMS campaigns, and journeys.",
    })
  }

  return (
    <PageShell
      title="Conversion setup"
      description="Define the events that count as a conversion. Applied to every send across email, SMS, and journeys — no per-campaign duplication."
    >
      <div className="space-y-4">
        <div className="rounded-md border border-info-500/30 bg-info-500/[0.06] px-4 py-3 text-[11px] leading-relaxed text-info-200/90">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info-300" />
            <div>
              <p className="font-medium text-info-100">
                Attribution reuses the existing model — no second system to reason about.
              </p>
              <p className="mt-1">
                Each event's <span className="font-medium">window</span> defines how long a
                conversion can be credited back to a message the borrower received. Each
                event's <span className="font-medium">model</span> matches the message-analytics
                page (last-touch is the default).
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card/40">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
              Conversion events · {events.length}
            </h2>
            {dirty && (
              <Button size="sm" onClick={commit} className="h-7 text-[11px]">
                <BadgeCheck className="h-3 w-3" />
                Save changes
              </Button>
            )}
          </div>
          <ul className="divide-y divide-border">
            {events.map((event) => (
              <li key={event.id} className="px-4 py-3.5">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_auto_auto_auto]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">{event.label}</span>
                      {event.monetary && (
                        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary">
                          Monetary
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {event.description}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground/80">
                      <Info className="h-2.5 w-2.5" />
                      Source signal: <span className="font-mono">{event.sourceSignal}</span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Window
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={90}
                        value={event.windowDays}
                        onChange={(e) =>
                          patch(event.id, {
                            windowDays: Math.max(1, Math.min(90, Number(e.target.value) || 1)),
                          })
                        }
                        className="h-8 w-16 text-center tabular-nums"
                        disabled={!event.enabled}
                      />
                      <span className="text-[11px] text-muted-foreground">days</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Model
                    </Label>
                    <Select
                      value={event.model}
                      onValueChange={(v) =>
                        patch(event.id, { model: (v as ConversionEventDefinition["model"]) ?? "last_touch" })
                      }
                    >
                      <SelectTrigger className="h-8 w-[132px] text-[11px]" disabled={!event.enabled}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last_touch">Last-message touch</SelectItem>
                        <SelectItem value="first_touch">First-message touch</SelectItem>
                        <SelectItem value="even">Even split</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start justify-end gap-2 lg:pt-4">
                    <span
                      className={cn(
                        "text-[11px]",
                        event.enabled ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {event.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <Switch
                      checked={event.enabled}
                      onCheckedChange={(v) => patch(event.id, { enabled: v })}
                      size="sm"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[10px] leading-relaxed text-muted-foreground">
          The prototype stores this list in your browser under
          <span className="font-mono"> cleargrid:conversion-events</span>. A real backend
          would persist it per workspace and version each edit.
        </p>
      </div>
    </PageShell>
  )
}
