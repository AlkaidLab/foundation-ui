// The unified search: one index of everything a person can look for (settings, pages, actions, clients, applications, tiles of the overview), one matcher,
// results grouped by type. Pure functions (no Vue, no DOM), so both products and the tests use them as they are.
//
// A doc: { id, type, title, path?, icon?, keywords?, key?, route?, params?, tier?, ... } -- the fields the product needs to open it travel with it.
//   path      the breadcrumb ("主机设置 › 编码器"), searched too
//   keywords  other words that find it (the other language's label, synonyms)
//   key       the configuration key (`hevc_mode`): typing it finds the row
// Matching, best first: exact title or key, a prefix, a word of the title, a substring, the keywords, pinyin initials (码率 = ml), the breadcrumb, and, only when
// nothing else matched, one typo in a Latin word.

import { hasHan, initialsOf } from './pinyin.js'
import { isUnavailable } from '../settings/availability.js'

export const TYPES = Object.freeze(['setting', 'page', 'action', 'client', 'app', 'tile'])
export const PER_GROUP = 5

const lower = (s) => String(s ?? '').toLowerCase()
const keyForm = (s) => lower(s).trim().replace(/[\s.-]+/g, '_')

/** Prepare docs for matching: lower-cased fields and pinyin initials, computed once. */
export function buildIndex(docs) {
  const rows = docs.map((doc, order) => {
    const title = String(doc.title ?? '')
    const t = lower(title)
    return {
      doc, order, title, t,
      k: doc.key ? keyForm(doc.key) : '',
      kw: lower(doc.keywords),
      alt: lower(doc.alt),
      primary: lower(doc.primary),
      p: lower(doc.path),
      py: hasHan(title) ? initialsOf(title) : [],
      pool: [...new Set(`${t} ${doc.key ? keyForm(doc.key).replace(/_/g, ' ') : ''} ${lower(doc.keywords)}`.split(/[^a-z0-9]+/).filter((x) => x.length >= 3))],
    }
  })
  return { rows, size: rows.length }
}

const words = (q) => lower(q).trim().split(/\s+/).filter(Boolean)

// edit distance (insert, delete, replace, swap of two neighbours) up to `max`
function within(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length] <= max
}

