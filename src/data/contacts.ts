/**
 * Multi-contact accounts — the Tamara B2B model.
 *
 * A B2B "borrower" is really a business account with several human contacts
 * (CEO office, Finance, Admin…), each with their own phones and email. This
 * module owns the schema, sample seed, and the recipient-rule resolver used
 * by AI Call, Email/SMS and human-campaign flows.
 *
 * Everything here is opt-in per lender via `flags.tamara_b2b_contacts` on
 * `data/lenders.ts`. Consumer flows never see any of this — legacy code
 * paths continue to treat `borrower` as a single-contact entity.
 */

import { borrowers } from "./borrowers"

/* ─────────── Types ─────────── */

export type Designation =
  | "ceo_office"
  | "finance"
  | "admin"
  | "ap"           // Accounts payable
  | "procurement"
  | "other"

export const DESIGNATION_LABEL: Record<Designation, string> = {
  ceo_office: "CEO Office",
  finance: "Finance",
  admin: "Admin",
  ap: "Accounts Payable",
  procurement: "Procurement",
  other: "Other",
}

export type PhoneSource = "lender" | "pca" | "skip_trace" | "agent_added"
export type VerificationStatus =
  | "unknown"
  | "verified"
  | "invalid"
  | "unreachable"

export interface ContactPhone {
  id: string
  /** E.164, e.g. +971501234567. */
  e164: string
  source: PhoneSource
  verificationStatus: VerificationStatus
  /** Last recorded outcome that touched this phone, if any. */
  lastOutcome?: string
  lastOutcomeAt?: string
}

export interface Contact {
  id: string
  /** Foreign key to a `Borrower.id` — the borrower row is the account. */
  accountId: string
  name: string
  designation: Designation
  /** Raw string from the source system before enum normalisation. */
  designationRaw: string
  email?: string
  phones: ContactPhone[]
  isPrimary: boolean
  isLegallyLiable: boolean
  /** Lower = higher priority. */
  priorityRank: number
  doNotContact: boolean
}

export interface AccountRotationState {
  accountId: string
  lastContactId: string | null
  lastPhoneId: string | null
  nextContactId: string | null
  nextPhoneId: string | null
}

/* ─────────── Seed — 10 B2B accounts on Tamara B2B (lnd-tamara-b2b) ─────────── */

const T = (id: string): Contact["accountId"] => id // helper for readability

// Pick 10 of the first borrowers to act as B2B accounts. Their ids stay the
// same; the account "business name" is derived below.
const B2B_ACCOUNT_IDS = borrowers.slice(0, 10).map((b) => b.id)

/**
 * The business name assigned to a B2B account. Falls back to a synthetic
 * "MERCHANT-<hash>" when we don't have a seeded one.
 */
export function getBusinessName(accountId: string): string {
  const map: Record<string, string> = {
    [B2B_ACCOUNT_IDS[0] ?? ""]: "Al Manar Trading LLC",
    [B2B_ACCOUNT_IDS[1] ?? ""]: "Nawras Motors FZ-LLC",
    [B2B_ACCOUNT_IDS[2] ?? ""]: "Souq Al Bahar Retail",
    [B2B_ACCOUNT_IDS[3] ?? ""]: "Falcon Logistics DMCC",
    [B2B_ACCOUNT_IDS[4] ?? ""]: "Blue Waters Hospitality",
    [B2B_ACCOUNT_IDS[5] ?? ""]: "Desert Rose Cosmetics",
    [B2B_ACCOUNT_IDS[6] ?? ""]: "Gulf Auto Parts Trading",
    [B2B_ACCOUNT_IDS[7] ?? ""]: "Emirates Fresh Produce",
    [B2B_ACCOUNT_IDS[8] ?? ""]: "Diamond Interiors LLC",
    [B2B_ACCOUNT_IDS[9] ?? ""]: "Zayed Pharmaceuticals",
  }
  return map[accountId] ?? `MERCHANT-${accountId.slice(-4).toUpperCase()}`
}

export function getBusinessCrNumber(accountId: string): string {
  // Deterministic-ish "CR" number.
  const h = accountId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return `CR-${(h * 173).toString().padStart(7, "0").slice(0, 7)}`
}

