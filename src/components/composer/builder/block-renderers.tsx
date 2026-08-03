"use client"

import * as React from "react"
import { Lock, CircleDollarSign, GitBranchPlus, Library, AlertCircle, X, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BuilderBlock } from "@/data/builder-blocks"
import { getSavedModuleById } from "@/data/saved-modules"

interface RenderArgs {
  block: BuilderBlock
  selected: boolean
  onSelect: (id: string) => void
  /** When true, the document is in preview mode — chrome (locks, conditional indicators) is hidden. */
  previewMode?: boolean
  /** Quick-delete handler. Hidden on locked blocks. */
  onDelete?: (id: string) => void
  /** Drag-and-drop wiring — caller manages drag payload. */
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
  /** True while this block is the active drag source — visually demote it. */
  isDragging?: boolean
}

/** Renders a single block inside the canvas. */
export function BlockRenderer({
  block,
  selected,
  onSelect,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
  previewMode = false,
}: RenderArgs) {
  const isLocked = block.locked
  const hasConditional = !!block.conditional && block.conditional.rules.length > 0

  const chromeBadges = !previewMode && (isLocked || hasConditional)
  const canDrag = !previewMode && !isLocked && !!onDragStart

  // IMPORTANT: the wrapper is NOT draggable. Only the grip handle is.
  // If the wrapper were draggable, native text-drag inside text blocks would
  // intercept the gesture and the block wouldn't move.
  return (
    <div
      className={cn(
        "relative group transition-opacity",
        !previewMode && "cursor-pointer transition-colors",
        selected && !previewMode && "outline outline-2 outline-emerald-500 outline-offset-2",
        !selected && !previewMode && "hover:outline hover:outline-1 hover:outline-emerald-500/40 hover:outline-offset-2",
        isDragging && "opacity-30",
      )}
      onClick={(e) => {
        if (previewMode) return
        e.stopPropagation()
        onSelect(block.id)
      }}
    >
      {/* Floating block toolbar — top-right of block. Grip + X. Visible on
          hover, always-on when selected. */}
      {!previewMode && (canDrag || (selected && !isLocked)) && (
        <div
          className={cn(
            "absolute -top-3 right-2 z-30 flex items-center gap-0.5 rounded-md border border-zinc-700 bg-zinc-900 p-0.5 shadow-md transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          // Don't let clicks here propagate to canvas/select.
          onClick={(e) => e.stopPropagation()}
        >
          {canDrag && (
            <span
              role="button"
              aria-label="Drag to reorder"
              title="Drag to reorder"
              draggable
              onDragStart={(e) => {
                e.stopPropagation()
                e.dataTransfer.effectAllowed = "move"
                e.dataTransfer.setData("application/x-cleargrid-block", block.id)
                e.dataTransfer.setData("text/plain", block.id)
                onDragStart?.(block.id)
              }}
              onDragEnd={(e) => {
                e.stopPropagation()
                onDragEnd?.()
              }}
              className="flex h-5 w-5 cursor-grab select-none items-center justify-center rounded text-zinc-300 hover:bg-zinc-800 hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical className="h-3 w-3" />
            </span>
          )}
          {selected && !isLocked && onDelete && (
            <button
              type="button"
              title="Delete block"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(block.id)
              }}
              className="flex h-5 w-5 items-center justify-center rounded text-red-300 hover:bg-red-500/20 hover:text-red-200"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}

      {/* Top-left chrome badges (Locked / Conditional) */}
      {chromeBadges && (
        <div className="pointer-events-none absolute -top-2.5 left-2 z-10 flex items-center gap-1">
          {isLocked && (
            <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-300 ring-1 ring-zinc-700">
              <Lock className="h-2.5 w-2.5" />
              Locked
            </span>
          )}
          {hasConditional && (
            <span className="inline-flex items-center gap-1 rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-medium text-violet-300 ring-1 ring-violet-500/30">
              <GitBranchPlus className="h-2.5 w-2.5" />
              Conditional
            </span>
          )}
        </div>
      )}

      <InnerBlock block={block} previewMode={previewMode} />
    </div>
  )
}

function InnerBlock({ block, previewMode }: { block: BuilderBlock; previewMode: boolean }) {
  switch (block.kind) {
    case "text":
      return (
        <div
          style={{
            textAlign: block.align ?? "left",
            fontSize: block.fontSize ?? 15,
          }}
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      )
    case "image":
      return (
        <div style={{ textAlign: "center" }}>
          <img
            src={block.src}
            alt={block.alt}
            style={{ maxWidth: "100%", width: block.width ?? "100%", display: "inline-block" }}
          />
        </div>
      )
    case "button":
      return (
        <div style={{ textAlign: block.align ?? "center" }}>
          <a
            href={block.href}
            style={{
              display: "inline-block",
              background: block.bg,
              color: block.color,
              textDecoration: "none",
              padding: "12px 28px",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
            }}
            onClick={(e) => e.preventDefault()}
          >
            {block.label}
          </a>
        </div>
      )
    case "payment_link":
      return (
        <div style={{ textAlign: "center" }}>
          <a
            href="#payment-link"
            style={{
              display: "inline-block",
              background: block.bg,
              color: block.color,
              textDecoration: "none",
              padding: "14px 36px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 15,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.preventDefault()}
          >
            {block.label}
          </a>
          {block.subline && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>{block.subline}</div>
          )}
          {!previewMode && (
            <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-medium uppercase tracking-wider text-emerald-400">
              <CircleDollarSign className="h-2.5 w-2.5" />
              Trackable payment link · {block.conversionEvent}
            </div>
          )}
        </div>
      )
    case "divider":
      return (
        <hr
          style={{
            border: "none",
            borderTop: `${block.thickness}px solid ${block.color}`,
            margin: "8px 0",
          }}
        />
      )
    case "spacer":
      return <div style={{ height: block.height }} />
    case "table":
      return (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {block.headers.map((h, i) => (
                <th
                  key={i}
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #E5E7EB",
                    padding: "8px 10px",
                    color: "#374151",
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td
                    key={j}
                    style={{
                      padding: "8px 10px",
                      borderBottom: "1px solid #F3F4F6",
                      color: "#0F172A",
                    }}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    case "social":
      return (
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {block.platforms.map((p) => (
            <span
              key={p}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                background: "#0F172A",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {p[0].toUpperCase()}
            </span>
          ))}
        </div>
      )
    case "video":
      return (
        <div style={{ position: "relative" }}>
          <img src={block.thumbnailUrl} alt="Video" style={{ maxWidth: "100%", borderRadius: 8 }} />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.25)",
              borderRadius: 8,
            }}
          >
            <span style={{ color: "#fff", fontSize: 32 }}>▶</span>
          </div>
          {block.caption && <p style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 6 }}>{block.caption}</p>}
        </div>
      )
    case "custom_html":
      return (
        <div
          dangerouslySetInnerHTML={{ __html: block.html }}
          // Visual chip in canvas non-preview to flag advanced block.
          style={{ position: "relative" }}
        />
      )
    case "saved_module": {
      const mod = getSavedModuleById(block.moduleId)
      if (!mod) {
        return (
          <div className="flex items-center gap-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertCircle className="h-3.5 w-3.5" />
            Missing saved module: {block.moduleId}
          </div>
        )
      }
      return (
        <div className="relative">
          <div dangerouslySetInnerHTML={{ __html: mod.previewHtml }} />
          {!previewMode && (
            <div className="pointer-events-none absolute right-2 top-1 flex items-center gap-1 text-[9px] font-medium text-zinc-400">
              <Library className="h-2.5 w-2.5" />
              {mod.name}
            </div>
          )}
        </div>
      )
    }
    case "ai_conditional":
      return (
        <div
          className={cn(
            "rounded border-2 border-dashed p-3 text-center text-[11px]",
            previewMode ? "hidden" : "border-violet-500/40 bg-violet-500/5 text-violet-300",
          )}
        >
          <div className="font-semibold">Conditional block</div>
          <div className="mt-0.5 text-[10px] text-violet-300/80">{block.ruleLabel}</div>
        </div>
      )
  }
}
