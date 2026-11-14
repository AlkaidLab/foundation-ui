// The selected-state rule of the package (no thick selection outline): a selected card, choice, swatch or chip-like control is shown by its container colour and a check, never by a
// border, outline or box-shadow ring wider than 1 px. This module finds the rules that break it, in CSS, Less/SCSS (nested `&` selectors) and the <style> blocks of Vue files. Used by
// test/selectedring.test.js and by the Panel and Web UI tests (`foundation-ui/testing/selected-ring`). The keyboard focus ring is a different thing (:focus, :focus-visible, :focus-within are skipped).
import fs from 'node:fs'
import path from 'node:path'

// a selector that means "this one is the selected / chosen / on one"
export const SELECTED = /(\.is-(on|selected|sel|active|picked|chosen|checked|current|cur)\b|\.(on|sel|selected|active|picked|chosen|checked|cur|current)\b|--(selected|on|active|checked|picked|chosen)\b|aria-(pressed|checked|selected)\s*=\s*["']?true|aria-current|:checked|data-(on|active|selected|checked)\b|:has\(\s*(input)?:checked)/

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/[^\n]*/g, '$1')

/** every rule with its full selector (nested `&` resolved) and its own declarations: [{ selector, decls: [[prop, value]], line }] */
export function rulesOf(css) {
  const src = stripComments(css)
  const lineAt = (p) => src.slice(0, p).split('\n').length
  const out = []
  const walk = (start, end, parents) => {
    let pos = start
    let own = ''
    const flush = (at) => {
      if (!parents.length || !own.trim()) { own = ''; return }
      const decls = own.split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const k = d.indexOf(':'); return k < 0 ? null : [d.slice(0, k).trim().toLowerCase(), d.slice(k + 1).trim()] }).filter(Boolean)
      for (const sel of parents) out.push({ selector: sel, decls, line: lineAt(at) })
      own = ''
    }
    while (pos < end) {
      const o = src.indexOf('{', pos)
      const semi = src.indexOf(';', pos)
      const close = src.indexOf('}', pos)
      // a declaration (or the end of the block) comes before the next opening brace
      if (o < 0 || o >= end || (semi >= 0 && semi < o && !/^\s*[@&.#:\[a-z*>~+]/i.test(src.slice(pos, semi)) === false && /^\s*[a-z-]+\s*:[^{]*$/i.test(src.slice(pos, semi)))) {
        const stop = o < 0 || o >= end ? end : semi + 1
        own += src.slice(pos, stop)
        pos = stop
        continue
      }
      void close
      // text before the brace may begin with declarations ending in ';' – split them off
      const head0 = src.slice(pos, o)
      const lastSemi = head0.lastIndexOf(';')
      if (lastSemi >= 0) own += head0.slice(0, lastSemi + 1)
      const head = (lastSemi >= 0 ? head0.slice(lastSemi + 1) : head0).trim()
      let depth = 1
      let j = o + 1
      while (j < end && depth) { const c = src[j]; if (c === '{') depth++; else if (c === '}') depth--; j++ }
      if (head.startsWith('@')) {
        if (/^@(media|supports|container|layer|include|at-root)/.test(head)) walk(o + 1, j - 1, parents.length ? parents : [])
        else if (/^@(keyframes|font-face|-webkit-keyframes)/.test(head)) { /* not rules of a control */ }
      } else {
        const parts = head.split(/,(?![^(]*\))/).map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean)
        const selectors = parts.flatMap((part) => (parents.length ? parents.map((par) => (part.includes('&') ? part.replaceAll('&', par) : `${par} ${part}`)) : [part]))
        flush(pos)
        walk(o + 1, j - 1, selectors)
      }
      pos = j
    }
    flush(end)
  }
  walk(0, src.length, [])
  return out
}

const num = (v) => { const m = String(v).match(/(-?[\d.]+)px/); return m ? parseFloat(m[1]) : null }

