// A real PNG for the tests (solid colour, RGBA), with the metadata chunks a screenshot tool may add.
import { deflateSync } from 'node:zlib'
import { crc32 } from '../src/diagnostics/zip.js'

const u32 = (n) => Uint8Array.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255])
const chunk = (type, data = new Uint8Array(0)) => {
  const t = Uint8Array.from([...type].map((c) => c.charCodeAt(0)))
  const body = new Uint8Array(4 + data.length); body.set(t); body.set(data, 4)
  return Uint8Array.from([...u32(data.length), ...body, ...u32(crc32(body))])
}
const text = (key, value) => chunk('tEXt', Uint8Array.from([...`${key}\0${value}`].map((c) => c.charCodeAt(0))))
export function makePng(width = 8, height = 6, { meta = false, pixel = [200, 200, 200, 255] } = {}) {
  const header = Uint8Array.from([...u32(width), ...u32(height), 8, 6, 0, 0, 0])
  const rows = []
  for (let y = 0; y < height; y += 1) { rows.push(0); for (let x = 0; x < width; x += 1) rows.push(...pixel) }
  const parts = [Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header)]
  if (meta) parts.push(text('Author', 'Sky Hua'), text('Comment', 'C:\\Users\\Sky\\Desktop\\a.png'), chunk('eXIf', Uint8Array.from([77, 77, 0, 42])), chunk('tIME', Uint8Array.from([7, 234, 11, 9, 23, 0, 0])), chunk('iTXt', Uint8Array.from([...'XML:com.adobe.xmp\0\0\0\0\0<x/>'].map((c) => c.charCodeAt(0)))))
  parts.push(chunk('IDAT', deflateSync(Uint8Array.from(rows))), chunk('IEND'))
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) { out.set(p, at); at += p.length }
  return out
}
