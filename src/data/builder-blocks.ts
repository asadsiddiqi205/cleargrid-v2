/**
 * Email-builder block model (Surface 1).
 *
 * The builder canvas renders an ordered list of rows. Each row holds
 * one column for the prototype (rows-with-columns is supported visually
 * by the renderer but most templates are single-column). Each row
 * contains one or more blocks of a typed kind:
 *
 *   text · image · button · divider · spacer · table · social · video ·
 *   custom_html · payment_link · saved_module · ai_conditional
 *
 * A block may carry a `locked` flag (compliance / brand) so the v1/v2
 * "publish with only certain regions editable" mode rides on top of
 * the v3 full builder. It may also carry a `conditional` config that
 * gates visibility per borrower attribute (Surface 5).
 */

export type BlockKind =
  | "text"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "table"
  | "social"
  | "video"
  | "custom_html"
  | "payment_link"
  | "saved_module"
  | "ai_conditional"

export interface ConditionalRule {
  /** Attribute key (from journey block-configs registry). */
  attributeId: string
  operator: "one_of" | "none_of" | "equals" | "not_equals" | "gte" | "lte"
  values: string[]
}

export interface ConditionalConfig {
  /** AND / OR across the rules array. */
  combine: "AND" | "OR"
  rules: ConditionalRule[]
  /** If false, the block is hidden when conditions match. Default true. */
  showWhenMatch: boolean
}

export interface BuilderBlockBase {
  id: string
  kind: BlockKind
  locked?: boolean
  /** Used by AI assist + conditional rendering. */
  conditional?: ConditionalConfig
  /** Optional named slot — used by saved-template re-skinning. */
  slotKey?: string
}

export interface TextBlock extends BuilderBlockBase {
  kind: "text"
  html: string
  align?: "left" | "center" | "right"
  fontSize?: number
}

export interface ImageBlock extends BuilderBlockBase {
  kind: "image"
  src: string
  alt: string
  href?: string
  width?: number
}

export interface ButtonBlock extends BuilderBlockBase {
  kind: "button"
  label: string
  href: string
  bg: string
  color: string
  align?: "left" | "center" | "right"
}

export interface PaymentLinkBlock extends BuilderBlockBase {
  kind: "payment_link"
  label: string
  /** Conversion event id this block reports against. */
  conversionEvent: "payment_initiated" | "ptp_captured" | "settlement_accepted"
  bg: string
  color: string
  /** Sub-line shown below the button (e.g. "Tap to pay AED {{amount_due}}"). */
  subline?: string
}

export interface DividerBlock extends BuilderBlockBase {
  kind: "divider"
  color: string
  thickness: number
}

export interface SpacerBlock extends BuilderBlockBase {
  kind: "spacer"
  height: number
}

export interface TableBlock extends BuilderBlockBase {
  kind: "table"
  headers: string[]
  rows: string[][]
}

export interface SocialBlock extends BuilderBlockBase {
  kind: "social"
  platforms: Array<"facebook" | "twitter" | "linkedin" | "instagram">
}

export interface VideoBlock extends BuilderBlockBase {
  kind: "video"
  thumbnailUrl: string
  href: string
  caption?: string
}

export interface CustomHtmlBlock extends BuilderBlockBase {
  kind: "custom_html"
  html: string
}

export interface SavedModuleBlock extends BuilderBlockBase {
  kind: "saved_module"
  moduleId: string
}

export interface AiConditionalBlock extends BuilderBlockBase {
  kind: "ai_conditional"
  /** Two variants the conditional swaps between. */
  variantA: BuilderBlock[]
  variantB: BuilderBlock[]
  /** Free-text rule label shown in the canvas. */
  ruleLabel: string
}

export type BuilderBlock =
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | PaymentLinkBlock
  | DividerBlock
  | SpacerBlock
  | TableBlock
  | SocialBlock
  | VideoBlock
  | CustomHtmlBlock
  | SavedModuleBlock
  | AiConditionalBlock

export interface BuilderRow {
  id: string
  /** Column count — 1 or 2 for the prototype. */
  columns: 1 | 2
  /** Blocks for each column, in order. */
  columnsBlocks: BuilderBlock[][]
  /** Per-row background colour. */
  bg?: string
  /** Per-row padding (px). */
  padding?: number
  /** RTL direction override (else inherits from doc language). */
  dir?: "ltr" | "rtl"
  /** Locks the entire row (no add/remove blocks inside it). */
  locked?: boolean
}

