/**
 * SMS encoding + segmentation math.
 *
 * A GSM-7 SMS carrier packs each glyph into 7 bits, so a single segment holds
 * 160 characters; when a message straddles multiple segments the header
 * consumes 7 bits per segment, leaving 153 per part. If the body contains any
 * character outside the GSM-7 alphabet (Arabic, most emoji, most non-Latin
 * scripts, curly quotes, …), the carrier switches to UCS-2 — every glyph is
 * 16 bits, so a single segment fits 70, and multi-segment parts fit 67.
 *
 * The consequence collections cares about: an Arabic reminder priced as one
 * SMS in the composer actually costs the operator ~2.3× as much (140 chars
 * fits in 1 segment as English but takes 2 segments in Arabic).
 *
 * Sources: 3GPP TS 23.038 · GSM 03.38 · GSM 03.40.
 */

/** GSM-7 default alphabet — every character that fits in a single 7-bit slot. */
const GSM7_DEFAULT = new Set<string>(
  [
    "@", "£", "$", "¥", "è", "é", "ù", "ì", "ò", "Ç", "\n", "Ø", "ø", "\r", "Å",
    "å", "Δ", "_", "Φ", "Γ", "Λ", "Ω", "Π", "Ψ", "Σ", "Θ", "Ξ", "Æ", "æ", "ß",
    "É", " ", "!", '"', "#", "¤", "%", "&", "'", "(", ")", "*", "+", ",", "-",
    ".", "/", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<",
    "=", ">", "?", "¡", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K",
    "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "Ä", "Ö", "Ñ", "Ü", "§", "¿", "a", "b", "c", "d", "e", "f", "g", "h", "i",
    "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x",
    "y", "z", "ä", "ö", "ñ", "ü", "à",
  ]
)

/**
 * GSM-7 extension table — each of these characters is valid GSM-7 but takes
 * TWO character slots (an escape byte + the glyph). Common inclusions: `^`
 * `{` `}` `\\` `[` `~` `]` `|` `€`.
 */
const GSM7_EXTENDED = new Set<string>([
  "\f", "^", "{", "}", "\\", "[", "~", "]", "|", "€",
])

export type SmsEncoding = "gsm7" | "ucs2"

export interface SmsSegmentation {
  encoding: SmsEncoding
  characterCount: number
  /** How many segments the message will be broken into on the wire. */
  segments: number
  /** Characters remaining in the current segment before overflow. */
  remainingInSegment: number
  /** Per-segment cap: 160 (GSM7 single) / 153 (GSM7 multi) / 70 (UCS2 single) / 67 (UCS2 multi). */
  perSegmentCap: number
  /** The one/two-character glyphs that forced UCS-2, if any (first three). */
  nonGsmSample: string[]
}

/**
 * Return true iff the entire message stays within GSM-7 (default + extension).
 */
export function isGsm7(body: string): boolean {
  for (const ch of body) {
    if (!GSM7_DEFAULT.has(ch) && !GSM7_EXTENDED.has(ch)) return false
  }
  return true
}

/** First up-to-three non-GSM glyphs, useful for a "these characters forced UCS-2" hint. */
export function nonGsmGlyphs(body: string, limit = 3): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const ch of body) {
    if (GSM7_DEFAULT.has(ch) || GSM7_EXTENDED.has(ch)) continue
    if (seen.has(ch)) continue
    seen.add(ch)
    out.push(ch)
    if (out.length >= limit) break
  }
  return out
}

/**
 * Count characters the way the carrier does — a GSM-7 extended glyph
 * (e.g. `€`, `{`) takes TWO slots, everything else takes one.
 */
export function countCharacters(body: string, encoding: SmsEncoding): number {
  if (encoding === "ucs2") {
    // UCS-2 counts UTF-16 code units. `[...body].length` gives code POINTS
    // (better for emoji + astral scripts), but SMS bills by code units, so
    // we return the raw string length which is the code-unit count.
    return body.length
  }
  let count = 0
  for (const ch of body) {
    count += GSM7_EXTENDED.has(ch) ? 2 : 1
  }
  return count
}

/**
 * Compute segmentation for a message body. Callers only supply the body —
 * this determines encoding + segments + remaining slots in the current
 * segment.
 */
export function segmentSms(body: string): SmsSegmentation {
  const encoding: SmsEncoding = isGsm7(body) ? "gsm7" : "ucs2"
  const characterCount = countCharacters(body, encoding)

  const singleCap = encoding === "gsm7" ? 160 : 70
  const multiCap = encoding === "gsm7" ? 153 : 67

  let segments = 0
  let perSegmentCap = singleCap
  if (characterCount === 0) {
    segments = 0
    perSegmentCap = singleCap
  } else if (characterCount <= singleCap) {
    segments = 1
    perSegmentCap = singleCap
  } else {
    segments = Math.ceil(characterCount / multiCap)
    perSegmentCap = multiCap
  }

  const usedInCurrent = segments === 0 ? 0 : characterCount - (segments - 1) * perSegmentCap
  const remainingInSegment = Math.max(0, perSegmentCap - usedInCurrent)

  return {
    encoding,
    characterCount,
    segments,
    remainingInSegment,
    perSegmentCap,
    nonGsmSample: encoding === "ucs2" ? nonGsmGlyphs(body) : [],
  }
}

/**
 * Cheap heuristic to know whether the message should render right-to-left.
 * Fires if the string contains any Arabic (U+0600–U+06FF), Arabic Supplement,
 * or Hebrew glyph. Not a perfect bidi classifier — good enough for a
 * preview.
 */
export function isRtl(body: string): boolean {
  return /[؀-ۿݐ-ݿ֐-׿]/.test(body)
}
