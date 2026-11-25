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
  /** The from-email's own sending domain, plus its verification state.
   *  Kept for backwards compat: every Composer send uses the full
   *  fromEmail, so this is the one the Composer scores. */
  domain: SendingDomain
  /** Journey sends rotate `prefix@domain` across this list of warmed
   *  sending domains. Must include `domain.domain` itself as the first
   *  entry so existing behaviour is preserved. */
  domains: SendingDomain[]
  /** Local-part used by Journey rotation sends. Composer sends still
   *  use `fromEmail` verbatim. */
  prefix: string
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

/** Small helper so callers that only know the from-email can still
 *  address the profile's domain pool. */
export function senderProfileDomainNames(p: SenderProfile): string[] {
  return p.domains.map((d) => d.domain)
}

/* ─────────────────────────── Seeded profiles ─────────────────────────── */

/** Shorthand builder — every seeded sending domain uses the same
 *  defaults; we just override name and verification stamp. */
function dom(name: string, verified = true, verifiedAt = "2026-10-15T10:00:00Z"): SendingDomain {
  return {
    domain: name,
    verified,
    verifiedAt,
    spf: "pass",
    dkim: "pass",
    dmarc: "pass",
  }
}

const DOM = {
  cleargridCo: dom("cleargrid.co"),
  cleargridAi: dom("s.cleargrid.ai"),
  legalAr: dom("legal.cleararabia.ai"),
  supportAr: dom("support.cleararabia.ai"),
  cleargridAe: dom("cleargrid.ae"),
  dCleargridAe: dom("d.cleargrid.ae"),
  iCleargridAe: dom("i.cleargrid.ae"),
  mCleargridAe: dom("m.cleargrid.ae"),
  cCleargridAe: dom("c.cleargrid.ae"),
  hCleargridAe: dom("h.cleargrid.ae"),
  gCleargridAe: dom("g.cleargrid.ae"),
  eCleargridAe: dom("e.cleargrid.ae"),
  aCleargridAe: dom("a.cleargrid.ae"),
  jCleargridAe: dom("j.cleargrid.ae"),
  fCleargridAe: dom("f.cleargrid.ae"),
  qCleargridAe: dom("q.cleargrid.ae"),
}

export const senderProfiles: SenderProfile[] = [
  {
    id: "sp-ksa",
    lenderId: "general",
    lenderName: "General (cross-lender)",
    name: "KSA-Sender-Profile",
    fromName: "ClearGrid Collections",
    fromEmail: "collection@cleargrid.co",
    replyTo: "support@cleargrid.co",
    prefix: "Collections",
    domain: DOM.cleargridCo,
    domains: [DOM.cleargridCo, DOM.cleargridAi, DOM.legalAr, DOM.supportAr],
    esp: "infobip_uae",
    status: "active",
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-11-18T09:14:00Z",
    updatedBy: "Rabab Abbas",
  },
  {
    id: "sp-ksa-non-banking",
    lenderId: "general",
    lenderName: "General (cross-lender)",
    name: "KSA-Non Banking",
    fromName: "Collections@legal.cleararabia.ai",
    fromEmail: "collection@cleargrid.co",
    replyTo: "support@cleargrid.co",
    prefix: "Collections",
    domain: DOM.cleargridCo,
    domains: [DOM.cleargridAi, DOM.supportAr, DOM.legalAr, DOM.cleargridCo],
    esp: "infobip_uae",
    status: "active",
    createdAt: "2026-10-05T10:00:00Z",
    updatedAt: "2026-11-11T10:30:00Z",
    updatedBy: "Asad Siddiqi",
  },
  {
    id: "sp-uae-non-banking",
    lenderId: "general",
    lenderName: "General (cross-lender)",
    name: "UAE Non-Banking",
    fromName: "ClearGrid Collections",
    fromEmail: "collections@cleargrid.ae",
    replyTo: "support@cleargrid.ae",
    prefix: "Collections",
    domain: DOM.cleargridAe,
    domains: [DOM.cleargridAi, DOM.dCleargridAe, DOM.iCleargridAe, DOM.mCleargridAe],
    esp: "infobip_uae",
    status: "active",
    createdAt: "2026-10-07T09:00:00Z",
    updatedAt: "2026-11-20T14:00:00Z",
    updatedBy: "Khalil Ahmed",
  },
  {
    id: "sp-mashreq-buckets",
    lenderId: "general",
    lenderName: "General (cross-lender)",
    name: "Mashreq Buckets (1, 2, 3)",
    fromName: "ClearGrid Collections",
    fromEmail: "collections@cleargrid.co",
    replyTo: "support@cleargrid.co",
    prefix: "collections",
    domain: DOM.cleargridCo,
    domains: [
      DOM.cCleargridAe,
      DOM.hCleargridAe,
      DOM.gCleargridAe,
      DOM.eCleargridAe,
      DOM.aCleargridAe,
      DOM.jCleargridAe,
      DOM.fCleargridAe,
    ],
    esp: "infobip_uae",
    status: "active",
    createdAt: "2026-10-10T10:00:00Z",
    updatedAt: "2026-11-24T08:00:00Z",
    updatedBy: "Rabab Abbas",
  },
  {
    id: "sp-hsbc-communication",
    lenderId: "lnd-hsbc",
    lenderName: "HSBC-Recovery",
    name: "HSBC_Communication_Sender",
    fromName: "Communication",
    fromEmail: "communication@cleargrid.co",
    replyTo: "communication@cleargrid.co",
    prefix: "Communication",
    domain: DOM.cleargridCo,
    domains: [DOM.cleargridCo],
    esp: "infobip_uae",
    status: "active",
    createdAt: "2026-10-12T11:00:00Z",
    updatedAt: "2026-11-05T15:00:00Z",
    updatedBy: "Asad Siddiqi",
  },
  {
    id: "sp-cleargrid-test",
    lenderId: "general",
    lenderName: "General (cross-lender)",
    name: "ClearGrid Test",
    fromName: "ClearGrid Test",
    fromEmail: "support@i.cleargrid.ae",
    replyTo: "support@i.cleargrid.ae",
    prefix: "senderjourney",
    domain: DOM.iCleargridAe,
    domains: [DOM.qCleargridAe],
    esp: "infobip_uae",
    status: "active",
    description: "Test sender — safe to send through during dev.",
    createdAt: "2026-10-15T09:00:00Z",
    updatedAt: "2026-11-01T12:00:00Z",
    updatedBy: "Asad Siddiqi",
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