export interface BuilderDocument {
  id: string
  rows: BuilderRow[]
  /** Document-level language; bilingual emits two parallel columns per row. */
  language: "en" | "ar" | "bilingual"
  /** Document-level RTL direction (auto-derived from language for ar). */
  dir: "ltr" | "rtl"
  /** Bg + width of the email page itself. */
  pageBg: string
  contentWidth: number
}

/** Block-palette catalogue (the left rail). */
export const BLOCK_CATALOG: Array<{
  kind: BlockKind
  label: string
  description: string
  /** Lucide icon name (string for serialisation). */
  iconName: string
  /** "Featured" blocks render at the top of the palette. */
  featured?: boolean
}> = [
  { kind: "text", label: "Text", description: "Headings, paragraphs, lists", iconName: "Type", featured: true },
  { kind: "image", label: "Image", description: "Single image with optional link", iconName: "Image", featured: true },
  { kind: "button", label: "Button", description: "Standard CTA button", iconName: "MousePointerClick" },
  {
    kind: "payment_link",
    label: "Payment link",
    description: "First-class trackable payment CTA — auto-resolves {{payment_link}} per borrower",
    iconName: "CircleDollarSign",
    featured: true,
  },
  { kind: "divider", label: "Divider", description: "Horizontal line", iconName: "Minus" },
  { kind: "spacer", label: "Spacer", description: "Vertical whitespace", iconName: "MoveVertical" },
  { kind: "table", label: "Table", description: "Payment schedule or breakdown", iconName: "TableProperties" },
  { kind: "social", label: "Social", description: "Lender social icons row", iconName: "Share2" },
  { kind: "video", label: "Video", description: "Linked video thumbnail", iconName: "Video" },
  { kind: "custom_html", label: "Custom HTML", description: "Advanced — raw HTML snippet", iconName: "Code2" },
  { kind: "saved_module", label: "Saved module", description: "Re-use a saved/synced module", iconName: "Library", featured: true },
  { kind: "ai_conditional", label: "Conditional", description: "Attribute-driven A/B swap", iconName: "GitBranchPlus" },
]

// ───────── Helpers ─────────

let nextId = 1000
export function newBlockId(): string {
  nextId += 1
  return `blk-${nextId}`
}
let nextRowId = 1000
export function newRowId(): string {
  nextRowId += 1
  return `row-${nextRowId}`
}

// ───────── Sample documents ─────────

