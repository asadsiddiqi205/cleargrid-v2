/**
 * Sender profiles — governed sender identity for outbound campaigns.
 *
 * Admin-managed. The composer picks from an approved list (filtered by the
 * campaign's lender) — no free-typing of from-name / from-email / domain.
 *
 * Each profile carries the ESP/route that will actually send the mail, so
 * KSA-vs-UAE routing lives here, not on the campaign.
 */

/** ESP / delivery route options. Admin-selected per profile. */
export type EspRoute = "infobip_uae" | "infobip_ksa" | "sendgrid" | "ses"

export const ESP_LABEL: Record<EspRoute, string> = {
  infobip_uae: "Infobip · UAE",
  infobip_ksa: "Infobip · KSA",
  sendgrid: "SendGrid",
  ses: "Amazon SES",
}

export interface SendingDomain {
  domain: string
  /** Verification state — real DNS check would run in prod; stubbed here. */
  verified: boolean
  /** ISO timestamp for last verification check. */
  verifiedAt?: string
  /** SPF / DKIM / DMARC state (stubbed granular flags for the admin panel). */
  spf: "pass" | "fail" | "pending"
  dkim: "pass" | "fail" | "pending"
  dmarc: "pass" | "fail" | "pending"
}

export interface SenderProfile {
  id: string
  /** Lender scope. `"general"` is cross-lender. */
  lenderId: string
  lenderName: string
  /** Display label shown in the composer picker. */
  name: string
  fromName: string
  fromEmail: string
  replyTo: string
  /** Optional CC / BCC — governed at the profile level, not per-campaign. */
  cc?: string[]
  bcc?: string[]
  /** The sending domain the from-email lives on, plus its verification state. */
  domain: SendingDomain
  /** Which ESP/route will actually deliver mail through this profile. */
  esp: EspRoute
  /** Active profiles are pickable in the composer; inactive are hidden. */
  status: "active" | "inactive"
  /** Short admin note visible in the picker (e.g. purpose, do-not-use hints). */
  description?: string
  createdAt: string
  updatedAt: string
  updatedBy: string
}

/* ─────────────────────────── Seeded profiles ─────────────────────────── */