const CEO_NAMES = [
  ["Sara", "Al-Sabah"],
  ["Omar", "El-Sayed"],
  ["Fatima", "Al Marzooqi"],
  ["Khalid", "Al-Nuaimi"],
  ["Layla", "Al Khoury"],
]
const FINANCE_NAMES = [
  ["Nourhan", "Adel"],
  ["Rashid", "Al Falasi"],
  ["Mona", "Al Khaja"],
  ["Yousef", "Al Hashimi"],
  ["Hind", "Al Ali"],
]
const ADMIN_NAMES = [
  ["Adnan", "Kumar"],
  ["Sunita", "Sharma"],
  ["Michael", "Rodrigues"],
  ["Priya", "Mehta"],
  ["Ahmed", "Salem"],
]

function buildContactsForAccount(accountId: string, i: number): Contact[] {
  const ceo = CEO_NAMES[i % CEO_NAMES.length]
  const fin = FINANCE_NAMES[i % FINANCE_NAMES.length]
  const adm = ADMIN_NAMES[i % ADMIN_NAMES.length]
  const business = getBusinessName(accountId)
  const domain = business
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 14)
    .concat(".ae")
  return [
    {
      id: `${accountId}-c1`,
      accountId,
      name: `${ceo[0]} ${ceo[1]}`,
      designation: "ceo_office",
      designationRaw: "Owner / CEO",
      email: `${ceo[0].toLowerCase()}@${domain}`,
      phones: [
        {
          id: `${accountId}-c1-p1`,
          e164: `+9715${String(70 + i).padStart(2, "0")}${String(1000000 + i * 137).slice(0, 7)}`,
          source: "lender",
          verificationStatus: "verified",
          lastOutcome: "connected_right_party",
          lastOutcomeAt: "2026-09-22T10:12:00Z",
        },
        {
          id: `${accountId}-c1-p2`,
          e164: `+9714${String(200 + i).padStart(3, "0")}${String(3000 + i).padStart(4, "0")}`,
          source: "lender",
          verificationStatus: "unknown",
        },
      ],
      isPrimary: true,
      isLegallyLiable: true,
      priorityRank: 1,
      doNotContact: false,
    },
    {
      id: `${accountId}-c2`,
      accountId,
      name: `${fin[0]} ${fin[1]}`,
      designation: "finance",
      designationRaw: "Head of Finance",
      email: `finance@${domain}`,
      phones: [
        {
          id: `${accountId}-c2-p1`,
          e164: `+9715${String(80 + i).padStart(2, "0")}${String(2000000 + i * 211).slice(0, 7)}`,
          source: "lender",
          verificationStatus: "verified",
        },
        {
          id: `${accountId}-c2-p2`,
          e164: `+9715${String(60 + i).padStart(2, "0")}${String(3000000 + i * 199).slice(0, 7)}`,
          source: "pca",
          verificationStatus: "unknown",
        },
      ],
      isPrimary: false,
      isLegallyLiable: true,
      priorityRank: 2,
      doNotContact: false,
    },
    {
      id: `${accountId}-c3`,
      accountId,
      name: `${adm[0]} ${adm[1]}`,
      designation: "admin",
      designationRaw: "Office Admin",
      email: undefined,
      phones: [
        {
          id: `${accountId}-c3-p1`,
          e164: `+9715${String(50 + i).padStart(2, "0")}${String(4000000 + i * 313).slice(0, 7)}`,
          source: "skip_trace",
          verificationStatus: "unknown",
        },
      ],
      isPrimary: false,
      isLegallyLiable: false,
      priorityRank: 3,
      doNotContact: i === 2, // one account has a DNC admin
    },
  ]
}

const CONTACTS_BY_ACCOUNT: Map<string, Contact[]> = new Map(
  B2B_ACCOUNT_IDS.map((accountId, i) => [
    accountId,
    buildContactsForAccount(accountId, i),
  ]),
)

/** Rotation state — one row per account, mutable during a demo session. */
const ROTATION: Map<string, AccountRotationState> = new Map()

/* ─────────── Public API ─────────── */

export function getAccountContacts(accountId: string): Contact[] {
  return CONTACTS_BY_ACCOUNT.get(accountId) ?? []
}

export function getContact(accountId: string, contactId: string): Contact | undefined {
  return getAccountContacts(accountId).find((c) => c.id === contactId)
}

export function getPrimaryContact(accountId: string): Contact | undefined {
  return getAccountContacts(accountId).find((c) => c.isPrimary)
}

export function getAccountsWithContacts(): string[] {
  return Array.from(CONTACTS_BY_ACCOUNT.keys())
}

