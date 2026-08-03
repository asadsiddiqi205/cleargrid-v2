/**
 * Brand kits — per-lender visual identity inherited by every template.
 *
 * Authored once per lender, applied automatically when the composer is
 * scoped to that lender. Templates can override colours/fonts per-block
 * but inherit defaults from here.
 */

export interface BrandKit {
  id: string
  lenderId: string
  lenderName: string
  /** Public-facing logo URL or sample placeholder. */
  logoUrl: string
  /** Optional dark-mode logo (used by clients that auto-invert). */
  logoDarkUrl?: string
  colors: {
    primary: string
    primaryText: string
    secondary: string
    background: string
    surface: string
    text: string
    muted: string
    success: string
    danger: string
    border: string
  }
  fonts: {
    heading: string
    body: string
    cssImport?: string
  }
  /** Default footer (legal + opt-out) auto-inserted as a locked module. */
  defaultFooterHtml: string
  /** Optional default header. */
  defaultHeaderHtml?: string
  status: "active" | "draft"
  updatedAt: string
}

export const brandKits: BrandKit[] = [
  {
    id: "bk-mashreq",
    lenderId: "lnd-mashreq",
    lenderName: "Mashreq Bank",
    logoUrl: "https://logo.clearbit.com/mashreqbank.com",
    colors: {
      primary: "#F26521",
      primaryText: "#FFFFFF",
      secondary: "#1F2A37",
      background: "#FFFFFF",
      surface: "#F8FAFC",
      text: "#0F172A",
      muted: "#475569",
      success: "#16A34A",
      danger: "#DC2626",
      border: "#E2E8F0",
    },
    fonts: {
      heading: "Inter, Helvetica, Arial, sans-serif",
      body: "Inter, Helvetica, Arial, sans-serif",
    },
    defaultFooterHtml:
      "Mashreq Bank PSC. Licensed and regulated by the Central Bank of the UAE. P.O. Box 1250, Dubai, UAE.",
    status: "active",
    updatedAt: "2026-05-30T10:00:00Z",
  },
  {
    id: "bk-tamara",
    lenderId: "lnd-tamara",
    lenderName: "Tamara",
    logoUrl: "https://logo.clearbit.com/tamara.co",
    colors: {
      primary: "#10B981",
      primaryText: "#0F172A",
      secondary: "#F3F4F6",
      background: "#FFFFFF",
      surface: "#F9FAFB",
      text: "#111827",
      muted: "#6B7280",
      success: "#10B981",
      danger: "#EF4444",
      border: "#E5E7EB",
    },
    fonts: {
      heading: "Inter, sans-serif",
      body: "Inter, sans-serif",
    },
    defaultFooterHtml:
      "Tamara — Pay later, your way. Don't want these? Reply STOP. Tamara Financing Solutions, Dubai, UAE.",
    status: "active",
    updatedAt: "2026-05-28T14:00:00Z",
  },
  {
    id: "bk-cashnow",
    lenderId: "lnd-cashnow",
    lenderName: "CashNow",
    logoUrl: "https://logo.clearbit.com/cashnow.com",
    colors: {
      primary: "#0EA5E9",
      primaryText: "#FFFFFF",
      secondary: "#0F172A",
      background: "#FFFFFF",
      surface: "#F1F5F9",
      text: "#0F172A",
      muted: "#64748B",
      success: "#22C55E",
      danger: "#EF4444",
      border: "#CBD5E1",
    },
    fonts: {
      heading: "Inter, sans-serif",
      body: "Inter, sans-serif",
    },
    defaultFooterHtml:
      "CashNow Finance. May be reported to Al Etihad Credit Bureau. Reply STOP to opt out.",
    status: "active",
    updatedAt: "2026-05-21T09:00:00Z",
  },
  {
    id: "bk-enbd",
    lenderId: "lnd-enbd",
    lenderName: "Emirates NBD",
    logoUrl: "https://logo.clearbit.com/emiratesnbd.com",
    colors: {
      primary: "#C8102E",
      primaryText: "#FFFFFF",
      secondary: "#1F2937",
      background: "#FFFFFF",
      surface: "#F9FAFB",
      text: "#111827",
      muted: "#4B5563",
      success: "#059669",
      danger: "#DC2626",
      border: "#E5E7EB",
    },
    fonts: {
      heading: "Inter, sans-serif",
      body: "Inter, sans-serif",
    },
    defaultFooterHtml:
      "Emirates NBD Bank PJSC. Regulated by the Central Bank of the UAE. P.O. Box 777, Dubai, UAE.",
    status: "active",
    updatedAt: "2026-05-25T16:00:00Z",
  },
  {
    id: "bk-fab",
    lenderId: "lnd-fab",
    lenderName: "FAB",
    logoUrl: "https://logo.clearbit.com/bankfab.com",
    colors: {
      primary: "#003C71",
      primaryText: "#FFFFFF",
      secondary: "#1E3A5F",
      background: "#FFFFFF",
      surface: "#F8FAFC",
      text: "#0F172A",
      muted: "#475569",
      success: "#16A34A",
      danger: "#DC2626",
      border: "#CBD5E1",
    },
    fonts: {
      heading: "Inter, sans-serif",
      body: "Inter, sans-serif",
    },
    defaultFooterHtml:
      "First Abu Dhabi Bank PJSC. Licensed by the Central Bank of the UAE.",
    status: "active",
    updatedAt: "2026-06-01T09:30:00Z",
  },
  {
    id: "bk-cleargrid",
    lenderId: "general",
    lenderName: "ClearGrid",
    logoUrl: "/cleargrid-logo.svg",
    colors: {
      primary: "#10B981",
      primaryText: "#FFFFFF",
      secondary: "#0F172A",
      background: "#FFFFFF",
      surface: "#F9FAFB",
      text: "#0F172A",
      muted: "#6B7280",
      success: "#10B981",
      danger: "#EF4444",
      border: "#E5E7EB",
    },
    fonts: {
      heading: "Inter, sans-serif",
      body: "Inter, sans-serif",
    },
    defaultFooterHtml:
      "ClearGrid Collections. To stop receiving these notifications, reply STOP or visit cleargrid.co/preferences.",
    status: "active",
    updatedAt: "2026-05-20T11:00:00Z",
  },
]

export function getBrandKitByLenderId(lenderId: string): BrandKit | undefined {
  return brandKits.find((b) => b.lenderId === lenderId)
}

export function getBrandKitById(id: string): BrandKit | undefined {
  return brandKits.find((b) => b.id === id)
}
