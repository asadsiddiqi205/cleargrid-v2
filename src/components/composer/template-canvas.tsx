"use client"

import * as React from "react"
import { LayoutTemplate, Lock, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  richEmailTemplates,
  type RichEmailTemplate,
  type SlotValues,
} from "@/data/rich-email-templates"

interface TemplateCanvasProps {
  template: RichEmailTemplate | null
  slots: SlotValues
  activeSlotId: string | null
  onSlotClick: (id: string) => void
  onChooseTemplate: () => void
}

/**
 * The centre area of the email composer. Renders an empty state when no
 * template is selected, otherwise renders the locked template at 600px
 * content width on a neutral grey backdrop (so the white email body pops
 * against the dark Command chrome).
 *
 * Editable slots highlight on hover with a thin emerald outline + a label
 * tag, and clicking one selects it (the parent opens the SlotInspector).
 * Locked regions show a small lock affordance on hover.
 */
export function TemplateCanvas({
  template,
  slots,
  activeSlotId,
  onSlotClick,
  onChooseTemplate,
}: TemplateCanvasProps) {
  if (!template) {
    return <EmptyState onChooseTemplate={onChooseTemplate} />
  }

  return (
    <div className="flex h-full flex-col">
      {/* Helper bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card/30 px-5 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Pencil className="h-3.5 w-3.5 text-emerald-400" />
          <span>
            Editing locked template — you can change text, images and buttons.
          </span>
        </div>
        <button
          type="button"
          onClick={onChooseTemplate}
          className="text-[11px] text-primary hover:underline"
        >
          Change template
        </button>
      </div>

      {/* Canvas backdrop */}
      <div className="canvas-scroll relative flex-1 overflow-y-auto bg-zinc-900/50 px-6 py-8">
        <div
          className={cn(
            "template-render mx-auto",
            // Add hover/focus styling for slots + locked regions via a global rule
          )}
          style={{ maxWidth: 600 }}
        >
          {template.render({
            slots,
            activeSlotId,
            onSlotClick,
            interactive: true,
          })}
        </div>
      </div>

      {/* Scoped styles for slot hover + locked hover affordances */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .template-render [data-slot-id]:hover,
            .template-render [data-slot-id]:focus-visible {
              outline: 1.5px dashed #10b981 !important;
              outline-offset: 4px !important;
            }
            .template-render [data-slot-id]:hover::before,
            .template-render [data-slot-id]:focus-visible::before {
              content: attr(data-slot-label);
              position: absolute;
              top: -22px;
              left: 0;
              background: #10b981;
              color: #ffffff;
              font-size: 9.5px;
              font-weight: 600;
              padding: 2px 6px;
              border-radius: 4px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              pointer-events: none;
              white-space: nowrap;
              z-index: 10;
            }
            .template-render [data-slot-active="true"] {
              outline: 2px solid #10b981 !important;
              outline-offset: 4px !important;
            }
            .template-render [data-locked="true"] {
              position: relative;
            }
            .template-render [data-locked="true"]:hover {
              background: rgba(15, 23, 42, 0.025);
            }
            .template-render [data-locked="true"]:hover::after {
              content: attr(data-locked-label);
              position: absolute;
              top: 6px;
              right: 6px;
              background: rgba(15, 23, 42, 0.85);
              color: #ffffff;
              font-size: 9px;
              font-weight: 500;
              padding: 2px 6px 2px 18px;
              border-radius: 4px;
              white-space: nowrap;
              pointer-events: none;
              z-index: 10;
              background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='11' width='18' height='11' rx='2' ry='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>");
              background-repeat: no-repeat;
              background-position: 5px center;
            }
          `,
        }}
      />
    </div>
  )
}

function EmptyState({ onChooseTemplate }: { onChooseTemplate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card/50">
        <LayoutTemplate className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">No template selected</h3>
        <p className="max-w-sm text-xs text-muted-foreground">
          Pick a designer-approved template to start. You&apos;ll be able to edit text, images
          and buttons — everything else is locked.
        </p>
      </div>
      <Button onClick={onChooseTemplate} className="mt-1">
        Choose a template
      </Button>
      <p className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Lock className="h-2.5 w-2.5" />
        {richEmailTemplates.length} templates available
      </p>
    </div>
  )
}
