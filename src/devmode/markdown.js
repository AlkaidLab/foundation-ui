// The Markdown of GitHub issues and comments, read into a small tree (no HTML is ever produced here): the page draws the tree with Vue elements, so nothing of the text can become markup or script.
// What GitHub's own renderer shows in an issue is covered: headings (ATX and setext), paragraphs with their line breaks (GitHub keeps every newline of an issue), fenced and indented code, block quotes, bullet,
// numbered and task lists (nested), rules, tables, emphasis, strikethrough, code spans, links, bare addresses, images (also as <img>), <br>, <a>, and <details>/<summary> (flattened). HTML comments (the issue templates are full
// of them) are dropped; any other tag is shown as the text it is. Addresses are checked: a link may be http, https or mailto, an image https, anything else (javascript:, data:, relative paths) is shown as plain text.
//
//   block  { t: 'p' | 'h' | 'code' | 'quote' | 'ul' | 'ol' | 'hr' | 'table', ... }
//   inline { t: 'text' | 'code' | 'b' | 'i' | 'del' | 'a' | 'img' | 'br', ... }

const MAX_DEPTH = 8

/** The address of a link (http, https, mailto) or of an image (https), or '' when it must not be used. */
export function safeUrl(raw, { image = false } = {}) {
  const u = String(raw || '').trim().replace(/^<|>$/g, '')
  // control characters and spaces cannot be part of an address that passes: `java\nscript:` and friends
  if (!u || /[\u0000- \u007f]/.test(u)) return ''
  if (image) return /^https:\/\//i.test(u) ? u : ''
  return /^(https?:\/\/|mailto:)/i.test(u) ? u : ''
}

const TAGS = 'details|summary|p|div|span|sub|sup|kbd|b|i|em|strong|u|s|strike|del|ins|br|hr|img|a|h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|picture|source|center|code|pre|blockquote|dl|dt|dd|abbr|small|mark|font|figure|figcaption'
const TAG = new RegExp(`^<(/?)(${TAGS})(\\s[^<>]*)?\\s*/?>`, 'i')
const ATTR = (tag, name) => { const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(tag); return m ? (m[1] ?? m[2] ?? m[3] ?? '') : '' }
const decode = (t) => t.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' })[e])
const PUNCT = /[!-/:-@[-`{-~]/

// ---- inline ----
const alnum = (c) => !!c && /[\p{L}\p{N}]/u.test(c)

/** Index of the `]` that closes the `[` at `from`, brackets nested and code spans and escapes skipped; -1 when there is none. */
function closeBracket(s, from) {
  let depth = 0
  for (let i = from; i < s.length; i++) {
    const c = s[i]
    if (c === '\\') { i++; continue }
    if (c === '`') { const m = /^`+/.exec(s.slice(i)); const end = s.indexOf(m[0], i + m[0].length); if (end > 0) { i = end + m[0].length - 1; continue } i += m[0].length - 1; continue }
    if (c === '[') depth++
    else if (c === ']' && --depth === 0) return i
  }
  return -1
}
/** `(url "title")` at `at`: { url, end } with `end` after the `)`, or null. */
function destination(s, at) {
  if (s[at] !== '(') return null
  let i = at + 1
  while (s[i] === ' ') i++
  let url = ''
  if (s[i] === '<') { const e = s.indexOf('>', i); if (e < 0) return null; url = s.slice(i + 1, e); i = e + 1 } else {
    let depth = 0
    const start = i
    for (; i < s.length; i++) { const c = s[i]; if (c === '\\') { i++; continue } if (/\s/.test(c)) break; if (c === '(') depth++; else if (c === ')') { if (depth === 0) break; depth-- } }
    url = s.slice(start, i)
  }
  while (s[i] === ' ') i++
  if (s[i] === '"' || s[i] === "'") { const q = s[i]; const e = s.indexOf(q, i + 1); if (e < 0) return null; i = e + 1; while (s[i] === ' ') i++ }
  return s[i] === ')' ? { url, end: i + 1 } : null
}
const push = (out, node) => { const last = out[out.length - 1]; if (node.t === 'text' && last && last.t === 'text') last.v += node.v; else out.push(node) }

