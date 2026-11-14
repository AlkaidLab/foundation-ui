import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const css = read('../src/css/selection.css')
const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, sel, body]) => ({ sel: sel.trim(), body: body.trim() }))
const valueOf = (rule) => /(?:^|;)\s*user-select:\s*([a-z]+)/.exec(rule.body)?.[1]

test('the window is not selectable: one rule on the root, loaded with the shared stylesheet', () => {
  const root = rules.find((r) => r.sel === ':root')
  assert.equal(valueOf(root), 'none')
  assert.match(root.body, /-webkit-user-select: none/)
  assert.match(read('../src/css/all.css'), /@import '\.\/selection\.css'/)
})

test('the top layer sets it itself: a dialog or a popover does not take the root\'s value (it is laid out under the viewport)', () => {
  const layer = rules.find((r) => /dialog/.test(r.sel) && /popover/.test(r.sel))
  assert.equal(valueOf(layer), 'none')
})

test('fields, code and data, logs and long-form text opt in explicitly', () => {
  const on = rules.filter((r) => valueOf(r) === 'text').map((r) => r.sel).join(' ')
  for (const sel of ['input', 'textarea', '[contenteditable', 'md-outlined-text-field', 'md-filled-text-field', 'pre', 'code', 'samp', '.m-mono', '.m-pre', '.m-md', '.m-logv__scroll', '.m-dialog__message', '.m-selectable', '[data-selectable]']) assert.ok(on.includes(sel), `${sel} stays selectable`)
  for (const chrome of ['button', '.m-item', '.m-tile', '.m-rail', 'kbd', 'h1', 'h2']) assert.ok(!on.includes(chrome), `${chrome} is not an opt-in`)
})

test('a control inside a selectable block is still a control', () => {
  const rule = rules.find((r) => /button/.test(r.sel) && /\.m-md/.test(r.sel))
  assert.equal(valueOf(rule), 'none')
})

test('no component or page sets text selection back on by itself: opt-ins live in this file', () => {
  const offenders = []
  const walk = (dir) => { for (const e of readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })) { const rel = `${dir}${e.name}`; if (e.isDirectory()) walk(`${rel}/`); else if (/\.(css|vue)$/.test(e.name) && !rel.endsWith('selection.css') && /user-select:\s*(text|all|auto)/.test(read(rel))) offenders.push(rel) } }
  walk('../src/')
  assert.deepEqual(offenders, [])
})
