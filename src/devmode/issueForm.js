// GitHub Issue Forms: reading the templates of a repository (.github/ISSUE_TEMPLATE/*.yml) and the body of an issue that was made from one. Pure and framework-free.
//
// An issue made from a form has the body `### <label>\n\n<value>` for each field, in the order of the template; the values are what the person wrote, `_No response_` for an empty one, `- [x] …` for a checkbox, a fenced
// block for a field with `render:`. The `type: markdown` parts of a template never reach the body.
//
// parseIssueForm(body, { templates }) -> null | { form: { file, name, kind: 'bug' | 'feature' | 'form', lang }, feedback: boolean, lead: string, fields: [...], empty: [labels], diagnostics: null | {...} }
// null means "this is not one of the forms we know": the page then draws the body as plain Markdown, unchanged. The rules:
//   1. The body is split at its `### ` headings (headings inside a fenced block do not count). Text before the first heading is the lead.
//   2. A heading matches a field of a template when its label is the same after trimming and collapsing spaces (the emoji is part of the label); failing that, when the label without its leading emoji is the same.
//   3. A form is accepted when the headings of the body match its labels in one of two ways: every required field of the template is there (and at least two headings match), or at least three headings match and the
//      matched ones are at least 60 % of all the headings of the body. The form with the most matches wins. A body that was edited so far that neither holds is not a form.
//   4. A heading that matches no field (or a second time) belongs to the field before it when that one is a textarea (the person wrote a heading inside their text); otherwise it is an extra section, kept in place.
//   5. Empty values (`_No response_`, `_无_`, blank, an empty fence) are left out of `fields` and named in `empty`.
//   6. The body of our own feedback flow is the same form plus a first line `<!-- fs-feedback v1 -->` and a last section 「🔎 诊断信息」/「🔎 Diagnostics」, which is read into `diagnostics`.
import { BUILTIN_TEMPLATES } from './issueTemplates.js'
import { safeUrl } from './markdown.js'

/** The marker that the feedback flow writes on the first line of the body. */
export const FEEDBACK_MARKER = '<!-- fs-feedback v1 -->'
/** The labels of the diagnostics section the feedback flow adds after the last field of the form. */
export const DIAG_LABELS = Object.freeze({ zh: '🔎 诊断信息', en: '🔎 Diagnostics' })

