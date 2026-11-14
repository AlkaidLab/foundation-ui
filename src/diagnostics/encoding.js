// Log files written before the host wrote UTF-8 may still carry the Windows
// system code page (GBK on a Chinese installation). A whole-file TextDecoder
// pass would replace those bytes with U+FFFD and the original text would be
// gone before the viewer saw it, so decoding happens one line at a time:
// a line that is valid UTF-8 is kept as it is, and only a line that is not is
// read as GB18030 (the WHATWG superset of GBK).
//
// The API also carries bytes across incremental reads. A refresh can end in
// the middle of a multibyte sequence, so the remaining bytes stay pending
// until the next chunk (or the final call) completes them.

export const FALLBACK_ENCODING = 'gb18030'

const strictUtf8 = () => new TextDecoder('utf-8', { fatal: true })
const fallback = () => {
  try {
    return new TextDecoder(FALLBACK_ENCODING, { fatal: false })
  } catch {
    // A host without the full ICU data still gets a readable UTF-8 view with
    // replacement characters, and the caller can report that the fallback was
    // unavailable instead of losing the whole refresh.
    return new TextDecoder('utf-8', { fatal: false })
  }
}

const utf8 = strictUtf8()
const legacy = fallback()

const toBytes = (input) => {
  if (input instanceof Uint8Array) return input
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  return new Uint8Array(0)
}

const withoutBom = (bytes) => (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes)

/** Decode one physical line. Valid UTF-8 is returned unchanged; anything else is GB18030. */
export function decodeLogLine(bytes) {
  const line = toBytes(bytes)
  if (!line.length) return ''
  try {
    return utf8.decode(line)
  } catch {
    return legacy.decode(line)
  }
}

// A log written as UTF-16 (a BOM, or the zero bytes of ASCII text in two-byte units) is read as a whole: line by line would cut a unit in half.
function utf16Of(bytes) {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le'
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be'
  const n = Math.min(bytes.length, 512) & ~1
  if (n < 4) return ''
  let even = 0
  let odd = 0
  for (let i = 0; i < n; i += 2) { if (bytes[i] === 0) even++; if (bytes[i + 1] === 0) odd++ }
  const units = n / 2
  if (odd > units * 0.3 && even === 0) return 'utf-16le'
  if (even > units * 0.3 && odd === 0) return 'utf-16be'
  return ''
}

/** Decode a whole log held in memory. Line endings and a leading UTF-8 BOM are preserved or stripped as usual; UTF-16 is read as a whole. */
export function decodeLogBytes(input) {
  const all = toBytes(input)
  const wide = utf16Of(all)
  if (wide) {
    try { return new TextDecoder(wide).decode(all).replace(/^\uFEFF/, '') } catch { /* fall through to the line by line decoder */ }
  }
  const bytes = withoutBom(all)
  const out = []
  let start = 0
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0a) {
      out.push(decodeLogLine(bytes.subarray(start, i)))
      start = i + 1
    }
  }
  if (start < bytes.length) out.push(decodeLogLine(bytes.subarray(start)))
  else if (bytes.length === 0) return ''
  else out.push('')
  return out.join('\n')
}

/**
 * Incremental decoder for the live tail. The push method returns only complete
 * lines; the bytes of a line that is still arriving stay in the decoder, so a
 * split UTF-8 or GB18030 sequence is never decoded halfway.
 */
export function createLogByteDecoder() {
  let pending = new Uint8Array(0)
  let first = true
  return {
    push(input, { final = false } = {}) {
      let chunk = toBytes(input)
      if (first && chunk.length) {
        chunk = withoutBom(chunk)
        first = false
      }
      let bytes = pending
      if (chunk.length) {
        bytes = new Uint8Array(pending.length + chunk.length)
        bytes.set(pending, 0)
        bytes.set(chunk, pending.length)
      }
      let end = -1
      for (let i = bytes.length - 1; i >= 0; i--) {
        if (bytes[i] === 0x0a) {
          end = i
          break
        }
      }
      if (end < 0) {
        if (!final) {
          pending = bytes
          return ''
        }
        pending = new Uint8Array(0)
        return decodeLogLine(bytes)
      }
      const complete = bytes.subarray(0, end + 1)
      pending = bytes.subarray(end + 1)
      const text = decodeLogBytes(complete)
      if (!final) return text
      const rest = pending.length ? decodeLogLine(pending) : ''
      pending = new Uint8Array(0)
      return text + rest
    },
  }
}

/** The text of a fetch response that carries a log: its bytes decoded as decodeLogBytes does (UTF-8, GBK lines, UTF-16), never `response.text()`, which would turn legacy bytes into U+FFFD. */
export async function readLogResponse(response) {
  if (typeof response.arrayBuffer === 'function') return decodeLogBytes(new Uint8Array(await response.arrayBuffer()))
  return response.text()
}
