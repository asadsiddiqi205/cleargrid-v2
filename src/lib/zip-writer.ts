/**
 * Minimal in-browser ZIP writer — STORE (no compression) method.
 *
 * Enough to bundle a set of text/HTML/XML files into a real .zip that any
 * ZIP tool can open. No compression is fine for the prototype's file sizes;
 * skipping DEFLATE keeps this implementation to ~120 lines with zero
 * dependencies.
 *
 * ZIP layout (per the PKWARE APPNOTE spec):
 *   For each file: Local File Header + file data
 *   After all files: Central Directory (one entry per file)
 *   Then: End of Central Directory Record
 */

interface ZipEntry {
  name: string
  data: Uint8Array
  crc32: number
  offset: number
}

export interface ZipInput {
  name: string
  content: string
}

/** Build a Blob containing a valid .zip archive of the given text files. */
export function buildZip(files: ZipInput[]): Blob {
  const encoder = new TextEncoder()
  const encoded: ZipEntry[] = []
  const chunks: Uint8Array[] = []
  let offset = 0

  for (const f of files) {
    const nameBytes = encoder.encode(f.name)
    const dataBytes = encoder.encode(f.content)
    const crc = crc32(dataBytes)

    // ── Local File Header ──
    const lfh = new Uint8Array(30 + nameBytes.length)
    const dv = new DataView(lfh.buffer)
    dv.setUint32(0, 0x04034b50, true) // signature
    dv.setUint16(4, 20, true) // version
    dv.setUint16(6, 0, true) // flags
    dv.setUint16(8, 0, true) // compression = STORE
    dv.setUint16(10, 0, true) // mod time — 0 is valid
    dv.setUint16(12, 0x21, true) // mod date — arbitrary valid date
    dv.setUint32(14, crc, true) // CRC-32
    dv.setUint32(18, dataBytes.length, true) // compressed size = uncompressed
    dv.setUint32(22, dataBytes.length, true) // uncompressed size
    dv.setUint16(26, nameBytes.length, true) // filename length
    dv.setUint16(28, 0, true) // extra field length
    lfh.set(nameBytes, 30)

    chunks.push(lfh, dataBytes)
    encoded.push({ name: f.name, data: dataBytes, crc32: crc, offset })
    offset += lfh.length + dataBytes.length
  }

  // ── Central Directory ──
  const cdChunks: Uint8Array[] = []
  let cdSize = 0
  for (const e of encoded) {
    const nameBytes = encoder.encode(e.name)
    const cdh = new Uint8Array(46 + nameBytes.length)
    const dv = new DataView(cdh.buffer)
    dv.setUint32(0, 0x02014b50, true) // central directory signature
    dv.setUint16(4, 20, true) // version made by
    dv.setUint16(6, 20, true) // version needed
    dv.setUint16(8, 0, true) // flags
    dv.setUint16(10, 0, true) // compression = STORE
    dv.setUint16(12, 0, true) // mod time
    dv.setUint16(14, 0x21, true) // mod date
    dv.setUint32(16, e.crc32, true)
    dv.setUint32(20, e.data.length, true) // compressed
    dv.setUint32(24, e.data.length, true) // uncompressed
    dv.setUint16(28, nameBytes.length, true) // filename length
    dv.setUint16(30, 0, true) // extra field length
    dv.setUint16(32, 0, true) // comment length
    dv.setUint16(34, 0, true) // disk number start
    dv.setUint16(36, 0, true) // internal file attrs
    dv.setUint32(38, 0, true) // external file attrs
    dv.setUint32(42, e.offset, true) // local header offset
    cdh.set(nameBytes, 46)

    cdChunks.push(cdh)
    cdSize += cdh.length
  }

  const cdOffset = offset

  // ── End of Central Directory Record ──
  const eocd = new Uint8Array(22)
  const edv = new DataView(eocd.buffer)
  edv.setUint32(0, 0x06054b50, true) // signature
  edv.setUint16(4, 0, true) // disk number
  edv.setUint16(6, 0, true) // disk with CD
  edv.setUint16(8, encoded.length, true) // CD entries on this disk
  edv.setUint16(10, encoded.length, true) // total CD entries
  edv.setUint32(12, cdSize, true) // CD size
  edv.setUint32(16, cdOffset, true) // CD offset
  edv.setUint16(20, 0, true) // comment length

  // Cast to BlobPart[] — TS's default Uint8Array type parameter carries
  // ArrayBufferLike (which includes SharedArrayBuffer). Blob only accepts
  // ArrayBuffer-backed views, and every buffer above was freshly-allocated,
  // so the cast is safe.
  const parts: BlobPart[] = [...chunks, ...cdChunks, eocd] as unknown as BlobPart[]
  return new Blob(parts, { type: "application/zip" })
}

/* ---- CRC-32 (IEEE 802.3 polynomial 0xEDB88320) ---- */

let CRC_TABLE: Uint32Array | null = null

function ensureCrcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  CRC_TABLE = table
  return table
}

export function crc32(bytes: Uint8Array): number {
  const table = ensureCrcTable()
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

/* ---- Convenience: trigger a Blob download ---- */

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Delay revoke so Safari finishes the download.
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
