/**
 * ClearGrid Design System — typography scale.
 *
 * Values match the Figma design system verbatim. Consumed by
 * `globals.css` via the `@theme inline` block so the corresponding
 * Tailwind utility (e.g. `text-heading-lg`) resolves to the correct
 * font-size, line-height, weight, and tracking.
 *
 * Arabic (Tajawal) uses the same size scale — the html `dir="rtl"`
 * switches the runtime font-family and adjusts line-height via CSS.
 */

export const fontFamily = {
  latin: "'Geist', system-ui, sans-serif",
  arabic: "'Tajawal', system-ui, sans-serif",
  mono: "'Geist Mono', 'JetBrains Mono', monospace",
} as const

export interface TypeToken {
  family: "latin" | "arabic" | "mono"
  weight: number
  size: string
  lineHeight: string
  letterSpacing: string
}

export const typography: Record<string, TypeToken> = {
  "display-2xl": { family: "latin", weight: 600, size: "48px", lineHeight: "120%", letterSpacing: "-0.4px" },
  "display-xl": { family: "latin", weight: 600, size: "40px", lineHeight: "125%", letterSpacing: "-0.3px" },
  "display-lg": { family: "latin", weight: 600, size: "32px", lineHeight: "130%", letterSpacing: "-0.2px" },
  "display-md": { family: "latin", weight: 600, size: "28px", lineHeight: "130%", letterSpacing: "-0.2px" },
  "display-sm": { family: "latin", weight: 600, size: "24px", lineHeight: "130%", letterSpacing: "0" },
  "heading-xl": { family: "latin", weight: 600, size: "22px", lineHeight: "128%", letterSpacing: "-0.1px" },
  "heading-lg": { family: "latin", weight: 600, size: "18px", lineHeight: "130%", letterSpacing: "0" },
  "heading-md": { family: "latin", weight: 600, size: "16px", lineHeight: "130%", letterSpacing: "0" },
  "heading-sm": { family: "latin", weight: 600, size: "14px", lineHeight: "130%", letterSpacing: "0" },
  "title-lg": { family: "latin", weight: 500, size: "16px", lineHeight: "130%", letterSpacing: "0" },
  "title-md": { family: "latin", weight: 500, size: "14px", lineHeight: "130%", letterSpacing: "0" },
  "body-lg": { family: "latin", weight: 400, size: "16px", lineHeight: "150%", letterSpacing: "0" },
  "body-md": { family: "latin", weight: 400, size: "14px", lineHeight: "150%", letterSpacing: "0" },
  "body-sm": { family: "latin", weight: 400, size: "13px", lineHeight: "150%", letterSpacing: "0" },
  "body-xs": { family: "latin", weight: 400, size: "12px", lineHeight: "150%", letterSpacing: "0" },
  "body-strong-lg": { family: "latin", weight: 500, size: "16px", lineHeight: "150%", letterSpacing: "0" },
  "body-strong-md": { family: "latin", weight: 500, size: "14px", lineHeight: "150%", letterSpacing: "0" },
  "label-md": { family: "latin", weight: 500, size: "13px", lineHeight: "130%", letterSpacing: "0.1px" },
  "label-sm": { family: "latin", weight: 500, size: "12px", lineHeight: "130%", letterSpacing: "0.2px" },
  "label-xs": { family: "latin", weight: 500, size: "11px", lineHeight: "130%", letterSpacing: "0.3px" },
  "caption-md": { family: "latin", weight: 400, size: "12px", lineHeight: "140%", letterSpacing: "0" },
  "caption-sm": { family: "latin", weight: 400, size: "11px", lineHeight: "140%", letterSpacing: "0" },
  "button-md": { family: "latin", weight: 500, size: "14px", lineHeight: "100%", letterSpacing: "0" },
  "button-sm": { family: "latin", weight: 500, size: "12px", lineHeight: "100%", letterSpacing: "0" },
  "nav-md": { family: "latin", weight: 500, size: "14px", lineHeight: "130%", letterSpacing: "-0.2px" },
  "data-md": { family: "latin", weight: 400, size: "13px", lineHeight: "140%", letterSpacing: "0" },
  "data-sm": { family: "latin", weight: 400, size: "12px", lineHeight: "140%", letterSpacing: "0" },
  "mono-md": { family: "mono", weight: 400, size: "13px", lineHeight: "140%", letterSpacing: "0" },
  "mono-sm": { family: "mono", weight: 400, size: "11px", lineHeight: "140%", letterSpacing: "0" },
}