/** Tier of one word against a row (lower is better), with the title ranges to highlight; null when it does not match. */
function tierOf(row, w, fuzzy) {
  const { t, k, kw, p, py } = row
  const kf = keyForm(w)
  if (t === w || (k && k === kf)) return { tier: 0, range: t === w ? [0, t.length] : null }
  if (t.startsWith(w)) return { tier: 1, range: [0, w.length] }
  if (k && k.startsWith(kf)) return { tier: 1, range: null }
  let at = t.indexOf(w)
  if (at >= 0) {
    const wordStart = at === 0 || /[\s._\-/›(（·:：]/.test(t[at - 1])
    return { tier: wordStart ? 2 : 3, range: [at, at + w.length] }
  }
  if (k && k.includes(kf)) return { tier: 3, range: null }
  if (kw.includes(w)) return { tier: 4, range: null }
  if (/^[a-z0-9]+$/.test(w)) {
    for (const v of py) {
      const i = v.s.indexOf(w)
      if (i >= 0) return { tier: i === 0 ? 5 : 6, indexes: v.at.slice(i, i + w.length) }
    }
  }
  if (p.includes(w)) return { tier: 7, range: null }
  if (fuzzy && w.length >= 4 && /^[a-z0-9_]+$/.test(w)) {
    const max = w.length >= 8 ? 2 : 1
    if (row.pool.some((x) => (Math.abs(x.length - w.length) <= max && within(w, x, max)) || (x.length > w.length && within(w, x.slice(0, w.length), max)))) return { tier: 8, range: null }
  }
  return null
}

/** Score a row for the words of a query: the worst tier of its words (every word has to match), with the highlight ranges of the title. */
function scoreRow(row, ws, fuzzy) {
  let tier = 0
  const ranges = []
  for (const w of ws) {
    let hit = tierOf(row, w, fuzzy)
    if (!hit) return null
    // the title in the other language counts as a title for a lead doc (English finds 下载客户端 by 下载 before the doc that merely lists the word)
    if (row.doc.lead && hit.tier > 1.2 && row.alt.startsWith(w)) hit = { tier: 1.2, range: null }
    else if (row.doc.lead && hit.tier > 1.4 && row.alt.includes(w)) hit = { tier: 1.4, range: null }
    else if (row.doc.lead && hit.tier > 1.45 && row.primary.split(/\s+/).includes(w)) hit = { tier: 1.45, range: null }
    if (hit.tier > tier) tier = hit.tier
    if (hit.range) ranges.push(hit.range)
    if (hit.indexes) for (const i of hit.indexes) ranges.push([i, i + 1])
  }
  // a lead doc (the connect and download actions) answers the words that name its task before any setting, page or tile: a keyword hit counts as a strong one
  if (row.doc.lead) { if (tier === 4) tier = 1.6; else if (tier >= 2 && tier < 4) tier = 1.4 }
  return { tier, ranges: mergeRanges(ranges) }
}

function mergeRanges(ranges) {
  const sorted = ranges.filter((r) => r && r[1] > r[0]).sort((a, b) => a[0] - b[0])
  const out = []
  for (const r of sorted) { const last = out[out.length - 1]; if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else out.push([r[0], r[1]]) }
  return out
}

/**
 * Search the index. Returns { groups: [{ type, items: [{ doc, tier, ranges }], more }], flat: [doc...] (in display order), total, query }.
 * Groups with a strong match (the title or its start) come first, each half in the order of TYPES, and the tiles last; a group shows `perGroup` rows and says how many more there are.
 */
export function search(index, query, { perGroup = PER_GROUP, types = TYPES } = {}) {
  const ws = words(query)
  if (!ws.length) return { groups: [], flat: [], total: 0, query: '' }
  const run = (fuzzy) => {
    const hits = []
    for (const row of index.rows) { const s = scoreRow(row, ws, fuzzy); if (s) hits.push({ row, ...s }) }
    return hits
  }
  let hits = run(false)
  if (!hits.length) hits = run(true)
  const byType = new Map()
  for (const h of hits) { const list = byType.get(h.row.doc.type) || []; list.push(h); byType.set(h.row.doc.type, list) }
  const groups = []
  for (const type of types) {
    const list = byType.get(type)
    if (!list) continue
    // within a tier: actions in the order the product lists them (restart before the rarer ones), the rest the shorter title first
    // a setting that cannot be used now is kept (a person has to know it exists) but comes after every usable one
    list.sort((a, b) => (isUnavailable(a.row.doc) ? 1 : 0) - (isUnavailable(b.row.doc) ? 1 : 0) || (b.row.doc.lead ? 1 : 0) - (a.row.doc.lead ? 1 : 0) || a.tier - b.tier || (type === 'action' ? 0 : a.row.t.length - b.row.t.length) || a.row.order - b.row.order)
    groups.push({ type, lead: !!list[0].row.doc.lead, best: list[0].tier, total: list.length, items: list.slice(0, perGroup).map((h) => ({ doc: h.row.doc, tier: h.tier, ranges: h.ranges })), more: Math.max(0, list.length - perGroup) })
  }
  // a strong match (the title itself or its start) comes before a weak one; within each, the order of the types
  // (the tiles of the overview are the least wanted answer: they always come after the settings, pages and actions)
  groups.sort((a, b) => (b.lead ? 1 : 0) - (a.lead ? 1 : 0) || (a.type === 'tile') - (b.type === 'tile') || (a.best <= 1 ? 0 : 1) - (b.best <= 1 ? 0 : 1) || types.indexOf(a.type) - types.indexOf(b.type))
  return { groups, flat: groups.flatMap((g) => g.items.map((i) => i.doc)), total: hits.length, query: ws.join(' ') }
}

/** The title cut into { text, mark } pieces for the ranges (the matched parts are marked). */
export function highlight(title, ranges = []) {
  const chars = Array.from(String(title ?? ''))
  if (!ranges.length) return [{ text: chars.join(''), mark: false }]
  const out = []
  let at = 0
  for (const [a, b] of ranges) {
    if (a > at) out.push({ text: chars.slice(at, a).join(''), mark: false })
    out.push({ text: chars.slice(a, Math.min(b, chars.length)).join(''), mark: true })
    at = Math.min(b, chars.length)
  }
  if (at < chars.length) out.push({ text: chars.slice(at).join(''), mark: false })
  return out.filter((p) => p.text)
}