/** the declarations of a rule that draw a ring wider than 1 px: [text] */
export function ringsOf(decls) {
  const found = []
  for (const [prop, value] of decls) {
    if (prop === 'outline' || prop === 'outline-width') {
      const w = num(value)
      if (w !== null && w > 1 && !/^(none|0)\b/.test(value)) found.push(`${prop}: ${value}`)
    } else if (/^border(-(top|bottom|left|right|inline|block)(-(start|end))?)?$/.test(prop)) {
      const w = num(value)
      if (w !== null && w > 1 && !/transparent|\bnone\b/.test(value)) found.push(`${prop}: ${value}`)
    } else if (prop === 'box-shadow') {
      for (const layer of value.split(/,(?![^(]*\))/)) {
        const bare = layer.replace(/color-mix\((?:[^()]|\([^()]*\))*\)|rgba?\([^)]*\)|hsla?\([^)]*\)|var\((?:[^()]|\([^()]*\))*\)|#[0-9a-f]{3,8}\b/gi, ' ')
        const n = [...bare.matchAll(/-?[\d.]+(?:px)?/g)].map((m) => parseFloat(m[0]))
        // offset-x offset-y blur spread: a ring has no offset and no blur, only a spread
        if (n.length >= 4 && n[0] === 0 && n[1] === 0 && n[2] === 0 && n[3] > 1) found.push(`box-shadow: ${layer.trim()}`)
      }
    }
  }
  return found
}

const SELECTED_G = new RegExp(SELECTED.source, 'g')
const baseOf = (selector) => selector.replace(SELECTED_G, '').replace(/\s+/g, ' ').trim()
const borderWidth = (decls) => { for (const [prop, value] of decls) if (/^border(-(top|bottom|left|right|inline|block)(-(start|end))?)?$/.test(prop) || prop === 'border-width') { const w = num(value); if (w !== null) return w } return null }
const colourOnly = ([prop, value]) => /^border(-(top|bottom|left|right|inline|block)(-(start|end))?)?-color$/.test(prop) && !/^(transparent|none|inherit|currentcolor)\b/i.test(value)

/** [{ file, line, selector, rings }] for every selected-state rule of the style text that draws a ring wider than 1 px: an outline, a box-shadow spread, a border of its own, or a border colour on an element whose border is wider than 1 px (the colour is what makes it a ring) */
export function selectedRings(css, file = '') {
  const rules = rulesOf(css)
  const thick = new Set(rules.filter((r) => (borderWidth(r.decls) ?? 0) > 1).map((r) => baseOf(r.selector)))
  const found = []
  for (const r of rules) {
    if (!SELECTED.test(r.selector)) continue
    if (/:focus/.test(r.selector)) continue
    const rings = ringsOf(r.decls)
    const fill = r.decls.filter(([p]) => p === 'background' || p === 'background-color').map(([, v]) => v)
    // a border in the colour of the element's own fill (a switch track that is on) is not a ring: it is the fill
    if (thick.has(baseOf(r.selector))) for (const d of r.decls) if (colourOnly(d) && !fill.includes(d[1])) rings.push(`${d[0]}: ${d[1]} (the element's border is wider than 1 px)`)
    if (rings.length) found.push({ file, line: r.line, selector: r.selector, rings })
  }
  return found
}

const SKIP = new Set(['node_modules', '.git', 'dist', 'out', 'build'])
export function styleFiles(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) styleFiles(p, acc)
    else if (/\.(css|less|scss|vue)$/.test(e.name)) acc.push(p)
  }
  return acc
}

/** the style text of a file: the whole file for a stylesheet, the <style> blocks for a Vue file, with the line the block starts on */
export function styleBlocks(file) {
  const text = fs.readFileSync(file, 'utf8')
  if (!file.endsWith('.vue')) return [{ css: text, lineOffset: 0 }]
  return [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => ({ css: m[1], lineOffset: text.slice(0, m.index).split('\n').length }))
}

export function selectedRingsIn(dir) {
  const found = []
  for (const file of styleFiles(dir)) for (const b of styleBlocks(file)) for (const f of selectedRings(b.css, file)) found.push({ ...f, line: f.line + b.lineOffset })
  return found
}
