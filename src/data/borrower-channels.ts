/**
 * Author-time selection strategies for the phones and emails every
 * borrower carries. Numbers and addresses are unordered sets with no
 * labels (no "Work" / "Personal" tagging) — the picker only governs
 * HOW MANY to use, in WHAT ORDER, and WHAT TO DO after a failure.
 *
 * Shape is deliberately small so the same type powers Composer SMS/Email,
 * the Journey Message Node, and the AI Call node's phone parameter + redial
 * section.
 */

export interface PhoneSelection {
  /** When true, use every number on the borrower (default). */
  useAll: boolean
  /** When `useAll` is false, cap how many numbers to attempt (1..5). */
  limit?: number
  /**
   * Order the dialer / sender walks the borrower's numbers in.
   * - `as_stored`     — walk the list in storage order
   * - `verified_first` — verified numbers first, then the rest
   * - `last_reached_first` — try the number that last connected first
   */
  order: "as_stored" | "verified_first" | "last_reached_first"
  /** For voice / SMS: only move to the next number after the current fails. */
  cascadeOnFailure: boolean
}

export interface EmailSelection {
  useAll: boolean
  limit?: number
  order: "as_stored" | "verified_first" | "last_reached_first"
  /**
   * When more than one address is picked:
   * - `one_message_cc_rest` — single email, first address in To, others in CC
   * - `one_per_address`      — a separate email for each address
   */
  mode: "one_message_cc_rest" | "one_per_address"
}

export const DEFAULT_PHONE_SELECTION: PhoneSelection = {
  useAll: true,
  order: "as_stored",
  cascadeOnFailure: true,
}

export const DEFAULT_EMAIL_SELECTION: EmailSelection = {
  useAll: false,
  limit: 1,
  order: "as_stored",
  mode: "one_message_cc_rest",
}

/** Short label used in previews ("3 numbers · verified-first"). */
export function describePhoneSelection(sel: PhoneSelection): string {
  const scope = sel.useAll ? "all numbers" : `first ${sel.limit ?? 1}`
  const orderLabel =
    sel.order === "verified_first"
      ? "verified-first"
      : sel.order === "last_reached_first"
        ? "last-reached first"
        : "as stored"
  return `${scope} · ${orderLabel}${sel.cascadeOnFailure ? " · cascade on fail" : ""}`
}

export function describeEmailSelection(sel: EmailSelection): string {
  const scope = sel.useAll ? "all addresses" : `first ${sel.limit ?? 1}`
  const modeLabel =
    sel.mode === "one_per_address"
      ? "separate messages"
      : "one message · CC rest"
  return `${scope} · ${modeLabel}`
}