// ---------------------------------------------------------------- the YAML of a template (the subset GitHub Issue Forms use)
/** Reads a YAML text of maps, lists, scalars, flow lists and block scalars (`|`, `>`); enough for ISSUE_TEMPLATE files. Anchors, tags and multi-document files are not supported. */
export function parseYaml(text) {
  const lines = String(text ?? '').replace(/\r/g, '').split('\n')
  let i = 0
  const indentOf = (l) => l.length - l.trimStart().length
  const skip = () => { while (i < lines.length && (!lines[i].trim() || lines[i].trim().startsWith('#'))) i++ }
  const scalar = (raw) => {
    const s = raw.trim()
    if (s.startsWith('"')) { try { return JSON.parse(s) } catch { return s.replace(/^"|"$/g, '') } }
    if (s.startsWith("'")) return s.replace(/^'|'$/g, '').replace(/''/g, "'")
    if (s.startsWith('[') && s.endsWith(']')) { try { return JSON.parse(s) } catch { return s.slice(1, -1).split(',').map((x) => scalar(x)).filter((x) => x !== '') } }
    if (s === 'true') return true
    if (s === 'false') return false
    if (s === 'null' || s === '~') return null
    return s.replace(/\s+#.*$/, '')
  }
  const blockScalar = (style, parentIndent) => {
    const out = []
    while (i < lines.length && (!lines[i].trim() || indentOf(lines[i]) > parentIndent)) out.push(lines[i++])
    while (out.length && !out[out.length - 1].trim()) out.pop()
    const first = out.find((l) => l.trim())
    const cut = first ? indentOf(first) : 0
    const rows = out.map((l) => l.slice(Math.min(cut, indentOf(l) || 0)))
    const folded = style.startsWith('>') ? rows.join('\n').replace(/([^\n])\n(?=[^\n])/g, '$1 ') : rows.join('\n')
    return style.endsWith('-') ? folded : `${folded}\n`
  }
  const KEY = /^([A-Za-z0-9_-]+):(?:\s+(.*))?$/
  function node(parent) {
    skip()
    if (i >= lines.length || indentOf(lines[i]) <= parent) return null
    const ind = indentOf(lines[i])
    return /^-(\s|$)/.test(lines[i].trim()) ? list(ind) : map(ind)
  }
  function map(ind) {
    const o = {}
    for (;;) {
      skip()
      if (i >= lines.length || indentOf(lines[i]) !== ind) break
      const t = lines[i].trim()
      if (/^-(\s|$)/.test(t)) break
      const m = KEY.exec(t)
      if (!m) { i++; continue }
      i++
      const v = (m[2] ?? '').trim()
      if (v === '' || v.startsWith('#')) o[m[1]] = node(ind)
      else if (/^[|>][+-]?$/.test(v)) o[m[1]] = blockScalar(v, ind)
      else o[m[1]] = scalar(v)
    }
    return o
  }
  function list(ind) {
    const a = []
    for (;;) {
      skip()
      if (i >= lines.length || indentOf(lines[i]) !== ind || !/^-(\s|$)/.test(lines[i].trim())) break
      const rest = lines[i].trim().replace(/^-\s*/, '')
      if (KEY.test(rest)) { lines[i] = `${' '.repeat(ind + 2)}${rest}`; a.push(map(ind + 2)) } else { i++; a.push(rest ? scalar(rest) : node(ind)) }
    }
    return a
  }
  return node(-1)
}

const plain = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
/** A label without its leading emoji and symbols: `🏷️ 问题类型` -> `问题类型`. */
export const labelPlain = (s) => plain(s).replace(/^[^\p{L}\p{N}]+/u, '').trim()

/** One template file as the page uses it: { file, name, title, labels, kind, lang, fields: [{ id, type, label, description, options, render, required }] }. `type: markdown` parts are left out (they never reach an issue). */
export function parseTemplate(file, yamlText) {
  const y = parseYaml(yamlText)
  if (!y || !Array.isArray(y.body)) return null
  const fields = []
  for (const part of y.body) {
    if (!part || !['input', 'textarea', 'dropdown', 'checkboxes'].includes(part.type)) continue
    const a = part.attributes || {}
    const label = plain(a.label)
    if (!label) continue
    fields.push({
      id: String(part.id || ''), type: part.type, label, description: plain(a.description), render: a.render ? String(a.render) : '', required: part.validations?.required === true,
      options: Array.isArray(a.options) ? a.options.map((o) => (typeof o === 'string' ? o : plain(o?.label))).filter(Boolean) : [],
    })
  }
  const name = plain(y.name)
  const labels = Array.isArray(y.labels) ? y.labels.map(String) : []
  const base = String(file).replace(/\.ya?ml$/i, '')
  return {
    file: String(file), name, title: String(y.title ?? ''), labels,
    kind: /bug/i.test(base) || labels.includes('bug') ? 'bug' : /feature|enhancement/i.test(base) || labels.includes('enhancement') ? 'feature' : 'form',
    lang: /_en$|english/i.test(`${base}${name}`) ? 'en' : 'zh',
    fields,
  }
}

/** The templates of a repository: the live ones (read through the GitHub client) over the built-in ones of that repository, matched by file name. */
export function mergeTemplates(repo, live = []) {
  const byFile = new Map()
  for (const t of BUILTIN_TEMPLATES[repo] || []) byFile.set(t.file, t)
  for (const t of live || []) if (t && Array.isArray(t.fields) && t.fields.length) byFile.set(t.file, t)
  return [...byFile.values()]
}

// ---------------------------------------------------------------- the body of an issue
/** Splits at the `### ` headings outside fenced blocks. -> { lead, sections: [{ label, text }] } with the text trimmed. */
export function splitSections(body) {
  const lines = String(body ?? '').replace(/\r\n?/g, '\n').split('\n')
  const out = { lead: [], sections: [] }
  let fence = ''
  let cur = null
  for (const line of lines) {
    const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line)
    if (f) { if (!fence) fence = f[1][0].repeat(f[1].length); else if (line.trim().startsWith(fence) && /^\s{0,3}[`~]+\s*$/.test(line)) fence = '' }
    const h = !fence && !f ? /^### +(.+?)\s*#*\s*$/.exec(line) : null
    if (h) { cur = { label: plain(h[1]), text: [] }; out.sections.push(cur); continue }
    ;(cur ? cur.text : out.lead).push(line)
  }
  return { lead: out.lead.join('\n').trim(), sections: out.sections.map((s) => ({ label: s.label, text: s.text.join('\n').trim() })) }
}

const EMPTY_MARK = /^_(?:no response|none|n\/a|无|無|无回应|無回應|无响应|暂无|暫無)_\.?$/i
/** True for a value the form shows as empty: blank, `_No response_`, `_无_`, an empty fenced block. */
export function isEmptyValue(v) {
  const t = String(v ?? '').trim()
  if (!t || EMPTY_MARK.test(t)) return true
  const f = /^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n?\1\s*$/.exec(t)
  return !!f && !f[2].trim()
}

/** `- [x] text` lines -> [{ checked, text }]; lines that are not checkboxes are ignored. */
export function parseChecks(text) {
  const out = []
  for (const line of String(text).split('\n')) {
    const m = /^\s*[-*] \[( |x|X)\]\s+(.*\S)\s*$/.exec(line)
    if (m) out.push({ checked: m[1] !== ' ', text: m[2] })
  }
  return out
}
/** The text inside the first fenced block ({ lang, text }), or null. */
export function unfence(text) {
  const m = /^\s*(`{3,}|~{3,})([^\n`]*)\n([\s\S]*?)\n?\1\s*$/.exec(String(text))
  return m ? { lang: m[2].trim(), text: m[3] } : null
}
const IMG_MD = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g
const IMG_HTML = /<img\b[^>]*>/gi
/** The pictures in a Markdown / HTML text -> [{ src, alt }] (https only), and the text without them. */
export function extractImages(text) {
  const images = []
  const add = (src, alt) => { const u = safeUrl(src, { image: true }); if (u && !images.some((x) => x.src === u)) images.push({ src: u, alt: alt || '' }) }
  let rest = String(text).replace(IMG_MD, (_, alt, src) => { add(src, alt); return '' })
  rest = rest.replace(IMG_HTML, (tag) => { const s = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag); const a = /\salt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag); if (s) add(s[1] ?? s[2], a ? (a[1] ?? a[2]) : ''); return '' })
  return { images, text: rest.replace(/\n{3,}/g, '\n\n').trim() }
}

const MEDIA = /截图|截屏|录屏|效果图|参考|screenshot|mockup|reference|video/i
function roleOf(def, label) {
  if (!def) return 'text'
  if (def.type === 'dropdown') return 'chip'
  if (def.type === 'input') return 'env'
  if (def.type === 'checkboxes') return 'check'
  if (def.render) return 'code'
  if (def.id === 'screenshots' || MEDIA.test(label)) return 'media'
  return 'text'
}

function fieldOf(def, label, text) {
  const role = roleOf(def, label)
  const f = { id: def?.id || '', type: def?.type || 'textarea', label, plain: labelPlain(label), role, value: text, extra: !def }
  if (role === 'check') f.checks = parseChecks(text)
  else if (role === 'code') { const u = unfence(text); f.code = u ? { lang: u.lang || def.render, text: u.text } : { lang: def.render, text } }
  else if (role === 'media' || role === 'text') {
    const im = extractImages(text)
    f.images = im.images
    f.value = role === 'media' ? im.text : text
    const code = role === 'text' ? unfence(text) : null
    if (code) f.code = code
  } else f.value = text.replace(/\s*\n\s*/g, ' ').trim()
  return f
}

const norm = (s) => plain(s)
function matchOf(template, section, taken) {
  const l = norm(section.label)
  const lp = labelPlain(section.label)
  let def = template.fields.find((x) => !taken.has(x) && norm(x.label) === l)
  if (!def && lp) def = template.fields.find((x) => !taken.has(x) && labelPlain(x.label) === lp)
  return def || null
}

/** Reads the diagnostics section of a feedback body. -> { fingerprint, release, rows: [[key, value]], blocks: [{ title, lang, text }], attachments: [{ name, url, size, image }], contact } */
export function parseDiagnostics(text) {
  const out = { fingerprint: '', release: '', rows: [], blocks: [], attachments: [], contact: '' }
  const lines = String(text).split('\n')
  let section = ''
  let fence = null
  const buf = []
  const flush = () => { if (section && fence === null) { /* nothing pending */ } }
  for (const line of lines) {
    const fm = /^(`{3,}|~{3,})(.*)$/.exec(line)
    if (fence) {
      if (fm && fm[1].startsWith(fence.mark) && !fm[2].trim()) { out.blocks.push({ title: section, lang: fence.lang, text: buf.splice(0).join('\n') }); fence = null } else buf.push(line)
      continue
    }
    if (fm) { fence = { mark: fm[1], lang: fm[2].trim() }; continue }
    const h = /^#### +(.+?)\s*$/.exec(line)
    if (h) { section = plain(h[1]); flush(); continue }
    const li = /^\s*[-*] +(.*\S)\s*$/.exec(line)
    if (!li) { if (section && /contact|联系/i.test(section) && line.trim()) out.contact += `${out.contact ? '\n' : ''}${line.trim()}`; continue }
    if (/attach|附件/i.test(section)) {
      const img = /^!\[([^\]]*)\]\(([^)\s]+)\)/.exec(li[1])
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)\s*(?:\(([^)]*)\))?/.exec(li[1])
      const bare = /^(.+?)\s*\(([^)]*)\)\s*$/.exec(li[1])
      if (img) out.attachments.push({ name: img[1] || 'image', url: safeUrl(img[2], { image: true }), size: '', image: true })
      else if (link) out.attachments.push({ name: link[1], url: safeUrl(link[2]), size: link[3] || '', image: /\.(png|jpe?g|gif|webp)$/i.test(link[1]) })
      else out.attachments.push({ name: bare ? bare[1] : li[1], url: '', size: bare ? bare[2] : '', image: /\.(png|jpe?g|gif|webp)\b/i.test(li[1]) })
      continue
    }
    const kv = /^([A-Za-z][\w .-]*?):\s+`?(.*?)`?$/.exec(li[1])
    if (kv) {
      const k = kv[1].trim().toLowerCase()
      if (k === 'fingerprint') out.fingerprint = kv[2]
      else if (k === 'release') out.release = kv[2]
      else out.rows.push([kv[1].trim(), kv[2]])
    }
  }
  return out
}