export const SAMPLE_DOCS: Record<string, BuilderDocument> = {
  "doc-mashreq-reminder": {
    id: "doc-mashreq-reminder",
    language: "en",
    dir: "ltr",
    pageBg: "#F1F5F9",
    contentWidth: 600,
    rows: [
      {
        id: "row-1",
        columns: 1,
        locked: true,
        columnsBlocks: [
          [
            {
              id: "blk-1",
              kind: "saved_module",
              moduleId: "sm-mashreq-header",
              locked: true,
            },
          ],
        ],
      },
      {
        id: "row-2",
        columns: 1,
        padding: 28,
        bg: "#FFFFFF",
        columnsBlocks: [
          [
            {
              id: "blk-2",
              kind: "text",
              html: "<h1 style='margin:0 0 12px;font-size:22px;font-weight:700;color:#0F172A;'>Payment Reminder</h1><p style='margin:0;color:#0F172A;line-height:1.6;'>Dear Mr./Ms. {{borrower_name}},<br/><br/>This is a reminder that your installment of <strong>AED {{amount_due}}</strong> for account <strong>{{account_number}}</strong> was due on <strong>{{due_date}}</strong>.</p>",
              slotKey: "body",
            },
            {
              id: "blk-3",
              kind: "spacer",
              height: 20,
            },
            {
              id: "blk-4",
              kind: "payment_link",
              label: "Make Payment",
              conversionEvent: "payment_initiated",
              bg: "#F26521",
              color: "#FFFFFF",
              subline: "Tap to pay AED {{amount_due}} now",
              slotKey: "primary_cta",
            },
            {
              id: "blk-5",
              kind: "spacer",
              height: 24,
            },
            {
              id: "blk-6",
              kind: "text",
              html: "<p style='margin:0;color:#475569;font-size:13px;line-height:1.6;'>If you've already made this payment, please disregard this notice. Questions? Reply to this email or call us.</p>",
              slotKey: "secondary_body",
            },
          ],
        ],
      },
      {
        id: "row-3",
        columns: 1,
        locked: true,
        columnsBlocks: [
          [
            {
              id: "blk-7",
              kind: "saved_module",
              moduleId: "sm-cbuae-disclaimer",
              locked: true,
            },
            {
              id: "blk-8",
              kind: "saved_module",
              moduleId: "sm-mashreq-footer",
              locked: true,
            },
          ],
        ],
      },
    ],
  },
  "doc-tamara-friendly": {
    id: "doc-tamara-friendly",
    language: "en",
    dir: "ltr",
    pageBg: "#F9FAFB",
    contentWidth: 600,
    rows: [
      {
        id: "row-t1",
        columns: 1,
        locked: true,
        columnsBlocks: [
          [{ id: "blk-th", kind: "saved_module", moduleId: "sm-tamara-header", locked: true }],
        ],
      },
      {
        id: "row-t2",
        columns: 1,
        padding: 28,
        bg: "#FFFFFF",
        columnsBlocks: [
          [
            {
              id: "blk-tg",
              kind: "text",
              html: "<h1 style='margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;'>Hey {{borrower_name}}! 👋</h1><p style='margin:0;color:#111827;line-height:1.6;'>Quick reminder — you have a payment of <strong>AED {{amount_due}}</strong> due. No stress, sort it in a few taps:</p>",
              slotKey: "greeting",
            },
            { id: "blk-tsp", kind: "spacer", height: 18 },
            {
              id: "blk-tcta",
              kind: "payment_link",
              label: "Pay Now",
              conversionEvent: "payment_initiated",
              bg: "#10B981",
              color: "#0F172A",
              subline: "Done in 10 seconds",
            },
            {
              id: "blk-tcond",
              kind: "ai_conditional",
              ruleLabel: "If borrower has open PTP → show PTP-respect copy instead",
              variantA: [],
              variantB: [],
            },
            { id: "blk-tsp2", kind: "spacer", height: 24 },
            {
              id: "blk-tf",
              kind: "text",
              html: "<p style='margin:0;color:#6B7280;font-size:13px;line-height:1.6;'>Need help? Just reply. We're here.</p>",
            },
          ],
        ],
      },
      {
        id: "row-t3",
        columns: 1,
        locked: true,
        columnsBlocks: [[{ id: "blk-tf2", kind: "saved_module", moduleId: "sm-tamara-footer", locked: true }]],
      },
    ],
  },
  "doc-bilingual-reminder": {
    id: "doc-bilingual-reminder",
    language: "bilingual",
    dir: "ltr",
    pageBg: "#F8FAFC",
    contentWidth: 640,
    rows: [
      {
        id: "row-b1",
        columns: 2,
        bg: "#FFFFFF",
        padding: 28,
        columnsBlocks: [
          [
            {
              id: "blk-b1en",
              kind: "text",
              html: "<h2 style='margin:0 0 10px;font-size:18px;color:#0F172A;'>Payment Reminder</h2><p style='margin:0;color:#0F172A;line-height:1.6;'>Dear {{borrower_name}}, your installment of AED {{amount_due}} was due on {{due_date}}.</p>",
            },
            { id: "blk-b1cta", kind: "payment_link", label: "Make Payment", conversionEvent: "payment_initiated", bg: "#0EA5E9", color: "#FFFFFF" },
          ],
          [
            {
              id: "blk-b1ar",
              kind: "text",
              html: "<h2 style='margin:0 0 10px;font-size:18px;color:#0F172A;direction:rtl;text-align:right;'>تذكير بالدفع</h2><p style='margin:0;color:#0F172A;line-height:1.6;direction:rtl;text-align:right;'>عزيزي {{borrower_name}}، استحق قسطك بقيمة {{amount_due}} درهم بتاريخ {{due_date}}.</p>",
            },
            { id: "blk-b1ctaar", kind: "payment_link", label: "ادفع الآن", conversionEvent: "payment_initiated", bg: "#0EA5E9", color: "#FFFFFF" },
          ],
        ],
      },
    ],
  },
}

export function getSampleDoc(id: string): BuilderDocument | undefined {
  return SAMPLE_DOCS[id]
}

/** Default empty doc for "Start from blank". */
export function newBlankDoc(): BuilderDocument {
  return {
    id: `doc-${newBlockId()}`,
    language: "en",
    dir: "ltr",
    pageBg: "#F1F5F9",
    contentWidth: 600,
    rows: [
      {
        id: newRowId(),
        columns: 1,
        bg: "#FFFFFF",
        padding: 28,
        columnsBlocks: [
          [
            {
              id: newBlockId(),
              kind: "text",
              html: "<h1 style='margin:0 0 12px;font-size:22px;font-weight:700;color:#0F172A;'>Start writing here</h1><p style='margin:0;color:#0F172A;line-height:1.6;'>Drag blocks from the left rail, or ask Composer GPT to draft this email for you.</p>",
            },
          ],
        ],
      },
    ],
  }
}

