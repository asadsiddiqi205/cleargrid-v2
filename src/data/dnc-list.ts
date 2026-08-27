/**
 * ClearVoice DNC seed — the prototype's stand-in for the real DNC list.
 *
 * The DncCheck component reads this seed and reports which of the pasted
 * numbers are on the list. A real backend would query the ClearVoice API
 * per-number.
 */

const RAW_LIST = [
  "971500000003",
  "971502340000",
  "971555550100",
  "971561234567",
  "971505550100",
  "971521234567",
  "971581119999",
  "971544445555",
  "971503334444",
  "971521111222",
  "971561239876",
  "971558887777",
  "971559990001",
  "971544433322",
]

const DNC_SET = new Set(RAW_LIST)

export function normalizePhone(input: string): string {
  return input.replace(/\D+/g, "")
}

export function isOnDncList(phone: string): boolean {
  return DNC_SET.has(normalizePhone(phone))
}

export function checkNumbers(input: string): {
  normalized: Array<{ raw: string; digits: string; onList: boolean }>
  totalScanned: number
  onListCount: number
} {
  const lines = input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const seenDigits = new Set<string>()
  const normalized: Array<{ raw: string; digits: string; onList: boolean }> = []
  for (const raw of lines) {
    const digits = normalizePhone(raw)
    if (!digits) continue
    if (seenDigits.has(digits)) continue
    seenDigits.add(digits)
    normalized.push({ raw, digits, onList: DNC_SET.has(digits) })
  }
  return {
    normalized,
    totalScanned: normalized.length,
    onListCount: normalized.filter((n) => n.onList).length,
  }
}