export function inline(s, depth = 0) {
  const out = []
  if (depth > MAX_DEPTH) return [{ t: 'text', v: s }]
  let i = 0
  const text = (v) => { if (v) push(out, { t: 'text', v }) }
  while (i < s.length) {
    const c = s[i]
    const rest = s.slice(i)
    if (c === '\\' && i + 1 < s.length) {
      if (s[i + 1] === '\n') { out.push({ t: 'br' }); i += 2; continue }
      if (PUNCT.test(s[i + 1])) { text(s[i + 1]); i += 2; continue }
    }
    if (c === '\n') { out.push({ t: 'br' }); i++; continue }
    if (c === '`') {
      const run = /^`+/.exec(rest)[0]
      const end = s.indexOf(run, i + run.length)
      if (end > 0 && s[end + run.length] !== '`') {
        let v = s.slice(i + run.length, end).replace(/\n/g, ' ')
        if (v.length > 2 && v.startsWith(' ') && v.endsWith(' ') && v.trim()) v = v.slice(1, -1)
        out.push({ t: 'code', v }); i = end + run.length; continue
      }
      text(run); i += run.length; continue
    }
    if ((c === '!' && s[i + 1] === '[') || c === '[') {
      const image = c === '!'
      const open = image ? i + 1 : i
      const close = closeBracket(s, open)
      const dest = close > 0 ? destination(s, close + 1) : null
      if (dest) {
        const label = s.slice(open + 1, close)
        if (image) {
          const src = safeUrl(dest.url, { image: true })
          if (src) out.push({ t: 'img', src, alt: decode(label.replace(/[\\*_`]/g, '')) })
          else text(label)
        } else {
          const href = safeUrl(dest.url)
          const kids = inline(label, depth + 1)
          if (href) out.push({ t: 'a', href, c: kids }); else out.push(...kids)
        }
        i = dest.end; continue
      }
    }
    if (c === '<') {
      const auto = /^<((?:https?:\/\/|mailto:)[^\s<>]+)>/i.exec(rest)
      if (auto) { const href = safeUrl(auto[1]); if (href) out.push({ t: 'a', href, c: [{ t: 'text', v: auto[1] }] }); i += auto[0].length; continue }
      const tag = TAG.exec(rest)
      if (tag) {
        const name = tag[2].toLowerCase()
        if (!tag[1]) {
          if (name === 'br') out.push({ t: 'br' })
          else if (name === 'img') { const src = safeUrl(ATTR(tag[0], 'src'), { image: true }); const alt = decode(ATTR(tag[0], 'alt')); if (src) out.push({ t: 'img', src, alt }); else text(alt) }
          else if (name === 'a') {
            const close = rest.search(/<\/a\s*>/i)
            const href = safeUrl(decode(ATTR(tag[0], 'href')))
            if (close > 0) {
              const kids = inline(rest.slice(tag[0].length, close), depth + 1)
              if (href) out.push({ t: 'a', href, c: kids }); else out.push(...kids)
              i += close + rest.slice(close).indexOf('>') + 1; continue
            }
          } else if (name === 'summary') { const close = rest.search(/<\/summary\s*>/i); if (close > 0) { out.push({ t: 'b', c: inline(rest.slice(tag[0].length, close), depth + 1) }); out.push({ t: 'br' }); i += close + '</summary>'.length; continue } }
        }
        i += tag[0].length; continue // any other known tag is dropped, the text inside stays
      }
    }
    // a bare address
    if ((c === 'h' || c === 'H') && /^https?:\/\//i.test(rest) && !alnum(s[i - 1])) {
      const m = /^https?:\/\/[^\s<>]+/i.exec(rest)
      let url = m[0]
      while (/[.,;:!?'"*_~]$/.test(url) || (url.endsWith(')') && (url.match(/\(/g) || []).length < (url.match(/\)/g) || []).length)) url = url.slice(0, -1)
      const href = safeUrl(url)
      if (href) { out.push({ t: 'a', href, c: [{ t: 'text', v: url }] }); i += url.length; continue }
    }
    // emphasis: ** __ ~~ then * _
    const pair = c === '~' ? (rest.startsWith('~~') ? '~~' : '') : (c === '*' || c === '_') ? (rest.startsWith(c + c) ? c + c : c) : ''
    if (pair) {
      const after = s[i + pair.length]
      const before = s[i - 1]
      const opens = after !== undefined && !/\s/.test(after) && !(c === '_' && alnum(before))
      if (opens) {
        let j = i + pair.length
        let end = -1
        for (; j < s.length; j++) {
          if (s[j] === '\\') { j++; continue }
          if (s[j] === '`') { const run = /^`+/.exec(s.slice(j))[0]; const e = s.indexOf(run, j + run.length); j = e > 0 ? e + run.length - 1 : j + run.length - 1; continue }
          if (s.startsWith(pair, j) && j > i + pair.length && !/\s/.test(s[j - 1]) && !(c === '_' && alnum(s[j + pair.length]))) { end = j; break }
        }
        if (end > 0) {
          const kids = inline(s.slice(i + pair.length, end), depth + 1)
          out.push({ t: pair === '~~' ? 'del' : pair.length === 2 ? 'b' : 'i', c: kids })
          i = end + pair.length; continue
        }
      }
      text(pair); i += pair.length; continue
    }
    // plain text up to the next character that may start something
    let j = i + 1
    while (j < s.length && !'\\\n`[!<*_~hH'.includes(s[j])) j++
    text(decode(s.slice(i, j)))
    i = j
  }
  return out
}

// ---- blocks ----
const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)[^`]*$/
const HEADING = /^ {0,3}(#{1,6})(?:\s+(.*?))?\s*$/
const RULE = /^ {0,3}([-*_])(?: *\1){2,} *$/
const LIST = /^( *)([-*+]|\d{1,9}[.)])( +|$)(.*)$/
const TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(?:\|\s*:?-{1,}:?\s*)*\|?\s*$/
const indentOf = (l) => /^ */.exec(l)[0].length

const startsBlock = (l, next) => FENCE.test(l) || (HEADING.test(l) && /^ {0,3}#{1,6}(\s|$)/.test(l)) || RULE.test(l) || /^ {0,3}>/.test(l) || (LIST.test(l) && /^( *)([-*+]|1[.)])( |$)/.test(l)) || (l.includes('|') && next !== undefined && TABLE_SEP.test(next) && next.includes('-') && (next.includes('|') || l.trim().startsWith('|')))

const cells = (line) => { let t = line.trim(); if (t.startsWith('|')) t = t.slice(1); if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1); return t.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|')) }

/** Remove the HTML comments, except inside fenced code; a comment may span lines. */
function withoutComments(lines) {
  const out = []
  let fence = '', open = false
  for (const raw of lines) {
    let l = raw
    if (!open) {
      const f = /^ {0,3}(`{3,}|~{3,})/.exec(l)
      if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length && /^ {0,3}[`~]+\s*$/.test(l)) fence = ''; out.push(l); continue }
      if (f) { fence = f[1]; out.push(l); continue }
    }
    if (open) { const e = l.indexOf('-->'); if (e < 0) continue; l = l.slice(e + 3); open = false }
    for (;;) { const s = l.indexOf('<!--'); if (s < 0) break; const e = l.indexOf('-->', s + 4); if (e < 0) { l = l.slice(0, s); open = true; break } l = l.slice(0, s) + l.slice(e + 3) }
    out.push(l)
  }
  return out
}

function blocks(lines, depth) {
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    let m
    if ((m = FENCE.exec(line))) {
      const mark = m[1]
      const body = []
      i++
      while (i < lines.length && !(new RegExp(`^ {0,3}${mark[0]}{${mark.length},}\\s*$`).test(lines[i]))) { body.push(lines[i].slice(Math.min(indentOf(line), indentOf(lines[i])))); i++ }
      i++
      out.push({ t: 'code', lang: m[2] || '', text: body.join('\n') })
      continue
    }
    if (/^ {0,3}#{1,6}(\s|$)/.test(line) && (m = HEADING.exec(line))) { out.push({ t: 'h', level: m[1].length, c: inline((m[2] || '').replace(/\s+#+$/, '')) }); i++; continue }
    if (RULE.test(line)) { out.push({ t: 'hr' }); i++; continue }
    if (/^ {0,3}>/.test(line)) {
      const body = []
      while (i < lines.length && /^ {0,3}>/.test(lines[i])) { body.push(lines[i].replace(/^ {0,3}> ?/, '')); i++ }
      out.push({ t: 'quote', c: depth < MAX_DEPTH ? blocks(body, depth + 1) : [{ t: 'p', c: [{ t: 'text', v: body.join('\n') }] }] })
      continue
    }
    if ((m = LIST.exec(line)) && depth < MAX_DEPTH) {
      const ordered = /\d/.test(m[2])
      const base = m[1].length
      const items = []
      const start = ordered ? parseInt(m[2], 10) : 1
      let prev = Infinity
      while (i < lines.length) {
        const lm = LIST.exec(lines[i])
        if (!lm || /\d/.test(lm[2]) !== ordered || lm[1].length < base || lm[1].length >= prev) break
        const content = lm[1].length + lm[2].length + (lm[3].length > 4 ? 1 : lm[3].length || 1)
        prev = content
        const body = [lm[4] || '']
        i++
        for (; i < lines.length; i++) {
          const l = lines[i]
          if (!l.trim()) {
            let k = i + 1
            while (k < lines.length && !lines[k].trim()) k++
            if (k < lines.length && indentOf(lines[k]) >= content) { body.push(''); continue }
            break
          }
          if (indentOf(l) >= content) { body.push(l.slice(content)); continue }
          const prevBlank = !lines[i - 1].trim()
          if (LIST.test(l) || prevBlank || startsBlock(l, lines[i + 1])) break
          body.push(l.trim()) // a lazy continuation of the paragraph
        }
        let task = null
        const t = /^\[( |x|X)\]\s+/.exec(body[0])
        if (t) { task = t[1] !== ' '; body[0] = body[0].slice(t[0].length) }
        items.push({ task, c: blocks(body, depth + 1) })
        // a blank line between two items of the same list does not end it
        let k = i
        while (k < lines.length && !lines[k].trim()) k++
        if (k > i && k < lines.length) { const nm = LIST.exec(lines[k]); if (nm && /\d/.test(nm[2]) === ordered && nm[1].length === base) i = k }
      }
      out.push({ t: ordered ? 'ol' : 'ul', start, items })
      continue
    }
    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const head = cells(line)
      const seps = cells(lines[i + 1])
      if (head.length === seps.length || seps.length > 0) {
        const align = seps.map((s) => (s.startsWith(':') && s.endsWith(':') ? 'center' : s.endsWith(':') ? 'right' : s.startsWith(':') ? 'left' : ''))
        const rows = []
        i += 2
        while (i < lines.length && lines[i].trim() && lines[i].includes('|')) { rows.push(cells(lines[i])); i++ }
        out.push({ t: 'table', align, head: head.map((c) => inline(c)), rows: rows.map((r) => head.map((_, k) => inline(r[k] || ''))) })
        continue
      }
    }
    if (indentOf(line) >= 4 && !(out.length && out[out.length - 1].t === 'p' && lines[i - 1]?.trim())) {
      const body = []
      while (i < lines.length && (indentOf(lines[i]) >= 4 || !lines[i].trim())) { body.push(lines[i].slice(4)); i++ }
      while (body.length && !body[body.length - 1].trim()) body.pop()
      out.push({ t: 'code', lang: '', text: body.join('\n') })
      continue
    }
    // a paragraph, or a setext heading when a line of = or - follows it
    const para = [line.trim()]
    i++
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i], lines[i + 1])) {
      if (/^ {0,3}(=+|-+)\s*$/.test(lines[i]) && !RULE.test(lines[i]) || /^ {0,3}=+\s*$/.test(lines[i])) { out.push({ t: 'h', level: lines[i].trim()[0] === '=' ? 1 : 2, c: inline(para.join('\n')) }); i++; para.length = 0; break }
      para.push(lines[i].trim()); i++
    }
    if (para.length) {
      // `---` straight under a paragraph is a setext heading in CommonMark and GitHub; startsBlock took it as a rule, which is what people meant in an issue
      const kids = inline(para.join('\n'))
      if (kids.length && !(kids.length === 1 && kids[0].t === 'text' && !kids[0].v.trim())) out.push({ t: 'p', c: kids })
    }
  }
  return out
}

/** Markdown text to a list of blocks. */
export function parseMarkdown(source) {
  const lines = String(source || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')
  return blocks(withoutComments(lines), 0)
}

/** The plain text of an inline list (for a label or a title). */
export const inlineText = (nodes) => nodes.map((n) => (n.t === 'text' || n.t === 'code' ? n.v : n.t === 'br' ? ' ' : n.t === 'img' ? n.alt : n.c ? inlineText(n.c) : '')).join('')
