// A small, safe Markdown reader for announcements. It turns text into a tree of plain nodes (never HTML) that a component draws with real elements, so nothing a file says can run
// or change the page. Supported: headings, paragraphs (a single line break is kept), bullet and numbered lists, quotes, fenced code, rules, **bold**, *italic*, ~~strike~~, `code`,
// [links] and ![images]. Links and images are https only; anything else stays as the text it was written as. Raw HTML is text.

export const MARKDOWN_LIMITS = Object.freeze({ maxChars: 8000, maxBlocks: 200, maxDepth: 6, maxUrl: 500 })

const safeUrl = (value) => {
  const text = String(value || '').trim()
  if (!text || text.length > MARKDOWN_LIMITS.maxUrl || /[\u0000- \u007f-\u009f]/.test(text)) return null
  try {
    const url = new URL(text)
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

const isWordChar = (ch) => !!ch && /[\p{L}\p{N}]/u.test(ch)

// Inline text -> nodes. `depth` stops runaway nesting.
export function parseInline(text, depth = 0) {
  const out = []
  let buffer = ''
  const flush = () => { if (buffer) { out.push({ t: 'text', v: buffer }); buffer = '' } }
  let i = 0
  const n = text.length
  while (i < n) {
    const ch = text[i]
    if (ch === '\\' && i + 1 < n && /[\\`*_{}[\]()#+\-.!~>]/.test(text[i + 1])) { buffer += text[i + 1]; i += 2; continue }
    if (ch === '`') {
      const end = text.indexOf('`', i + 1)
      if (end > i + 1) { flush(); out.push({ t: 'code', v: text.slice(i + 1, end) }); i = end + 1; continue }
    }
    if ((ch === '!' && text[i + 1] === '[') || ch === '[') {
      const image = ch === '!'
      const open = image ? i + 1 : i
      const close = text.indexOf(']', open + 1)
      if (close > open && text[close + 1] === '(') {
        const end = text.indexOf(')', close + 2)
        if (end > close + 1) {
          const href = safeUrl(text.slice(close + 2, end).split(/\s+/)[0])
          if (href) {
            flush()
            const label = text.slice(open + 1, close)
            out.push(image ? { t: 'img', src: href, alt: label } : { t: 'link', href, c: depth < MARKDOWN_LIMITS.maxDepth ? parseInline(label, depth + 1) : [{ t: 'text', v: label }] })
            i = end + 1
            continue
          }
        }
      }
    }
    if ((ch === '*' && text[i + 1] === '*') || (ch === '~' && text[i + 1] === '~')) {
      const mark = text.slice(i, i + 2)
      const end = text.indexOf(mark, i + 2)
      if (end > i + 2 && depth < MARKDOWN_LIMITS.maxDepth) { flush(); out.push({ t: mark === '**' ? 'strong' : 'del', c: parseInline(text.slice(i + 2, end), depth + 1) }); i = end + 2; continue }
    }
    if ((ch === '*' || ch === '_') && text[i + 1] !== ch && text[i + 1] !== ' ' && !(ch === '_' && isWordChar(text[i - 1]))) {
      let end = text.indexOf(ch, i + 1)
      while (end > 0 && ch === '_' && isWordChar(text[end + 1])) end = text.indexOf(ch, end + 1)
      if (end > i + 1 && text[end - 1] !== ' ' && depth < MARKDOWN_LIMITS.maxDepth) { flush(); out.push({ t: 'em', c: parseInline(text.slice(i + 1, end), depth + 1) }); i = end + 1; continue }
    }
    if (ch === '\n') { flush(); out.push({ t: 'br' }); i += 1; continue }
    buffer += ch
    i += 1
  }
  flush()
  return out
}

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/
const BULLET = /^\s{0,3}[-*+]\s+(.*)$/
const ORDERED = /^\s{0,3}(\d{1,3})[.)]\s+(.*)$/
const RULE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/
const FENCE = /^\s{0,3}```/

/** Markdown text -> blocks: { t: 'h', level, c } | { t: 'p', c } | { t: 'ul'|'ol', items: [c] } | { t: 'quote', c: blocks } | { t: 'code', v } | { t: 'hr' }. Never throws. */
export function parseMarkdown(source, depth = 0) {
  const text = typeof source === 'string' ? source.replace(/\r\n?/g, '\n').slice(0, MARKDOWN_LIMITS.maxChars) : ''
  const lines = text.split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length && blocks.length < MARKDOWN_LIMITS.maxBlocks) {
    const line = lines[i]
    if (!line.trim()) { i += 1; continue }
    if (FENCE.test(line)) {
      const body = []
      i += 1
      while (i < lines.length && !FENCE.test(lines[i])) { body.push(lines[i]); i += 1 }
      i += 1
      blocks.push({ t: 'code', v: body.join('\n') })
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) { blocks.push({ t: 'h', level: heading[1].length, c: parseInline(heading[2]) }); i += 1; continue }
    if (RULE.test(line)) { blocks.push({ t: 'hr' }); i += 1; continue }
    if (/^\s{0,3}>/.test(line)) {
      const quote = []
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) { quote.push(lines[i].replace(/^\s{0,3}>\s?/, '')); i += 1 }
      blocks.push({ t: 'quote', c: depth < MARKDOWN_LIMITS.maxDepth ? parseMarkdown(quote.join('\n'), depth + 1) : [] })
      continue
    }
    const bullet = BULLET.exec(line)
    const ordered = ORDERED.exec(line)
    if (bullet || ordered) {
      const kind = bullet ? 'ul' : 'ol'
      const items = []
      while (i < lines.length) {
        const m = kind === 'ul' ? BULLET.exec(lines[i]) : ORDERED.exec(lines[i])
        if (!m) break
        items.push(parseInline(kind === 'ul' ? m[1] : m[2]))
        i += 1
      }
      blocks.push({ t: kind, items })
      continue
    }
    const para = []
    while (i < lines.length && lines[i].trim() && !FENCE.test(lines[i]) && !HEADING.test(lines[i]) && !RULE.test(lines[i]) && !/^\s{0,3}>/.test(lines[i]) && !BULLET.test(lines[i]) && !ORDERED.test(lines[i])) { para.push(lines[i].trim()); i += 1 }
    if (para.length) blocks.push({ t: 'p', c: parseInline(para.join('\n')) })
    else i += 1
  }
  return blocks
}

/** The first image of a document (https), for a banner when the item has none. */
export function firstImage(source) {
  const match = /!\[[^\]]*\]\((https:[^)\s]+)/.exec(String(source || ''))
  return match ? safeUrl(match[1]) : null
}

/** Plain text of a document (no marks), for a one-line summary. */
export function plainText(source, max = 120) {
  const flat = (nodes) => nodes.map((n) => (n.t === 'text' || n.t === 'code' ? n.v : n.t === 'br' ? ' ' : n.t === 'img' ? '' : flat(n.c || []))).join('')
  const lines = (blocks) => blocks.flatMap((b) => (b.t === 'h' || b.t === 'p' ? [flat(b.c)] : b.t === 'ul' || b.t === 'ol' ? b.items.map(flat) : b.t === 'quote' ? lines(b.c) : []))
  const text = lines(parseMarkdown(source)).join(' · ').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
