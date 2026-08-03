"use client"

import * as React from "react"
import { Plus, GripVertical, Trash2, Copy, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  BuilderBlock,
  BuilderDocument,
  BuilderRow,
  BlockKind,
} from "@/data/builder-blocks"
import { newBlockId, newRowId } from "@/data/builder-blocks"
import { BlockRenderer } from "./block-renderers"
import { PALETTE_DRAG_MIME } from "./block-palette"

interface BuilderCanvasProps {
  doc: BuilderDocument
  device: "desktop" | "mobile"
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onDocChange: (doc: BuilderDocument) => void
  /** Quick-delete from the X chip on a selected block. */
  onDeleteBlock?: (blockId: string) => void
  /** True while a palette item is being dragged. Lights up drop zones. */
  paletteDragActive?: boolean
  /** Called when a palette item is dropped on the canvas. */
  onInsertBlockAt?: (kind: BlockKind, moduleId: string | undefined, rowId: string, col: number, index: number) => void
  /** When called from preview, all chrome is suppressed. */
  previewMode?: boolean
  /** Optional override of width (e.g. preview at 320). */
  overrideWidth?: number
  /** Optional override of background (e.g. dark mode preview). */
  overrideBg?: string
}

/**
 * The drag-and-drop email canvas.
 *
 * The full SDK behaviour (drag-handles, dropzones, columns, nesting) is mocked
 * here in React. Real-world we'd wrap an embedded engine; the API surface
 * below is the integration seam.
 */
