// A small ZIP writer (stored, no compression): enough for a few text files, no dependency. Names are UTF-8.
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
export function crc32(bytes) { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const enc = new TextEncoder()
const bytesOf = (data) => (typeof data === 'string' ? enc.encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data))

function dosTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }
}

/** @param {Array<{ name: string, data: string | Uint8Array }>} files @returns {Uint8Array} */
export function zipStore(files, when = new Date()) {
  const parts = []
  const central = []
  let offset = 0
  const { time, date } = dosTime(when)
  for (const file of files) {
    const name = enc.encode(file.name.replace(/\\/g, '/'))
    const data = bytesOf(file.data)
    const crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(8, 0, true)
    local.setUint16(10, time, true); local.setUint16(12, date, true); local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true)
    local.setUint16(26, name.length, true); local.setUint16(28, 0, true)
    parts.push(new Uint8Array(local.buffer), name, data)
    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true); entry.setUint16(4, 20, true); entry.setUint16(6, 20, true); entry.setUint16(8, 0x0800, true); entry.setUint16(10, 0, true)
    entry.setUint16(12, time, true); entry.setUint16(14, date, true); entry.setUint32(16, crc, true); entry.setUint32(20, data.length, true); entry.setUint32(24, data.length, true)
    entry.setUint16(28, name.length, true); entry.setUint32(42, offset, true)
    central.push(new Uint8Array(entry.buffer), name)
    offset += 30 + name.length + data.length
  }
  const centralSize = central.reduce((n, p) => n + p.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, centralSize, true); end.setUint32(16, offset, true)
  const all = [...parts, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of all) { out.set(p, at); at += p.length }
  return out
}

/** Reads a stored ZIP back (tests and the preview of a saved bundle). */
export function zipList(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = bytes.length - 22
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--
  if (end < 0) throw new Error('not a zip')
  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  const dec = new TextDecoder()
  const files = []
  for (let i = 0; i < count; i++) {
    const size = view.getUint32(at + 24, true), nameLen = view.getUint16(at + 28, true), extra = view.getUint16(at + 30, true), comment = view.getUint16(at + 32, true), local = view.getUint32(at + 42, true)
    const name = dec.decode(bytes.subarray(at + 46, at + 46 + nameLen))
    const lname = view.getUint16(local + 26, true), lextra = view.getUint16(local + 28, true)
    const data = bytes.subarray(local + 30 + lname + lextra, local + 30 + lname + lextra + size)
    files.push({ name, data, crc: view.getUint32(at + 16, true) })
    at += 46 + nameLen + extra + comment
  }
  return files
}
