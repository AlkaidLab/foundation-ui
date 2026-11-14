// Release notes as plain text. The input is Markdown (with raw HTML from the release page generator) written by
// someone else; the output is a short list of plain lines that a product can print with text interpolation only.
//
//   - no HTML is kept and no link is ever followed or shown as a link (the text of a link stays, its target goes)
//   - control characters, bidirectional controls, zero-width characters and tag characters are removed
//   - emoji decoration at the start of a line is removed (the generated "## 🐟 title" heading)
//   - headings, emphasis, code marks, quotes and list markers are removed
//   - the generated sections (What's Changed heading, Full Changelog, Contributors) are left out
//   - input, number of lines, length of a line and total length are capped; `truncated` says a cap was hit

export const NOTES_LIMITS = Object.freeze({
  maxInputChars: 64 * 1024,
  maxLines: 120,
  maxLineChars: 220,
  maxTotalChars: 4000,
  maxTitleChars: 100,
})

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

// Characters that never belong in a line of text. Newlines are handled before this runs.
const UNSAFE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u061C\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFB]|[\u{E0000}-\u{E007F}]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/gu

const EMOJI_LEAD = /^[\s\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u20E3]+/u

const clean = (value) =>
  value
    .replace(/\r\n?|[\u2028\u2029\u0085\u000B\u000C]/g, '\n')
    .replace(/\t/g, ' ')
    .replace(UNSAFE, '')

const cutChars = (text, max) => {
  const chars = Array.from(text)
  if (chars.length <= max) return text
  return `${chars.slice(0, Math.max(1, max - 1)).join('').trimEnd()}…`
}

const decodeEntities = (text) =>
  text.replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/gi, (all, name) => (name === '#39' ? "'" : ENTITIES[name.toLowerCase()] ?? all))

const stripHtml = (text) =>
  text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[A-Za-z][^>\n]*>/g, '')

// One line of inline Markdown to plain text.
const inline = (text) => {
  let out = text
    .replace(/!\[[^\]]*\]\((?:[^()]|\([^()]*\))*\)/g, '')
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/(?:https?:\/\/|www\.)[^\s)>\]]+/gi, '')
  for (let i = 0; i < 2; i += 1) {
    out = out
      .replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '$2')
      .replace(/(?<![\w*])\*(?=[^\s*])(.+?)(?<=[^\s*])\*(?![\w*])/g, '$1')
      .replace(/(?<![\w_])_(?=[^\s_])(.+?)(?<=[^\s_])_(?![\w_])/g, '$1')
      .replace(/~~(?=\S)(.+?)(?<=\S)~~/g, '$1')
  }
  return decodeEntities(
    out
      .replace(/`+([^`]*)`+/g, '$1')
      .replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, '$1'),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/
const RULE = /^(?:-{3,}|\*{3,}|_{3,})$/
const BULLET = /^(?:[-*+•]|\d{1,3}[.)])\s+(?:\[[ xX]\]\s+)?(.*)$/
const FENCE = /^(```|~~~)/
const LINK_DEFINITION = /^\[[^\]]+\]:\s*\S+/
const GENERATED_HEAD = /^what['’]?s changed$/i
const CONTRIBUTORS_HEAD = /^(?:new\s+)?contributors?$/i
const FULL_CHANGELOG = /^full change\s*log\b/i
// "docs: update user guide links by @Yundi339 in #1171", the generated suffix of every merged change.
const BY_REF = /^(.*?)\s+by\s+(@\S+?)(?:\s+in\s+(#\d+))?$/

const stripLead = (text) => text.replace(EMOJI_LEAD, '').trim()

/**
 * @param {unknown} markdown
 * @param {Partial<typeof NOTES_LIMITS>} [options]
 * @returns {{ title: string, lines: Array<{ kind: 'text'|'bullet'|'quote'|'heading', text: string, by?: string, ref?: string }>, truncated: boolean }}
 */
export const parseReleaseNotes = (markdown, options = {}) => {
  const limits = { ...NOTES_LIMITS, ...options }
  const result = { title: '', lines: [], truncated: false, fullChangelog: '' }
  if (typeof markdown !== 'string' || markdown === '') return result
  // the compare link of the generated 'Full Changelog' line (the old version card showed it as a link of its own); only a GitHub compare address is kept
  result.fullChangelog = /full change\s*log[^\n]*?(https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/compare\/[^\s)<>"'\]]+)/i.exec(markdown)?.[1] || ''

  let source = markdown
  if (source.length > limits.maxInputChars) {
    source = source.slice(0, limits.maxInputChars)
    result.truncated = true
  }
  source = stripHtml(clean(source))

  let inFence = false
  let skipSection = false
  let total = 0
  let sawContent = false

  const push = (line) => {
    if (result.lines.length >= limits.maxLines || total >= limits.maxTotalChars) {
      result.truncated = true
      return false
    }
    const text = cutChars(line.text, limits.maxLineChars)
    if (text !== line.text) result.truncated = true
    total += Array.from(text).length
    result.lines.push({ ...line, text })
    return true
  }

  // A line is cut before its Markdown is read, so a hostile line cannot make the inline rules slow.
  const rawLimit = limits.maxLineChars * 4
  for (const raw of source.split('\n')) {
    let line = raw.trim()
    if (line.length > rawLimit) {
      line = line.slice(0, rawLimit)
      result.truncated = true
    }
    if (FENCE.test(line)) {
      inFence = !inFence
      continue
    }
    if (line === '' || RULE.test(line) || LINK_DEFINITION.test(line)) continue

    if (inFence) {
      if (!skipSection) {
        const text = stripLead(decodeEntities(line).replace(/\s+/g, ' '))
        if (text && !push({ kind: 'text', text })) break
        sawContent = true
      }
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      const text = stripLead(inline(heading[2]))
      if (CONTRIBUTORS_HEAD.test(text)) {
        skipSection = true
        continue
      }
      skipSection = false
      if (GENERATED_HEAD.test(text) || text === '') continue
      if (!sawContent && !result.title) {
        result.title = cutChars(text, limits.maxTitleChars)
        sawContent = true
        continue
      }
      sawContent = true
      if (!push({ kind: 'heading', text })) break
      continue
    }
    if (skipSection) continue

    let kind = 'text'
    let body = line
    const quote = /^>+\s?(.*)$/.exec(body)
    if (quote) {
      kind = 'quote'
      body = quote[1]
    }
    const bullet = kind === 'text' ? BULLET.exec(body) : null
    if (bullet) {
      kind = 'bullet'
      body = bullet[1]
    }

    let text = stripLead(inline(body))
    if (text === '' || FULL_CHANGELOG.test(text)) continue

    const entry = { kind, text }
    if (kind === 'bullet') {
      const byRef = BY_REF.exec(text)
      if (byRef && byRef[1]) {
        entry.text = byRef[1]
        entry.by = byRef[2]
        if (byRef[3]) entry.ref = byRef[3]
      }
    }
    sawContent = true
    if (!push(entry)) break
  }

  return result
}

/** The first lines that fit; `hidden` is how many lines the compact view leaves out. */
export const previewNotes = (parsed, { maxLines = 5, maxChars = 360 } = {}) => {
  const lines = parsed?.lines || []
  const shown = []
  let chars = 0
  for (const line of lines) {
    const size = Array.from(line.text).length
    if (shown.length >= maxLines || (shown.length > 0 && chars + size > maxChars)) break
    shown.push(line)
    chars += size
  }
  return { lines: shown, hidden: lines.length - shown.length }
}