export function BuilderCanvas(props: BuilderCanvasProps) {
  const {
    doc,
    device,
    selectedBlockId,
    onSelectBlock,
    onDocChange,
    onDeleteBlock,
    paletteDragActive,
    onInsertBlockAt,
    previewMode = false,
    overrideWidth,
    overrideBg,
  } = props

  // Track the active drag-source so we can dim it and so drop zones can light up.
  const [draggingBlockId, setDraggingBlockId] = React.useState<string | null>(null)
  /** Drop zones are "active" if anything is being dragged — a canvas block OR a palette item. */
  const dragInProgress = !!draggingBlockId || !!paletteDragActive

  /**
   * Insert a new block at the given canvas position. Used when:
   *   - the parent provides no `onInsertBlockAt` callback (we fall back to this), OR
   *   - the palette item is dropped on a drop zone inside the canvas.
   */
  function defaultInsertBlockAt(
    kind: BlockKind,
    moduleId: string | undefined,
    rowId: string,
    col: number,
    index: number,
  ) {
    const newBlk = makeBlock(kind, moduleId)
    const rows = doc.rows.map((r) => {
      if (r.id !== rowId) return r
      if (r.locked) return r
      const columnsBlocks = r.columnsBlocks.map((c, i) => {
        if (i !== col) return c
        const next = [...c]
        next.splice(index, 0, newBlk)
        return next
      })
      return { ...r, columnsBlocks }
    })
    onDocChange({ ...doc, rows })
    onSelectBlock(newBlk.id)
  }

  const insertHandler = onInsertBlockAt ?? defaultInsertBlockAt

  function handleMoveBlock(
    blockId: string,
    targetRowId: string,
    targetCol: number,
    targetIndex: number,
  ) {
    // Locate the source block + remove it from its current position.
    let source: BuilderBlock | null = null
    const rows = doc.rows.map((r) => ({
      ...r,
      columnsBlocks: r.columnsBlocks.map((c) => {
        const idx = c.findIndex((b) => b.id === blockId)
        if (idx < 0) return c
        source = c[idx]
        const next = [...c]
        next.splice(idx, 1)
        return next
      }),
    }))
    if (!source) return

    // Don't drop into a locked row.
    const target = rows.find((r) => r.id === targetRowId)
    if (!target || target.locked) return
    if (!target.columnsBlocks[targetCol]) return

    // If the source row + column is the same as the target row + column,
    // the splice above may have shifted indices left of the target. Adjust.
    let adjustedIndex = targetIndex
    const original = doc.rows.find((r) => r.id === targetRowId)
    if (original && original.columnsBlocks[targetCol]) {
      const removedAt = original.columnsBlocks[targetCol].findIndex((b) => b.id === blockId)
      if (removedAt >= 0 && removedAt < targetIndex) adjustedIndex = targetIndex - 1
    }

    target.columnsBlocks[targetCol] = [
      ...target.columnsBlocks[targetCol].slice(0, adjustedIndex),
      source,
      ...target.columnsBlocks[targetCol].slice(adjustedIndex),
    ]

    onDocChange({ ...doc, rows })
  }

  const canvasWidth = overrideWidth ?? (device === "mobile" ? 360 : doc.contentWidth)

  function appendRow(after: number, columns: 1 | 2) {
    const newRow: BuilderRow = {
      id: newRowId(),
      columns,
      bg: "#FFFFFF",
      padding: 24,
      columnsBlocks: columns === 1 ? [[]] : [[], []],
    }
    const rows = [...doc.rows]
    rows.splice(after + 1, 0, newRow)
    onDocChange({ ...doc, rows })
  }

  function deleteRow(rowId: string) {
    onDocChange({ ...doc, rows: doc.rows.filter((r) => r.id !== rowId) })
  }
  function duplicateRow(rowId: string) {
    const idx = doc.rows.findIndex((r) => r.id === rowId)
    if (idx < 0) return
    const src = doc.rows[idx]
    const copy: BuilderRow = {
      ...src,
      id: newRowId(),
      columnsBlocks: src.columnsBlocks.map((col) =>
        col.map((b) => ({ ...b, id: newBlockId() })),
      ),
    }
    const rows = [...doc.rows]
    rows.splice(idx + 1, 0, copy)
    onDocChange({ ...doc, rows })
  }

  return (
    <div
      className="relative flex min-h-full justify-center overflow-y-auto p-8"
      style={{ background: overrideBg ?? (previewMode ? doc.pageBg : "transparent") }}
      onClick={() => !previewMode && onSelectBlock(null)}
    >
      <div
        className={cn(
          "rounded-md shadow-sm transition-all",
          !previewMode && "shadow-zinc-950/40",
        )}
        // dir on the email container so AR docs inherit RTL across rows + blocks.
        dir={doc.dir}
        lang={doc.language === "ar" ? "ar" : doc.language === "bilingual" ? undefined : "en"}
        style={{
          width: canvasWidth,
          maxWidth: "100%",
          background: doc.pageBg,
        }}
      >
        {doc.rows.map((row, idx) => (
          <RowView
            key={row.id}
            row={row}
            language={doc.language}
            previewMode={previewMode}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
            onDeleteBlock={onDeleteBlock}
            draggingBlockId={draggingBlockId}
            dragInProgress={dragInProgress}
            onDragStart={setDraggingBlockId}
            onDragEnd={() => setDraggingBlockId(null)}
            onMoveBlock={handleMoveBlock}
            onInsertBlockAt={insertHandler}
            onUpdateRow={(patch) => {
              const rows = doc.rows.map((r) => (r.id === row.id ? { ...r, ...patch } : r))
              onDocChange({ ...doc, rows })
            }}
            onDelete={() => deleteRow(row.id)}
            onDuplicate={() => duplicateRow(row.id)}
            onAppendBelow={(cols) => appendRow(idx, cols)}
          />
        ))}
        {!previewMode && doc.rows.length === 0 && (
          <div className="m-6 rounded-lg border-2 border-dashed border-zinc-300 p-12 text-center text-zinc-500">
            <p className="text-sm font-medium">Empty canvas</p>
            <p className="mt-1 text-xs">
              Drag a block from the left rail, or open Composer GPT to draft something.
            </p>
          </div>
        )}
        {!previewMode && (
          <div className="px-4 py-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => appendRow(doc.rows.length - 1, 1)}
                className="flex-1 rounded-md border-2 border-dashed border-zinc-300 px-3 py-2 text-[11px] font-medium text-zinc-500 hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-500"
              >
                <Plus className="mr-1 inline-block h-3 w-3" />
                Add row · 1 column
              </button>
              <button
                onClick={() => appendRow(doc.rows.length - 1, 2)}
                className="flex-1 rounded-md border-2 border-dashed border-zinc-300 px-3 py-2 text-[11px] font-medium text-zinc-500 hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-500"
              >
                <Plus className="mr-1 inline-block h-3 w-3" />
                Add row · 2 columns
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RowView({
  row,
  language,
  previewMode,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  draggingBlockId,
  dragInProgress,
  onDragStart,
  onDragEnd,
  onMoveBlock,
  onInsertBlockAt,
  onUpdateRow,
  onDelete,
  onDuplicate,
  onAppendBelow,
}: {
  row: BuilderRow
  language: "en" | "ar" | "bilingual"
  previewMode: boolean
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onDeleteBlock?: (blockId: string) => void
  draggingBlockId: string | null
  dragInProgress: boolean
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onMoveBlock: (blockId: string, targetRowId: string, targetCol: number, targetIndex: number) => void
  onInsertBlockAt?: (kind: BlockKind, moduleId: string | undefined, rowId: string, col: number, index: number) => void
  onUpdateRow: (patch: Partial<BuilderRow>) => void
  onDelete: () => void
  onDuplicate: () => void
  onAppendBelow: (cols: 1 | 2) => void
}) {
  const isRtl = row.dir === "rtl" || (language === "ar" && row.dir !== "ltr")
  const padding = row.padding ?? 16
  const bg = row.bg ?? "transparent"

  return (
    <div
      className={cn("group/row relative", !previewMode && "transition-colors hover:bg-emerald-500/[0.02]")}
      style={{ background: bg, padding, direction: isRtl ? "rtl" : "ltr" }}
    >
      {!previewMode && (
        <div className="absolute -left-9 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity group-hover/row:opacity-100">
          <div className="flex flex-col gap-0.5 rounded-md border border-zinc-700 bg-zinc-900 p-0.5 shadow-sm">
            <button title="Drag" className="cursor-grab rounded p-1 text-zinc-300 hover:bg-zinc-800">
              <GripVertical className="h-3 w-3" />
            </button>
            <button
              title="Duplicate row"
              onClick={onDuplicate}
              className="rounded p-1 text-zinc-300 hover:bg-zinc-800"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              title="Delete row"
              onClick={onDelete}
              disabled={row.locked}
              className="rounded p-1 text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" />
            </button>
            {row.locked && (
              <div title="Row locked" className="rounded p-1 text-amber-400">
                <Lock className="h-3 w-3" />
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: row.columns === 2 ? "1fr 1fr" : "1fr",
        }}
      >
        {row.columnsBlocks.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col">
            {col.map((b, blockIdx) => (
              <React.Fragment key={b.id}>
                <DropZone
                  active={dragInProgress && draggingBlockId !== b.id}
                  disabled={previewMode || row.locked}
                  onDropBlock={(blockId) => onMoveBlock(blockId, row.id, colIdx, blockIdx)}
                  onDropPalette={(kind, moduleId) => onInsertBlockAt?.(kind, moduleId, row.id, colIdx, blockIdx)}
                />
                <div className="my-1">
                  <BlockRenderer
                    block={b}
                    selected={selectedBlockId === b.id}
                    onSelect={(id) => onSelectBlock(id)}
                    onDelete={onDeleteBlock}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    isDragging={draggingBlockId === b.id}
                    previewMode={previewMode}
                  />
                </div>
              </React.Fragment>
            ))}
            {/* Trailing drop zone — catches drops below the last block (and the
                full-column dropzone when the column is empty). */}
            <DropZone
              active={dragInProgress}
              disabled={previewMode || row.locked}
              onDropBlock={(blockId) => onMoveBlock(blockId, row.id, colIdx, col.length)}
              onDropPalette={(kind, moduleId) => onInsertBlockAt?.(kind, moduleId, row.id, colIdx, col.length)}
              empty={col.length === 0}
            />
            {!previewMode && !row.locked && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const newBlk: BuilderBlock = {
                    id: newBlockId(),
                    kind: "text",
                    html: "<p style='margin:0;color:#0F172A;line-height:1.6;'>Start writing…</p>",
                  }
                  const nextCols = row.columnsBlocks.map((c, i) =>
                    i === colIdx ? [...c, newBlk] : c,
                  )
                  onUpdateRow({ columnsBlocks: nextCols })
                  onSelectBlock(newBlk.id)
                }}
                className="mt-1 rounded-md border-2 border-dashed border-zinc-300 px-3 py-1.5 text-[10px] font-medium text-zinc-500 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-500"
              >
                <Plus className="mr-1 inline-block h-2.5 w-2.5" />
                Add block
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Insertion slot between two blocks (and at the top + bottom of every column).
 *
 * Hidden when no drag is active to keep the canvas calm. While a drag is in
 * flight, every zone shows a thin amber rail that thickens + glows emerald on
 * dragover so the operator gets a clear "I'm dropping here" signal.
 */
function DropZone({
  active,
  disabled,
  onDropBlock,
  onDropPalette,
  empty,
}: {
  active: boolean
  disabled?: boolean
  /** Fired when an existing canvas block was dropped here (move/reorder). */
  onDropBlock: (blockId: string) => void
  /** Fired when a palette item was dropped here (insert new block). */
  onDropPalette: (kind: BlockKind, moduleId?: string) => void
  /** Render slightly larger when this is an empty column with no blocks. */
  empty?: boolean
}) {
  const [hover, setHover] = React.useState(false)

  if (disabled) return null

  return (
    <div
      onDragOver={(e) => {
        if (!active) return
        e.preventDefault()
        e.stopPropagation()
        // `dropEffect` must match `effectAllowed` of the source. Palette = "copy",
        // existing block = "move". We can't read the data here, but we can read
        // the types list to detect which source initiated the drag.
        const isPalette = e.dataTransfer.types.includes(PALETTE_DRAG_MIME)
        e.dataTransfer.dropEffect = isPalette ? "copy" : "move"
        setHover(true)
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        if (!active) return
        e.preventDefault()
        e.stopPropagation()
        setHover(false)
        const paletteRaw = e.dataTransfer.getData(PALETTE_DRAG_MIME)
        if (paletteRaw) {
          try {
            const parsed = JSON.parse(paletteRaw) as { kind: BlockKind; moduleId?: string }
            onDropPalette(parsed.kind, parsed.moduleId)
            return
          } catch {
            /* fall through */
          }
        }
        const blockId =
          e.dataTransfer.getData("application/x-cleargrid-block") ||
          e.dataTransfer.getData("text/plain")
        if (blockId) onDropBlock(blockId)
      }}
      className={cn(
        "relative transition-all",
        active ? (empty ? "h-16" : "h-6") : "h-0",
        hover && "h-10",
      )}
    >
      {active && (
        <div
          className={cn(
            "absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-full transition-all",
            hover ? "h-1.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]" : "h-0.5 bg-emerald-500/40",
          )}
        />
      )}
    </div>
  )
}

// Re-export so the page can call insert helpers without recomputing.
export function insertBlockIntoDoc(
  doc: BuilderDocument,
  kind: BlockKind,
  moduleId: string | undefined,
  selectedBlockId: string | null,
): { doc: BuilderDocument; newBlockId: string } {
  const newBlock = makeBlock(kind, moduleId)
  // Find target row/col: prefer the row/col containing the selected block,
  // else last row, first column.
  const rows = doc.rows.map((r) => ({ ...r, columnsBlocks: r.columnsBlocks.map((c) => [...c]) }))
  let targetRowIdx = rows.length - 1
  let targetColIdx = 0
  let insertAt = rows[targetRowIdx]?.columnsBlocks[targetColIdx]?.length ?? 0

  if (selectedBlockId) {
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].columnsBlocks.length; c++) {
        const idx = rows[r].columnsBlocks[c].findIndex((b) => b.id === selectedBlockId)
        if (idx >= 0) {
          targetRowIdx = r
          targetColIdx = c
          insertAt = idx + 1
        }
      }
    }
  }

  // If no rows exist, create one.
  if (rows.length === 0) {
    rows.push({
      id: newRowId(),
      columns: 1,
      bg: "#FFFFFF",
      padding: 24,
      columnsBlocks: [[]],
    })
    targetRowIdx = 0
    targetColIdx = 0
    insertAt = 0
  }

  rows[targetRowIdx].columnsBlocks[targetColIdx].splice(insertAt, 0, newBlock)
  return { doc: { ...doc, rows }, newBlockId: newBlock.id }
}

export function makeBlock(kind: BlockKind, moduleId?: string): BuilderBlock {
  const id = newBlockId()
  switch (kind) {
    case "text":
      return { id, kind, html: "<p style='margin:0;color:#0F172A;line-height:1.6;'>New paragraph.</p>" }
    case "image":
      return { id, kind, src: "https://placehold.co/600x200/F1F5F9/64748B?text=Image", alt: "Image" }
    case "button":
      return { id, kind, label: "Click me", href: "#", bg: "#10B981", color: "#FFFFFF", align: "center" }
    case "payment_link":
      return {
        id,
        kind,
        label: "Make Payment",
        bg: "#10B981",
        color: "#FFFFFF",
        conversionEvent: "payment_initiated",
        subline: "Tap to pay AED {{amount_due}} now",
      }
    case "divider":
      return { id, kind, color: "#E5E7EB", thickness: 1 }
    case "spacer":
      return { id, kind, height: 20 }
    case "table":
      return {
        id,
        kind,
        headers: ["Item", "Amount"],
        rows: [
          ["Outstanding", "AED {{amount_due}}"],
          ["Late fee", "AED 50"],
        ],
      }
    case "social":
      return { id, kind, platforms: ["facebook", "twitter", "linkedin", "instagram"] }
    case "video":
      return {
        id,
        kind,
        thumbnailUrl: "https://placehold.co/600x340/0F172A/E2E8F0?text=Video",
        href: "#",
        caption: "How to pay your installment in 3 taps",
      }
    case "custom_html":
      return { id, kind, html: "<div style='padding:12px;background:#F1F5F9;border-radius:4px;'>Custom HTML</div>" }
    case "saved_module":
      return { id, kind, moduleId: moduleId ?? "sm-payment-cta-cleargrid", locked: true }
    case "ai_conditional":
      return {
        id,
        kind,
        ruleLabel: "Set up the condition →",
        variantA: [],
        variantB: [],
      }
  }
}