/** Ids of B2B accounts — used to filter the borrower list for the Tamara B2B lender. */
export const B2B_ACCOUNTS = Array.from(CONTACTS_BY_ACCOUNT.keys())

/** True if a borrower id corresponds to a B2B account. */
export function isB2BAccount(borrowerId: string): boolean {
  return CONTACTS_BY_ACCOUNT.has(borrowerId)
}

export function getRotationState(accountId: string): AccountRotationState {
  const existing = ROTATION.get(accountId)
  if (existing) return existing
  const contacts = getAccountContacts(accountId)
  const state: AccountRotationState = {
    accountId,
    lastContactId: null,
    lastPhoneId: null,
    nextContactId: contacts[0]?.id ?? null,
    nextPhoneId: contacts[0]?.phones[0]?.id ?? null,
  }
  ROTATION.set(accountId, state)
  return state
}

/* ─────────── Recipient rule + resolver ─────────── */

export interface RecipientRule {
  mode: "primary_only" | "all_contacts" | "by_designation" | "priority_order"
  designations?: Designation[]
  includeUnverifiedNumbers: boolean
  maxContactsPerAccount?: number
  fallback: "use_primary" | "skip_account"
}

export const DEFAULT_RECIPIENT_RULE: RecipientRule = {
  mode: "primary_only",
  includeUnverifiedNumbers: true,
  fallback: "use_primary",
}

export interface ResolvedRecipient {
  contact: Contact
  /** Selected phone for THIS attempt — the first one satisfying the rule. */
  phone: ContactPhone | null
}

/**
 * Turn a RecipientRule into a resolved, ordered list of {contact, phone}
 * tuples for a given account. Sequential rotation is enforced downstream —
 * this function only returns the ordered candidate set.
 */
export function resolveRecipients(
  accountId: string,
  rule: RecipientRule,
): ResolvedRecipient[] {
  const all = getAccountContacts(accountId).filter((c) => !c.doNotContact)
  let candidates: Contact[]
  switch (rule.mode) {
    case "primary_only":
      candidates = all.filter((c) => c.isPrimary)
      break
    case "all_contacts":
      candidates = all.slice()
      break
    case "by_designation": {
      const set = new Set(rule.designations ?? [])
      candidates = all.filter((c) => set.has(c.designation))
      break
    }
    case "priority_order":
      candidates = all.slice().sort((a, b) => a.priorityRank - b.priorityRank)
      break
  }

  // Fallback when the rule selects nothing.
  if (candidates.length === 0 && rule.fallback === "use_primary") {
    const primary = all.find((c) => c.isPrimary)
    if (primary) candidates = [primary]
  }

  if (rule.maxContactsPerAccount !== undefined) {
    candidates = candidates.slice(0, Math.max(0, rule.maxContactsPerAccount))
  }

  return candidates.map((c) => ({
    contact: c,
    phone: pickPhone(c, rule.includeUnverifiedNumbers),
  }))
}

function pickPhone(c: Contact, includeUnverified: boolean): ContactPhone | null {
  const eligible = c.phones.filter((p) => {
    if (p.verificationStatus === "invalid") return false
    if (p.verificationStatus === "unreachable") return false
    if (!includeUnverified && p.verificationStatus !== "verified") return false
    return true
  })
  // Prefer verified first, then anything else in source order.
  const verified = eligible.find((p) => p.verificationStatus === "verified")
  return verified ?? eligible[0] ?? null
}

/** Compact summary shown next to the RecipientRule form. */
export function describeRule(rule: RecipientRule): string {
  const parts: string[] = []
  switch (rule.mode) {
    case "primary_only":
      parts.push("Primary contact only")
      break
    case "all_contacts":
      parts.push("All contacts")
      break
    case "by_designation":
      parts.push(
        `By designation · ${(rule.designations ?? [])
          .map((d) => DESIGNATION_LABEL[d])
          .join(", ") || "none"}`,
      )
      break
    case "priority_order":
      parts.push("Priority order")
      break
  }
  if (rule.maxContactsPerAccount !== undefined) {
    parts.push(`max ${rule.maxContactsPerAccount}/account`)
  }
  parts.push(rule.includeUnverifiedNumbers ? "including unverified" : "verified numbers only")
  if (rule.mode !== "primary_only") {
    parts.push(
      rule.fallback === "use_primary"
        ? "fallback: primary"
        : "fallback: skip account",
    )
  }
  return parts.join(" · ")
}
