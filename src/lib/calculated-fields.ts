import { FIELD_CATEGORIES } from "@/lib/constants"

const STORAGE_KEY = "cleargrid_calculated_fields"

export interface CalculatedField {
  id: string
  name: string
  description: string
  formula: string
  createdAt: string
  validResult: boolean
}

/**
 * Returns a flat, deduplicated list of every field name surfaced anywhere in
 * the segment builder. Used to power the `[` autocomplete inside the formula
 * editor. Includes a few collections-specific extras that the constants file
 * doesn't currently model.
 */
export function getAllAvailableFieldNames(): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const cat of FIELD_CATEGORIES) {
    for (const f of cat.fields) {
      if (!seen.has(f)) {
        seen.add(f)
        result.push(f)
      }
    }
  }

  // Common collections-specific fields the editor should always know about,
  // even if they aren't surfaced in the regular filter dropdown yet.
  const extras = [
    "Total PTP",
    "Total Cost Per User",
    "PTP Date",
    "PTP Amount",
    "Broken Promise Count",
    "Total AI Calls",
    "Total Human Calls",
    "AI Calls Answered",
    "AI Calls Attempt",
    "Email Open",
    "Email Delivered",
    "DPD",
  ]
  for (const f of extras) {
    if (!seen.has(f)) {
      seen.add(f)
      result.push(f)
    }
  }

  return result.sort((a, b) => a.localeCompare(b))
}

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

export function loadCalculatedFields(): CalculatedField[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is CalculatedField =>
        !!item &&
        typeof item === "object" &&
        typeof (item as CalculatedField).id === "string" &&
        typeof (item as CalculatedField).name === "string" &&
        typeof (item as CalculatedField).formula === "string"
    )
  } catch {
    return []
  }
}

export function saveCalculatedFields(fields: CalculatedField[]): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fields))
  } catch {
    // ignore quota errors in prototype
  }
}

export function upsertCalculatedField(
  field: CalculatedField
): CalculatedField[] {
  const all = loadCalculatedFields()
  const idx = all.findIndex((f) => f.id === field.id)
  if (idx >= 0) {
    all[idx] = field
  } else {
    all.push(field)
  }
  saveCalculatedFields(all)
  return all
}

export function removeCalculatedField(id: string): CalculatedField[] {
  const all = loadCalculatedFields().filter((f) => f.id !== id)
  saveCalculatedFields(all)
  return all
}

/** Stable id for new calculated fields. */
export function newCalculatedFieldId(): string {
  return `calc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Validate a Tableau-style formula. The validator is intentionally permissive
 * (this is a prototype) — it only catches the obvious unbalanced-bracket and
 * empty-input cases.
 */
export interface FormulaValidation {
  state: "empty" | "valid" | "invalid"
  message: string
  resultFormat?: string
}

export function validateFormula(formula: string): FormulaValidation {
  const trimmed = formula.trim()
  if (!trimmed) {
    return {
      state: "empty",
      message: "Type [ to insert a field, or click a function on the right.",
    }
  }

  const open = (trimmed.match(/\[/g) || []).length
  const close = (trimmed.match(/\]/g) || []).length
  if (open !== close) {
    return {
      state: "invalid",
      message: "Unbalanced field brackets — every [ needs a matching ].",
    }
  }

  const parenOpen = (trimmed.match(/\(/g) || []).length
  const parenClose = (trimmed.match(/\)/g) || []).length
  if (parenOpen !== parenClose) {
    return {
      state: "invalid",
      message: "Unbalanced parentheses — every ( needs a matching ).",
    }
  }

  const dq = (trimmed.match(/"/g) || []).length
  if (dq % 2 !== 0) {
    return {
      state: "invalid",
      message: "Unclosed string literal — check your double quotes.",
    }
  }

  // Try to infer the result format from the formula's tail.
  let resultFormat = "Number"
  if (/DATE(ADD|TRUNC|PARSE)|TODAY\(\)|NOW\(\)/i.test(trimmed)) {
    resultFormat = "Date"
  } else if (/UPPER|LOWER|TRIM|LEFT|RIGHT|MID|REPLACE|SPLIT/i.test(trimmed)) {
    resultFormat = "String"
  } else if (
    /CONTAINS|STARTSWITH|ENDSWITH|ISNULL|IIF|\bIF\b/i.test(trimmed) &&
    !/[+\-*/]/.test(trimmed)
  ) {
    resultFormat = "Boolean"
  } else if (/\*\s*100|\/\s*\[/.test(trimmed)) {
    resultFormat = "Number (percentage)"
  } else if (
    /\[Outstanding Amount\]|\[Total Amount\]|\[Overdue Amount\]|\[EMI\]|\[Credit Limit\]/.test(
      trimmed
    )
  ) {
    resultFormat = "Number (AED)"
  }

  return {
    state: "valid",
    message: "The calculation is valid.",
    resultFormat: `Result format: ${resultFormat}`,
  }
}
