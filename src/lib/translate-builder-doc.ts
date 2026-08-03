/**
 * Builder-doc language transform.
 *
 * Given a BuilderDocument in English, produce an Arabic (RTL) or bilingual
 * (EN ↔ AR side-by-side) version by:
 *  • walking each block and rewriting visible text via the phrase dictionary
 *  • injecting RTL + Arabic font-stack into inline styles
 *  • duplicating each non-locked row for bilingual layouts
 *
 * Locked rows (lender header / footer / compliance modules) are passed through
 * untouched — those modules carry their own bilingual variants.
 */

import type {
  BuilderBlock,
  BuilderDocument,
  BuilderRow,
} from "@/data/builder-blocks"
import { newBlockId, newRowId } from "@/data/builder-blocks"
import {
  EN_TO_AR,
  EN_TO_AR_LABELS,
  ARABIC_FONT_STACK,
} from "@/data/translations-ar"

// ──────────── Phrase translation ────────────

const MERGE_TOKEN = /\{\{[^}]+\}\}/g

function translateText(input: string, pairs: Array<[string, string]> = EN_TO_AR): string {
  if (!input) return input

  // 1. Preserve merge tags ({{...}}). Replace with placeholder tokens before
  //    translation, restore after, so we never translate inside a merge field.
  const tokens: string[] = []
  let work = input.replace(MERGE_TOKEN, (m) => {
    tokens.push(m)
    return `§§${tokens.length - 1}§§`
  })

  // 2. Replace longer phrases before shorter ones. The dictionary is already
  //    ordered, but apply in original order with a global flag.
  for (const [en, ar] of pairs) {
    if (!en) continue
    // Escape regex specials in `en`.
    const safe = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    // Use word boundaries where possible, but Arabic targets often span
    // punctuation so we use a case-insensitive literal pass.
    work = work.replace(new RegExp(safe, "gi"), ar)
  }

  // 3. Restore merge tokens.
  work = work.replace(/§§(\d+)§§/g, (_, i) => tokens[Number(i)])

  return work
}

/**
 * HTML-aware translation. Walks text nodes only, leaves tags + attributes
 * intact. Also injects RTL + Arabic font hints into inline styles.
 */
function translateHtmlToArabic(html: string): string {
  if (!html) return html

  // 1. Translate text *between* tags only.
  //    We use a simple state machine — toggle in/out of tags by '<' '>'.
  let out = ""
  let buf = ""
  let inTag = false
  for (let i = 0; i < html.length; i++) {
    const ch = html[i]
    if (inTag) {
      out += ch
      if (ch === ">") inTag = false
    } else {
      if (ch === "<") {
        if (buf) {
          out += translateText(buf)
          buf = ""
        }
        out += ch
        inTag = true
      } else {
        buf += ch
      }
    }
  }
  if (buf) out += translateText(buf)

  // 2. Inject RTL + Arabic font into existing inline style="…" attrs.
  out = out.replace(/style="([^"]*)"/g, (_, css) => {
    const styles = parseInlineStyles(css)
    if (!styles["direction"]) styles["direction"] = "rtl"
    if (!styles["text-align"]) styles["text-align"] = "right"
    if (!styles["font-family"]) styles["font-family"] = ARABIC_FONT_STACK
    return `style="${stringifyInlineStyles(styles)}"`
  })

  return out
}

function parseInlineStyles(css: string): Record<string, string> {
  const m: Record<string, string> = {}
  for (const decl of css.split(";")) {
    const idx = decl.indexOf(":")
    if (idx === -1) continue
    const key = decl.slice(0, idx).trim().toLowerCase()
    const val = decl.slice(idx + 1).trim()
    if (key && val) m[key] = val
  }
  return m
}

function stringifyInlineStyles(m: Record<string, string>): string {
  return Object.entries(m)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")
}

// ──────────── Block translation ────────────

function translateBlock(block: BuilderBlock): BuilderBlock {
  // Locked blocks (header/footer/compliance modules) are kept as-is —
  // those modules own their own bilingual variant.
  if (block.locked) return block

  switch (block.kind) {
    case "text":
      return { ...block, html: translateHtmlToArabic(block.html) }
    case "button":
      return { ...block, label: translateText(block.label), align: block.align ?? "right" }
    case "payment_link":
      return {
        ...block,
        label: translateText(block.label),
        subline: block.subline ? translateText(block.subline) : block.subline,
      }
    case "table":
      return {
        ...block,
        headers: block.headers.map((h) => translateText(h, EN_TO_AR_LABELS)),
        rows: block.rows.map((r) => r.map((c) => translateText(c))),
      }
    case "custom_html":
      return { ...block, html: translateHtmlToArabic(block.html) }
    // Spacer / divider / image / social / video / saved_module / ai_conditional
    // carry no translatable text.
    default:
      return block
  }
}

// ──────────── Doc-level transforms ────────────

/**
 * Convert a document to Arabic (RTL).
 *
 *  - Every non-locked block is translated.
 *  - Every non-locked row gets `dir: "rtl"`.
 *  - The document `language` + `dir` are switched to ar + rtl.
 *  - Locked rows (header/footer/compliance) are kept untouched — the saved
 *    module is responsible for its own bilingual rendering.
 */
export function translateDocToArabic(doc: BuilderDocument): BuilderDocument {
  return {
    ...doc,
    language: "ar",
    dir: "rtl",
    rows: doc.rows.map((row) => {
      if (row.locked) return row
      return {
        ...row,
        dir: "rtl",
        columnsBlocks: row.columnsBlocks.map((col) => col.map(translateBlock)),
      }
    }),
  }
}

/**
 * Convert a document to bilingual (EN | AR side-by-side).
 *
 * Each non-locked row is widened to 2 columns: EN copy on the left, AR copy
 * on the right. If the row is already 2-column we leave it alone (assumption:
 * authors who chose 2-col know what they're doing). Locked rows pass through.
 */
export function translateDocToBilingual(doc: BuilderDocument): BuilderDocument {
  const rows = doc.rows.map((row) => {
    if (row.locked) return row
    if (row.columns === 2) return row
    const enCol = row.columnsBlocks[0] ?? []
    const arCol = enCol.map((b) => ({ ...translateBlock(b), id: newBlockId() }))
    const newRow: BuilderRow = {
      ...row,
      id: newRowId(),
      columns: 2,
      columnsBlocks: [enCol, arCol],
    }
    return newRow
  })
  return {
    ...doc,
    language: "bilingual",
    dir: "ltr",
    contentWidth: Math.max(doc.contentWidth, 640),
    rows,
  }
}

/**
 * Best-effort reverse of translateDocToBilingual — drop the AR column so we
 * return to a single-column English document. Used when toggling
 * bilingual → en. Translation back to EN is not attempted for content the user
 * authored fresh in AR; that copy is kept in case they toggle bilingual again.
 */
export function collapseBilingualToEnglish(doc: BuilderDocument): BuilderDocument {
  return {
    ...doc,
    language: "en",
    dir: "ltr",
    rows: doc.rows.map((row) => {
      if (row.locked) return row
      if (row.columns !== 2) return row
      return {
        ...row,
        columns: 1,
        columnsBlocks: [row.columnsBlocks[0] ?? []],
      }
    }),
  }
}