/**
 * The structured model of an issue body, or null when it is not one of the forms (see the rules at the top).
 * @param {string} body
 * @param {{ templates?: object[] }} [o] the templates of the repository (mergeTemplates); without them nothing matches
 */
export function parseIssueForm(body, { templates = [] } = {}) {
  const text = String(body ?? '')
  if (!text.trim()) return null
  const feedback = text.trimStart().startsWith(FEEDBACK_MARKER)
  const { lead, sections } = splitSections(text)
  if (sections.length < 3) return null
  const diagIdx = sections.findIndex((s) => feedback && Object.values(DIAG_LABELS).some((l) => labelPlain(l) === labelPlain(s.label)))
  const parts = diagIdx >= 0 ? sections.filter((_, k) => k !== diagIdx) : sections
  let best = null
  for (const template of templates) {
    const taken = new Set()
    let matched = 0
    for (const s of parts) { const d = matchOf(template, s, taken); if (d) { taken.add(d); matched++ } }
    const requiredAll = template.fields.filter((f) => f.required).every((f) => taken.has(f))
    const ok = (requiredAll && matched >= 2) || (matched >= 3 && matched / parts.length >= 0.6)
    if (!ok) continue
    const score = matched * 10 + (requiredAll ? 5 : 0) - (parts.length - matched)
    if (!best || score > best.score) best = { template, score }
  }
  if (!best) return null
  const { template } = best
  const taken = new Set()
  const fields = []
  const empty = []
  let last = null
  const lastText = () => (last && last.def?.type === 'textarea' ? last : null)
  for (const s of parts) {
    const def = matchOf(template, s, taken)
    if (def) {
      taken.add(def)
      last = { def, label: def.label, text: s.text }
      fields.push(last)
    } else if (lastText()) {
      last.text = `${last.text}\n\n### ${s.label}\n\n${s.text}`.trim()
    } else {
      last = { def: null, label: s.label, text: s.text }
      fields.push(last)
    }
  }
  const out = []
  for (const f of fields) {
    if (isEmptyValue(f.text)) { empty.push(f.label); continue }
    out.push(fieldOf(f.def, f.label, f.text))
  }
  return {
    form: { file: template.file, name: template.name, kind: template.kind, lang: template.lang },
    feedback,
    lead: lead.replace(FEEDBACK_MARKER, '').trim(),
    fields: out,
    empty,
    diagnostics: diagIdx >= 0 ? parseDiagnostics(sections[diagIdx].text) : null,
  }
}

/** The builtin and the live templates of a repository -> the model of a body (null: draw it as Markdown). A body without enough headings is not even tried. */
export function readIssueForm(body, repo, live = []) {
  const templates = mergeTemplates(repo, live)
  // a report from the feedback flow is always written as the Foundation Sunshine form, whichever repository it went to
  if (String(body ?? '').trimStart().startsWith(FEEDBACK_MARKER)) for (const t of BUILTIN_TEMPLATES.fs || []) if (!templates.some((x) => x.file === t.file)) templates.push(t)
  return parseIssueForm(body, { templates })
}

/** The cheap test before any template is read: three `### ` headings at least. */
export const looksLikeForm = (body) => (String(body ?? '').match(/^### +\S/gm) || []).length >= 3
