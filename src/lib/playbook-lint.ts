/**
 * Playbook lint engine.
 *
 * Runs a playbook's rules against a piece of content and returns
 * structured findings. Used by:
 *   - the email-builder canvas (per-block + per-document lint)
 *   - Composer GPT's pre-output gate (must pass before insert)
 *   - the templates list (badge if a saved template now fails its own playbook)
 */

import type { Playbook, PlaybookRule } from "@/data/playbooks-v3"

export type LintSeverity = "error" | "warning" | "info"

export interface LintFinding {
  ruleId: string
  severity: LintSeverity
  message: string
  /** Where the violation was found (block id or "subject"/"body"). */
  location?: string
  /** Suggested fix line if any. */
  suggestion?: string
}

export interface LintInput {
  /** Email subject line. Empty for SMS. */
  subject?: string
  /** Plain text body (channel-appropriate). */
  body: string
  /** Channel — drives which length rules trigger. */
  channel: "email" | "sms" | "whatsapp"
  /** Optional list of disclaimer ids the content embeds (saved-module references). */
  embeddedDisclaimerIds?: string[]
}

export function lintAgainstPlaybook(
  playbook: Playbook,
  input: LintInput,
): LintFinding[] {
  const findings: LintFinding[] = []
  for (const rule of playbook.rules) {
    const f = applyRule(rule, input)
    if (f) findings.push(f)
  }
  return findings
}

function applyRule(rule: PlaybookRule, input: LintInput): LintFinding | null {
  const d = rule.detector
  const haystack = (input.subject ?? "") + " \n " + input.body
  switch (d.kind) {
    case "forbidden_phrase": {
      const hit = d.phrases.find((p) =>
        haystack.toLowerCase().includes(p.toLowerCase()),
      )
      if (hit) {
        return {
          ruleId: rule.id,
          severity: rule.severity,
          message: `Forbidden phrase "${hit}" appears in this content.`,
          suggestion: `Rewrite the line containing "${hit}". The playbook bans it.`,
        }
      }
      return null
    }
    case "required_phrase": {
      const min = d.minOccurrences ?? 1
      const matched = d.phrases.filter((p) =>
        haystack.toLowerCase().includes(p.toLowerCase()),
      ).length
      if (matched < min) {
        return {
          ruleId: rule.id,
          severity: rule.severity,
          message: rule.statement,
        }
      }
      return null
    }
    case "max_length": {
      if (d.channel === "email_subject") {
        if ((input.subject ?? "").length > d.max) {
          return {
            ruleId: rule.id,
            severity: rule.severity,
            message: `Subject is ${(input.subject ?? "").length} chars (limit ${d.max}).`,
            location: "subject",
          }
        }
      }
      if (d.channel === "sms_body" && input.channel === "sms") {
        if (input.body.length > d.max) {
          return {
            ruleId: rule.id,
            severity: rule.severity,
            message: `SMS body is ${input.body.length} chars — will split into multiple segments.`,
            location: "body",
          }
        }
      }
      if (d.channel === "email_body" && input.channel === "email") {
        if (input.body.length > d.max) {
          return {
            ruleId: rule.id,
            severity: rule.severity,
            message: `Email body exceeds ${d.max} chars.`,
            location: "body",
          }
        }
      }
      return null
    }
    case "reading_level": {
      // Rough Flesch-Kincaid grade estimate without a tokenizer.
      const grade = estimateReadingGrade(input.body)
      if (grade > d.maxGradeLevel) {
        return {
          ruleId: rule.id,
          severity: rule.severity,
          message: `Reading level ~grade ${grade.toFixed(1)} (target ≤ ${d.maxGradeLevel}).`,
          suggestion: "Shorten sentences and prefer one- or two-syllable words.",
        }
      }
      return null
    }
    case "must_include_disclaimer": {
      const has = input.embeddedDisclaimerIds?.includes(d.disclaimerId)
      if (!has) {
        return {
          ruleId: rule.id,
          severity: rule.severity,
          message: rule.statement,
          suggestion: `Drop in the saved compliance module for this disclaimer.`,
        }
      }
      return null
    }
    case "no_excessive_caps": {
      // Fires only on a *consecutive run* of N+ all-caps words (the "shouting"
      // signal). Isolated acronyms like AED, CBUAE, AECB, STOP don't trip it.
      const runPattern = new RegExp(
        `\\b[A-Z]{2,}(?:\\s+[A-Z]{2,}){${d.maxConsecutive},}\\b`,
      )
      const match = runPattern.exec(haystack)
      if (match) {
        return {
          ruleId: rule.id,
          severity: rule.severity,
          message: `Detected a run of ${d.maxConsecutive + 1}+ consecutive ALL-CAPS words: "${match[0].slice(0, 60)}". Reads as shouting.`,
        }
      }
      return null
    }
  }
}

/**
 * Rough Flesch-Kincaid grade estimate. Counts sentences, words, and an
 * approximate syllable count per word. Good enough for a directional lint
 * check; not for academic use.
 */
function estimateReadingGrade(text: string): number {
  const sentences = Math.max(1, text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length)
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0)
  if (words.length === 0) return 0
  const syllables = words.reduce((acc, w) => acc + countSyllables(w), 0)
  const wordsPerSentence = words.length / sentences
  const syllablesPerWord = syllables / words.length
  // Flesch-Kincaid grade level.
  return 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "")
  if (!w) return 0
  const groups = w.match(/[aeiouy]+/g)
  let n = groups ? groups.length : 1
  if (w.endsWith("e") && n > 1) n -= 1
  return Math.max(1, n)
}

export function findingsSummary(findings: LintFinding[]): {
  errors: number
  warnings: number
  infos: number
  passes: boolean
} {
  const errors = findings.filter((f) => f.severity === "error").length
  const warnings = findings.filter((f) => f.severity === "warning").length
  const infos = findings.filter((f) => f.severity === "info").length
  return { errors, warnings, infos, passes: errors === 0 }
}
