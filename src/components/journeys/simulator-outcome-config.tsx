"use client"

/**
 * Outcome-config section for the simulator drawer (Part 2.5).
 *
 * Lists every action node whose downstream branches depend on outcomes
 * (Trigger AI Call, Send Email, Send SMS, WhatsApp) with the current preset
 * shown as a chip. Clicking a chip opens a modal to pick a different preset
 * or configure custom rates.
 */

import * as React from "react"
import { ChevronDown, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  OUTCOME_DEFAULTS,
  OUTCOME_PRESETS,
  type OutcomePresetId,
} from "@/lib/simulation"

export interface ActionNodeInfo {
  id: string
  label: string
  kind: keyof typeof OUTCOME_DEFAULTS
}

export function OutcomeConfigSection({
  open,
  onOpen,
  nodes,
  choices,
  onChangeChoice,
}: {
  open: boolean
  onOpen: () => void
  nodes: ActionNodeInfo[]
  choices: Record<string, OutcomePresetId>
  onChangeChoice: (nodeId: string, preset: OutcomePresetId) => void
}) {
  const [editing, setEditing] = React.useState<ActionNodeInfo | null>(null)

  return (
    <div className="rounded-lg border border-border bg-card/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-xs font-semibold text-foreground">Outcome config</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {nodes.length} node{nodes.length === 1 ? "" : "s"}
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-border p-3">
          {nodes.length === 0 && (
            <p className="text-[10px] text-muted-foreground">
              No action nodes need outcome config. Add a Trigger AI Call, Send Email/SMS, or
              WhatsApp node to configure outcome distributions here.
            </p>
          )}
          {nodes.map((n) => {
            const preset = choices[n.id] ?? "realistic"
            const presetLabel = OUTCOME_PRESETS.find((p) => p.id === preset)?.label ?? "Realistic"
            return (
              <div
                key={n.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/10 px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-foreground">{n.label}</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {n.kind}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(n)}
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                    preset === "realistic"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : preset === "best"
                        ? "border-primary-500/40 bg-primary-500/10 text-primary-300"
                        : preset === "worst"
                          ? "border-error-500/40 bg-error-500/10 text-error-300"
                          : "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
                  )}
                >
                  {presetLabel}
                </button>
              </div>
            )
          })}
        </div>
      )}
      {editing && (
        <OutcomePresetModal
          node={editing}
          current={choices[editing.id] ?? "realistic"}
          onSave={(preset) => {
            onChangeChoice(editing.id, preset)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function OutcomePresetModal({
  node,
  current,
  onSave,
  onClose,
}: {
  node: ActionNodeInfo
  current: OutcomePresetId
  onSave: (p: OutcomePresetId) => void
  onClose: () => void
}) {
  const [preset, setPreset] = React.useState<OutcomePresetId>(current)
  const [custom, setCustom] = React.useState<Record<string, number>>(
    () => ({ ...OUTCOME_DEFAULTS[node.kind].realistic }),
  )
  const previewDist =
    preset === "custom" ? custom : OUTCOME_DEFAULTS[node.kind][preset]
  const totalCustom = Object.values(custom).reduce((a, b) => a + b, 0)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[520px] rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{node.label}</h3>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Outcome preset · {node.kind}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-4 gap-1.5">
            {OUTCOME_PRESETS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPreset(opt.id)}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors",
                  preset === opt.id
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border bg-muted/10 text-foreground hover:border-neutral-700",
                )}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="mt-0.5 text-[9px] text-muted-foreground">{opt.description}</div>
              </button>
            ))}
          </div>

          <div className="rounded-md border border-border bg-muted/10 p-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Distribution
            </p>
            <div className="space-y-1.5">
              {Object.entries(previewDist).map(([outcome, pct]) => (
                <div key={outcome} className="flex items-center gap-2 text-[11px]">
                  <span className="w-40 truncate text-foreground">{outcome}</span>
                  {preset === "custom" ? (
                    <>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={custom[outcome] ?? 0}
                        onChange={(e) =>
                          setCustom((prev) => ({
                            ...prev,
                            [outcome]: Number(e.target.value),
                          }))
                        }
                        className="flex-1 accent-primary"
                      />
                      <span className="w-10 text-right tabular-nums text-muted-foreground">
                        {custom[outcome] ?? 0}%
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="relative h-1.5 flex-1 overflow-hidden rounded bg-muted">
                        <div
                          className="h-full bg-primary/70"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right tabular-nums text-muted-foreground">
                        {pct}%
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
            {preset === "custom" && (
              <p
                className={cn(
                  "mt-2 text-[10px]",
                  totalCustom === 100 ? "text-primary-400" : "text-warning-400",
                )}
              >
                Total: {totalCustom}% {totalCustom === 100 ? "" : "· must equal 100%"}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => onSave(preset)}
            disabled={preset === "custom" && totalCustom !== 100}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