export const senderProfiles: SenderProfile[] = [
  {
    id: "sp-mashreq-collections",
    lenderId: "lnd-mashreq",
    lenderName: "Mashreq Bank",
    name: "Mashreq Collections",
    fromName: "Mashreq Collections",
    fromEmail: "collections@mashreq.com",
    replyTo: "collections-reply@mashreq.com",
    cc: [],
    bcc: ["compliance-log@mashreq.com"],
    domain: {
      domain: "mashreq.com",
      verified: true,
      verifiedAt: "2026-05-20T09:14:00Z",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass",
    },
    esp: "infobip_uae",
    status: "active",
    description: "Primary Mashreq collections sender — UAE routing.",
    createdAt: "2026-04-01T10:00:00Z",
    updatedAt: "2026-05-20T09:14:00Z",
    updatedBy: "Rabab Abbas",
  },
  {
    id: "sp-mashreq-care",
    lenderId: "lnd-mashreq",
    lenderName: "Mashreq Bank",
    name: "Mashreq Customer Care",
    fromName: "Mashreq Customer Care",
    fromEmail: "care@mashreq.com",
    replyTo: "care@mashreq.com",
    domain: {
      domain: "mashreq.com",
      verified: true,
      verifiedAt: "2026-05-20T09:14:00Z",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass",
    },
    esp: "infobip_uae",
    status: "active",
    description: "Softer voice — hardship + welcome outreach.",
    createdAt: "2026-04-01T10:00:00Z",
    updatedAt: "2026-05-20T09:14:00Z",
    updatedBy: "Rabab Abbas",
  },
  {
    id: "sp-tamara-care",
    lenderId: "lnd-tamara",
    lenderName: "Tamara",
    name: "Tamara Care",
    fromName: "Tamara Care",
    fromEmail: "care@tamara.co",
    replyTo: "care@tamara.co",
    domain: {
      domain: "tamara.co",
      verified: true,
      verifiedAt: "2026-05-18T14:00:00Z",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass",
    },
    esp: "sendgrid",
    status: "active",
    description: "Default Tamara sender — friendly BNPL voice.",
    createdAt: "2026-04-02T11:00:00Z",
    updatedAt: "2026-05-18T14:00:00Z",
    updatedBy: "Asad Siddiqi",
  },
  {
    id: "sp-tamara-ksa",
    lenderId: "lnd-tamara",
    lenderName: "Tamara",
    name: "Tamara KSA (Arabic)",
    fromName: "Tamara",
    fromEmail: "hello@tamara.sa",
    replyTo: "hello@tamara.sa",
    domain: {
      domain: "tamara.sa",
      verified: true,
      verifiedAt: "2026-06-01T10:00:00Z",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass",
    },
    esp: "infobip_ksa",
    status: "active",
    description: "KSA sender — routes via Infobip KSA for local deliverability.",
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    updatedBy: "Khalil Ahmed",
  },
  {
    id: "sp-cashnow-collections",
    lenderId: "lnd-cashnow",
    lenderName: "CashNow",
    name: "CashNow Collections",
    fromName: "CashNow",
    fromEmail: "collections@cashnow.ae",
    replyTo: "support@cashnow.ae",
    domain: {
      domain: "cashnow.ae",
      verified: true,
      verifiedAt: "2026-05-15T08:00:00Z",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass",
    },
    esp: "sendgrid",
    status: "active",
    createdAt: "2026-04-05T09:00:00Z",
    updatedAt: "2026-05-15T08:00:00Z",
    updatedBy: "Khalil Ahmed",
  },
  {
    id: "sp-enbd-care",
    lenderId: "lnd-enbd",
    lenderName: "Emirates NBD",
    name: "Emirates NBD Care",
    fromName: "Emirates NBD Care",
    fromEmail: "care@emiratesnbd.com",
    replyTo: "care@emiratesnbd.com",
    domain: {
      domain: "emiratesnbd.com",
      verified: true,
      verifiedAt: "2026-05-25T16:00:00Z",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass",
    },
    esp: "ses",
    status: "active",
    description: "ENBD hardship + care outreach.",
    createdAt: "2026-04-10T10:00:00Z",
    updatedAt: "2026-05-25T16:00:00Z",
    updatedBy: "Asad Siddiqi",
  },
  {
    id: "sp-fab-notices",
    lenderId: "lnd-fab",
    lenderName: "FAB",
    name: "FAB Formal Notices",
    fromName: "First Abu Dhabi Bank",
    fromEmail: "notices@bankfab.com",
    replyTo: "notices-reply@bankfab.com",
    domain: {
      domain: "bankfab.com",
      verified: false,
      spf: "pass",
      dkim: "pending",
      dmarc: "pending",
    },
    esp: "infobip_uae",
    status: "inactive",
    description: "Pending domain verification — DKIM + DMARC not yet passing.",
    createdAt: "2026-06-08T12:00:00Z",
    updatedAt: "2026-06-15T09:30:00Z",
    updatedBy: "Asad Siddiqi",
  },
  {
    id: "sp-cleargrid-general",
    lenderId: "general",
    lenderName: "ClearGrid",
    name: "ClearGrid Collections",
    fromName: "ClearGrid Collections",
    fromEmail: "collections@cleargrid.co",
    replyTo: "support@cleargrid.co",
    domain: {
      domain: "cleargrid.co",
      verified: true,
      verifiedAt: "2026-05-01T10:00:00Z",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass",
    },
    esp: "sendgrid",
    status: "active",
    description: "Cross-lender fallback sender.",
    createdAt: "2026-04-01T10:00:00Z",
    updatedAt: "2026-05-01T10:00:00Z",
    updatedBy: "Rabab Abbas",
  },
]

/** Sender profiles available for a given lender + general fallbacks. */
export function getProfilesForLender(lenderId: string): SenderProfile[] {
  return senderProfiles.filter(
    (p) =>
      p.status === "active" &&
      p.domain.verified &&
      (p.lenderId === lenderId || p.lenderId === "general"),
  )
}

export function getSenderProfileById(id: string): SenderProfile | undefined {
  return senderProfiles.find((p) => p.id === id)
}
