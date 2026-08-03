/**
 * Adapter: Composer registries → Journey Builder pickers.
 *
 * Journey Send Email / Send SMS nodes reference *real* Composer content:
 *   - Rich HTML email templates (from rich-email-templates.tsx)
 *   - Plain email + SMS + WhatsApp templates (from templates.ts)
 *   - Playbooks (from playbooks-v3.ts)
 *
 * This module normalizes those three separate registries into one shape
 * that the journey's template picker + preview + playbook selector can
 * consume without knowing which registry the entry came from.
 */

import { richEmailTemplates } from "./rich-email-templates"
import { templates as ALL_TEMPLATES, type TemplateChannel } from "./templates"
import { playbooksV3, type Playbook } from "./playbooks-v3"

export type ComposerTemplateStatus = "active" | "draft" | "archived"

export interface ComposerTemplateEntry {
  id: string
  name: string
  /** "email" for both rich + plain email templates. */
  channel: TemplateChannel
  lenderId: string
  lenderName: string
  status: ComposerTemplateStatus
  updatedAt: string
  /** What variant of source this is. */
  source: "rich" | "plain"
  /** Preview snippet — one line, plain text. */
  preview: string
  /** Playbook id this template maps to, if any. */
  playbookId?: string
  playbookName?: string
  /** Full body for preview rendering. */
  body: string
  subject?: string
}

/**
 * Return every active template matching the given channel. Combines rich +
 * plain sources; deduplicates by id (rich wins over plain for the same id).
 */
export function getComposerTemplatesForChannel(
  channel: TemplateChannel,
): ComposerTemplateEntry[] {
  const out: ComposerTemplateEntry[] = []
  const seen = new Set<string>()

  // Rich HTML templates only exist for email.
  if (channel === "email") {
    for (const t of richEmailTemplates) {
      if (seen.has(t.id)) continue
      seen.add(t.id)
      out.push({
        id: t.id,
        name: t.name,
        channel: "email",
        lenderId: t.lenderId,
        lenderName: lenderNameFor(t.lenderId),
        status: "active",
        updatedAt: new Date().toISOString(),
        source: "rich",
        preview:
          (t as { description?: string }).description ??
          "Rich HTML template authored in the v3 builder.",
        body: "",
      })
    }
  }

  for (const t of ALL_TEMPLATES) {
    if (t.channel !== channel) continue
    if (seen.has(t.id)) continue
    if (t.status === "archived") continue
    seen.add(t.id)
    out.push({
      id: t.id,
      name: t.name,
      channel: t.channel,
      lenderId: t.lenderId,
      lenderName: t.lenderName,
      status: t.status === "draft" ? "draft" : "active",
      updatedAt: t.updatedAt,
      source: "plain",
      preview: t.body.slice(0, 140),
      body: t.body,
      subject: t.subject,
    })
  }

  return out
}

/** Playbooks the Journey template picker can filter/label by. */
export function getComposerPlaybooks(): Playbook[] {
  return playbooksV3.filter((p) => p.status !== "archived")
}

/**
 * Extract all `{{merge.tag}}` references from a template body + subject.
 * Used by the prompt-attribute-lint on Validate.
 */
export function extractMergeTags(text: string): string[] {
  const matches = text.match(/\{\{\s*([^}]+?)\s*\}\}/g) ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of matches) {
    const inner = m.replace(/^\{\{\s*|\s*\}\}$/g, "")
    if (seen.has(inner)) continue
    seen.add(inner)
    out.push(inner)
  }
  return out
}

/**
 * Build the "prefill blob" used by the "Author full template in Composer" link.
 * The v3 builder accepts a base64-encoded JSON blob under `?prefill=` and
 * hydrates a new draft template from it.
 */
export function encodeTemplatePrefill(input: {
  name: string
  subject?: string
  body: string
  channel: TemplateChannel
  lenderId?: string
  purpose?: string
}): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(input))))
  } catch {
    // Fallback for non-browser contexts (SSR): plain JSON.
    return JSON.stringify(input)
  }
}

function lenderNameFor(id: string): string {
  const map: Record<string, string> = {
    "lnd-mashreq": "Mashreq Bank",
    "lnd-tamara": "Tamara",
    "lnd-cashnow": "CashNow",
    "lnd-enbd": "Emirates NBD",
    "lnd-fab": "FAB",
    general: "General",
  }
  return map[id] ?? id
}
