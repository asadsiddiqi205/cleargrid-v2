"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  BuilderCanvas,
  insertBlockIntoDoc,
  makeBlock as makeNewBlockForInsert,
} from "@/components/composer/builder/builder-canvas"
import { BuilderToolbar } from "@/components/composer/builder/builder-toolbar"
import { BlockPalette } from "@/components/composer/builder/block-palette"
import { PropertiesPanel } from "@/components/composer/builder/properties-panel"
import {
  ComposerGptDialog,
  InlineAiDialog,
  MergeTagDialog,
  ConditionalDialog,
  PreviewTestDialog,
  AbTestDialog,
  VersionHistoryDialog,
  CreateJourneyDialog,
  PlaybookLintBar,
} from "@/components/composer/builder/builder-dialogs"
import type {
  BuilderBlock,
  BuilderDocument,
  BlockKind,
} from "@/data/builder-blocks"
import {
  getSampleDoc,
  newBlankDoc,
  newBlockId,
} from "@/data/builder-blocks"
import {
  templateAuthoring,
  type TemplateStatus,
} from "@/data/template-versions"
import { playbooksV3 } from "@/data/playbooks-v3"
import { buildStarterDoc, buildAiGeneratedHtmlDoc } from "@/data/starter-docs"
import type { TemplatePurpose, TemplateChannel } from "@/data/templates"
import {
  translateDocToArabic,
  translateDocToBilingual,
} from "@/lib/translate-builder-doc"

export default function BuilderPage() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const templateId = params.id

  // Resolve initial doc + authoring metadata.
  const authoring = templateAuthoring[templateId]
  const isNew = templateId === "new"

  // For new templates, read the lender + purpose passed by the create dialog
  // and seed the canvas with a starter doc tailored to that lender + purpose.
  // If the user arrived without a purpose (e.g. from the inline composer's
  // "Open v3 builder" CTA), we treat that as "no context" and show a blank
  // canvas — they haven't decided what they're authoring yet.
  const newLenderId = search?.get("lender") ?? "general"
  const newPurposeRaw = search?.get("purpose") || undefined
  const newPurpose = newPurposeRaw as TemplatePurpose | undefined
  const newChannel = (search?.get("channel") as TemplateChannel) ?? "email"
  const newName = search?.get("name") ?? ""
  const cameFromNewTemplateFlow = !!newPurposeRaw
  /** When the inline composer's AI-generated path hands off, we land with a
   *  complete, decorated HTML email rather than the lean starter. */
  const cameFromAiGenerator = search?.get("from") === "ai"

  const initialDocId = authoring?.builderDocId ?? "doc-mashreq-reminder"
  const playbookId = search?.get("playbook") ?? authoring?.playbookId ?? "pbk-mashreq-formal"

  const [doc, setDoc] = React.useState<BuilderDocument>(() => {
    if (isNew) {
      // AI-generated path → fully decorated email (hero, spotlight, CTA, etc.)
      if (cameFromAiGenerator) {
        return buildAiGeneratedHtmlDoc(newLenderId, newPurpose, newName)
      }
      // Wizard path (lender + purpose chosen) → tailored starter
      if (cameFromNewTemplateFlow) {
        return buildStarterDoc(newLenderId, newPurpose, newChannel, newName)
      }
      // No context → blank
      return newBlankDoc()
    }
    return getSampleDoc(initialDocId) ?? newBlankDoc()
  })
  const [templateName, setTemplateName] = React.useState<string>(
    isNew
      ? newName || "Untitled template"
      : templateId.replace(/^rich-/, "").replace(/-/g, " "),
  )
  const [status, setStatus] = React.useState<TemplateStatus>(authoring?.approval.status ?? "draft")

  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop")
  /** Set while a palette item is being dragged — drives drop-zone visibility in the canvas. */
  const [paletteDragActive, setPaletteDragActive] = React.useState(false)

  /**
   * Snapshot of the doc as it last existed in English. We capture it before
   * translating to AR/bilingual so that toggling back to EN restores the
   * authored copy verbatim (we don't have a reliable AR→EN reverse).
   */
  const [englishSnapshot, setEnglishSnapshot] = React.useState<BuilderDocument | null>(null)

  // Undo/redo
  const [history, setHistory] = React.useState<BuilderDocument[]>([])
  const [future, setFuture] = React.useState<BuilderDocument[]>([])
  const [dirty, setDirty] = React.useState(false)

  // Dialog state
  const [openGpt, setOpenGpt] = React.useState(false)
  const [openInlineAi, setOpenInlineAi] = React.useState(false)
  const [openMergeTags, setOpenMergeTags] = React.useState(false)
  const [openConditional, setOpenConditional] = React.useState(false)
  const [openPreview, setOpenPreview] = React.useState(false)
  const [openAb, setOpenAb] = React.useState(false)
  const [openHistory, setOpenHistory] = React.useState(false)
  const [openCreateJourney, setOpenCreateJourney] = React.useState(false)

  const selectedBlock = React.useMemo<BuilderBlock | null>(() => {
    for (const r of doc.rows) {
      for (const c of r.columnsBlocks) {
        const b = c.find((bk) => bk.id === selectedBlockId)
        if (b) return b
      }
    }
    return null
  }, [doc, selectedBlockId])

  const playbook = playbooksV3.find((p) => p.id === playbookId)
  const lenderId = playbook?.lenderId ?? "general"

  // Mutation helpers — wrap state pushes for undo/redo + dirty tracking.
  function commit(next: BuilderDocument) {
    setHistory((h) => [...h, doc])
    setFuture([])
    setDoc(next)
    setDirty(true)
  }
  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setFuture((f) => [doc, ...f])
      setDoc(prev)
      return h.slice(0, -1)
    })
  }
  function redo() {
    setFuture((f) => {
      if (f.length === 0) return f
      const next = f[0]
      setHistory((h) => [...h, doc])
      setDoc(next)
      return f.slice(1)
    })
  }

  function handleInsertFromPalette(kind: BlockKind, moduleId?: string) {
    const { doc: nextDoc, newBlockId: newId } = insertBlockIntoDoc(doc, kind, moduleId, selectedBlockId)
    commit(nextDoc)
    setSelectedBlockId(newId)
  }

  /** Insert a palette block at a specific drop position in the canvas. */
  function handleInsertAt(
    kind: BlockKind,
    moduleId: string | undefined,
    rowId: string,
    col: number,
    index: number,
  ) {
    const newBlk = makeNewBlockForInsert(kind, moduleId)
    const rows = doc.rows.map((r) => {
      if (r.id !== rowId) return r
      if (r.locked) return r
      return {
        ...r,
        columnsBlocks: r.columnsBlocks.map((c, i) => {
          if (i !== col) return c
          const next = [...c]
          next.splice(index, 0, newBlk)
          return next
        }),
      }
    })
    commit({ ...doc, rows })
    setSelectedBlockId(newBlk.id)
  }

  function updateBlock(blockId: string, patch: Partial<BuilderBlock>) {
    const rows = doc.rows.map((r) => ({
      ...r,
      columnsBlocks: r.columnsBlocks.map((c) =>
        c.map((b) => (b.id === blockId ? ({ ...b, ...patch } as BuilderBlock) : b)),
      ),
    }))
    commit({ ...doc, rows })
  }

  function deleteBlock(blockId: string) {
    const rows = doc.rows.map((r) => ({
      ...r,
      columnsBlocks: r.columnsBlocks.map((c) => c.filter((b) => b.id !== blockId)),
    }))
    commit({ ...doc, rows })
    setSelectedBlockId(null)
  }

  function duplicateBlock(blockId: string) {
    let newId: string | null = null
    const rows = doc.rows.map((r) => ({
      ...r,
      columnsBlocks: r.columnsBlocks.map((c) => {
        const idx = c.findIndex((b) => b.id === blockId)
        if (idx < 0) return c
        const orig = c[idx]
        const copy = { ...orig, id: newBlockId() } as BuilderBlock
        newId = copy.id
        const next = [...c]
        next.splice(idx + 1, 0, copy)
        return next
      }),
    }))
    commit({ ...doc, rows })
    if (newId) setSelectedBlockId(newId)
  }

  function moveBlock(blockId: string, dir: "up" | "down") {
    const rows = doc.rows.map((r) => ({
      ...r,
      columnsBlocks: r.columnsBlocks.map((c) => {
        const idx = c.findIndex((b) => b.id === blockId)
        if (idx < 0) return c
        const target = dir === "up" ? idx - 1 : idx + 1
        if (target < 0 || target >= c.length) return c
        const next = [...c]
        ;[next[idx], next[target]] = [next[target], next[idx]]
        return next
      }),
    }))
    commit({ ...doc, rows })
  }

  function handleInsertRowsFromAi(
    rows: { id: string; columns: 1 | 2; columnsBlocks: BuilderBlock[][]; bg?: string; padding?: number; locked?: boolean }[],
    opts: { subject?: string; smsVariant?: string; replace: boolean },
  ) {
    const next: BuilderDocument = opts.replace ? { ...doc, rows } : { ...doc, rows: [...doc.rows, ...rows] }
    commit(next)
    if (opts.subject) {
      toast.success("AI-drafted email inserted", {
        description: `Subject suggestion: "${opts.subject}"`,
      })
    } else {
      toast.success("AI-drafted content inserted")
    }
  }

  function handleSaveTemplate() {
    setDirty(false)
    toast.success("Saved as template", {
      description: `${templateName} saved. Use it in Journey Builder, or send it directly.`,
    })
  }

  function handleSubmitForReview() {
    setStatus("in_review")
    toast.success("Submitted for review", {
      description: "Compliance maker/checker — Rabab Abbas notified.",
    })
  }
  function handleApprove() {
    setStatus("active")
    toast.success("Template published", {
      description: "Now available in Journey Builder and the Composer message picker.",
    })
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <BuilderToolbar
        templateName={templateName}
        onRename={setTemplateName}
        status={status}
        device={device}
        onDeviceChange={setDevice}
        language={doc.language}
        onLanguageChange={(target) => {
          if (target === doc.language) return

          // Capture an EN snapshot the first time we leave English. Future
          // EN edits done in bilingual mode go via the left column, so the
          // snapshot is only refreshed when explicitly back on EN.
          let snapshot = englishSnapshot
          if (doc.language === "en") {
            snapshot = doc
            setEnglishSnapshot(doc)
          }

          let next: BuilderDocument
          if (target === "en") {
            // Restore the last-known EN doc if we have one; otherwise just
            // flip the language flag.
            next = snapshot
              ? { ...snapshot, language: "en", dir: "ltr" }
              : { ...doc, language: "en", dir: "ltr" }
          } else if (target === "ar") {
            const source = snapshot ?? doc
            next = translateDocToArabic(source)
          } else {
            const source = snapshot ?? doc
            next = translateDocToBilingual(source)
          }
          commit(next)
        }}
        onUndo={undo}
        onRedo={redo}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        unsavedChanges={dirty}
        lastSavedAt={dirty ? undefined : new Date().toISOString()}
        onPreview={() => setOpenPreview(true)}
        onSaveAsTemplate={handleSaveTemplate}
        onSubmitForReview={handleSubmitForReview}
        onApprove={handleApprove}
        onOpenComposerGpt={() => setOpenGpt(true)}
        onOpenAbTest={() => setOpenAb(true)}
        onOpenVersionHistory={() => setOpenHistory(true)}
        onCreateJourney={() => setOpenCreateJourney(true)}
      />

      <div className="flex min-h-0 flex-1">
        <BlockPalette
          onInsert={handleInsertFromPalette}
          onPaletteDragStart={() => setPaletteDragActive(true)}
          onPaletteDragEnd={() => setPaletteDragActive(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto bg-zinc-900/40">
            <BuilderCanvas
              doc={doc}
              device={device}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              onDocChange={(d) => commit(d)}
              onDeleteBlock={deleteBlock}
              paletteDragActive={paletteDragActive}
              onInsertBlockAt={(kind, moduleId, rowId, col, index) => {
                handleInsertAt(kind, moduleId, rowId, col, index)
                setPaletteDragActive(false)
              }}
            />
          </div>
          <PlaybookLintBar playbook={playbook} doc={doc} />
        </div>

        <PropertiesPanel
          doc={doc}
          selectedBlock={selectedBlock}
          onUpdateBlock={updateBlock}
          onDeleteBlock={deleteBlock}
          onDuplicateBlock={duplicateBlock}
          onMoveBlock={moveBlock}
          onUpdateDoc={(patch) => commit({ ...doc, ...patch })}
          onOpenConditional={() => setOpenConditional(true)}
          onOpenInlineAi={() => setOpenInlineAi(true)}
          onOpenMergeTags={() => setOpenMergeTags(true)}
        />
      </div>

      {/* Dialogs */}
      <ComposerGptDialog
        open={openGpt}
        onClose={() => setOpenGpt(false)}
        playbookId={playbookId}
        lenderId={lenderId}
        language={doc.language}
        onInsertRows={handleInsertRowsFromAi}
      />
      <InlineAiDialog
        open={openInlineAi}
        onClose={() => setOpenInlineAi(false)}
        currentHtml={
          selectedBlock && selectedBlock.kind === "text"
            ? selectedBlock.html
            : "<p>Select a text block first.</p>"
        }
        onApply={(html) => {
          if (selectedBlock && selectedBlock.kind === "text") {
            updateBlock(selectedBlock.id, { html } as Partial<BuilderBlock>)
            toast.success("Block rewritten")
          }
        }}
      />
      <MergeTagDialog
        open={openMergeTags}
        onClose={() => setOpenMergeTags(false)}
        onInsert={(tag) => {
          if (selectedBlock && selectedBlock.kind === "text") {
            updateBlock(selectedBlock.id, {
              html: selectedBlock.html + " " + tag,
            } as Partial<BuilderBlock>)
          } else if (selectedBlock && selectedBlock.kind === "button") {
            updateBlock(selectedBlock.id, { label: selectedBlock.label + " " + tag } as Partial<BuilderBlock>)
          }
        }}
      />
      <ConditionalDialog
        open={openConditional}
        onClose={() => setOpenConditional(false)}
        block={selectedBlock}
        onSave={(cfg) => {
          if (selectedBlock) updateBlock(selectedBlock.id, { conditional: cfg } as Partial<BuilderBlock>)
        }}
      />
      <PreviewTestDialog
        open={openPreview}
        onClose={() => setOpenPreview(false)}
        doc={doc}
        renderCanvas={({ dark, width }) => (
          <BuilderCanvas
            doc={doc}
            device={width < 400 ? "mobile" : "desktop"}
            selectedBlockId={null}
            onSelectBlock={() => undefined}
            onDocChange={() => undefined}
            previewMode
            overrideWidth={width}
            overrideBg={dark ? "#0F172A" : doc.pageBg}
          />
        )}
      />
      <AbTestDialog open={openAb} onClose={() => setOpenAb(false)} templateId={templateId} />
      <VersionHistoryDialog open={openHistory} onClose={() => setOpenHistory(false)} templateId={templateId} />
      <CreateJourneyDialog
        open={openCreateJourney}
        onClose={() => setOpenCreateJourney(false)}
        templateName={templateName}
        audienceLabel={search?.get("audience") ?? "All matching borrowers (configure on next step)"}
        onConfirm={(blueprint) => {
          setOpenCreateJourney(false)
          const params = new URLSearchParams({
            from: "composer",
            blueprint,
            channel: "email",
            templateName,
            template: templateId,
            playbook: playbookId,
            audience: search?.get("audience") ?? "Composer audience",
          })
          router.push(`/journeys/new?${params.toString()}`)
        }}
      />
    </div>
  )
}
