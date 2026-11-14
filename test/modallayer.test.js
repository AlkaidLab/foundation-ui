import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MODAL_OPEN, MODAL_SURFACE, contextPolicy, inModalSurface, installModalGuard, isEditable, modalOpen, vModalOpen, wheelBlocked } from '../src/a11y/modalLayer.js'
import { placeMenu } from '../src/contextmenu/place.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
// a tiny document: elements know their ancestors and which selectors they match
const el = (matches = [], parent = null) => ({ parent, closest(sel) { for (let n = this; n; n = n.parent) if (sel.split(',').some((s) => n.matches?.includes(s.trim()))) return n; return null }, matches })
const doc = (open = false) => { const l = {}; return { querySelector: (sel) => (open && sel === MODAL_OPEN ? {} : null), addEventListener: (t, f, o) => { (l[t] ||= []).push([f, o]) }, removeEventListener: (t, f) => { l[t] = (l[t] || []).filter(([g]) => g !== f) }, l, ownerDocument: null } }

test('a document is modal while a dialog is open, an aria-modal element exists, or the shell was told its frame has a modal', () => {
  assert.equal(modalOpen(doc(true)), true)
  assert.equal(modalOpen(doc(false)), false)
  assert.equal(modalOpen(null), false)
  for (const part of ['dialog[open]', '[aria-modal="true"]', '[data-modal-frame]']) assert.ok(MODAL_OPEN.includes(part), part)
})

test('the surface of a modal is its panel: the backdrop and the scrim are outside it', () => {
  const panel = el(['.m-dialog__panel']); const inner = el([], panel); const dialog = el(['dialog']); const scrim = el(['.m-onboard__scrim'])
  assert.equal(inModalSurface(inner), true)
  assert.equal(inModalSurface(dialog), false, 'a press on the backdrop has the dialog itself as its target')
  assert.equal(inModalSurface(scrim), false)
  assert.equal(inModalSurface(null), false)
  for (const cls of ['.m-dialog__panel', '.m-sheet__panel', '.m-onboard__window', '.m-coach__card', '.m-usearch__full']) assert.ok(MODAL_SURFACE.includes(cls), cls)
})

test('a right-click: the window menu with no modal; inside a modal only a field or a selection keeps the platform menu; nothing opens anywhere else', () => {
  assert.equal(contextPolicy({ modal: false, inside: false, editable: false, selection: false }), 'app')
  assert.equal(contextPolicy({ modal: true, inside: false, editable: true, selection: true }), 'none', 'outside the modal even a field gives nothing')
  assert.equal(contextPolicy({ modal: true, inside: true, editable: false, selection: false }), 'none')
  assert.equal(contextPolicy({ modal: true, inside: true, editable: true, selection: false }), 'native')
  assert.equal(contextPolicy({ modal: true, inside: true, editable: false, selection: true }), 'native')
})

test('a text field is editable, a checkbox is not (the selector is what the platform calls editable)', () => {
  const field = el(['input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="range"])'])
  assert.equal(isEditable(field), true)
  assert.equal(isEditable(el(['button'])), false)
})

test('the wheel is stopped over the backdrop and left alone inside the modal', () => {
  assert.equal(wheelBlocked({ modal: true, inside: false }), true)
  assert.equal(wheelBlocked({ modal: true, inside: true }), false)
  assert.equal(wheelBlocked({ modal: false, inside: false }), false)
})

test('the guard takes contextmenu and wheel from everything outside an open modal, once per document, and can be removed', () => {
  const d = doc(true); const remove = installModalGuard(d)
  assert.equal(d.l.contextmenu.length, 1); assert.equal(d.l.wheel.length, 1)
  assert.equal(installModalGuard(d).constructor, Function); assert.equal(d.l.contextmenu.length, 1, 'installed once')
  const run = (type, target) => { const e = { target, defaultPrevented: false, stopped: false, cancelable: true, preventDefault() { this.defaultPrevented = true }, stopPropagation() { this.stopped = true } }; d.l[type][0][0](e); return e }
  const outside = run('contextmenu', el(['dialog']))
  assert.equal(outside.defaultPrevented, true); assert.equal(outside.stopped, true)
  const inside = run('contextmenu', el([], el(['.m-dialog__panel'])))
  assert.equal(inside.defaultPrevented, false); assert.equal(inside.stopped, false)
  assert.equal(run('wheel', el(['dialog'])).defaultPrevented, true)
  remove(); assert.equal(d.l.contextmenu.length, 0)
  // no modal open: the guard does nothing
  const free = doc(false); installModalGuard(free)
  const e = { target: el(['dialog']), preventDefault() { this.p = true }, stopPropagation() {} }; free.l.contextmenu[0][0](e); assert.equal(e.p, undefined)
})

test('v-modal-open shows the dialog modally when it is mounted and closes it when it goes', () => {
  const calls = []; const node = { open: false, isConnected: true, ownerDocument: doc(false), showModal() { calls.push('show'); this.open = true }, close() { calls.push('close'); this.open = false } }
  vModalOpen.mounted(node); assert.deepEqual(calls, ['show'])
  vModalOpen.beforeUnmount(node); assert.deepEqual(calls, ['show', 'close'])
})

test('every modal of the package is a <dialog> shown modally: none rebuilds the trap with a div and aria-modal', () => {
  for (const file of ['MDialog', 'MSheet']) assert.match(read(`../src/vue/${file}.vue`), /showModal\(\)/)
  for (const file of ['MOnboardWindow', 'MCoachMarks', 'MUnifiedSearch']) {
    const src = read(`../src/vue/${file}.vue`)
    assert.match(src, /<dialog[^>]*v-modal-open/, file)
    assert.doesNotMatch(src, /aria-modal=/, `${file} lets the platform say it`)
  }
  assert.doesNotMatch(read('../src/vue/MOnboardWindow.vue'), /<div[^>]*class="m-onboard"/, 'the window of the first run is a dialog element')
})

test('the window menu steps aside for a modal and the shell tells its frame\'s modal', () => {
  const provider = read('../src/vue/MContextProvider.vue')
  assert.match(provider, /modalOpen\(\)/); assert.match(provider, /contextPolicy\(/); assert.match(provider, /installModalGuard\(document\)/)
  assert.match(provider, /function onKey\(event\) \{\n  if \(modalOpen\(\)\) return/, 'the Menu key and Shift+F10 open nothing under a modal')
  assert.match(read('../src/vue/MScene.vue'), /toggleAttribute\('data-modal-frame'/)
})

test('a context menu is placed where all of it is in the window: flipped, shifted, or scrolled when the window is shorter than it', () => {
  const m = (o) => placeMenu({ x: 100, y: 100, width: 160, height: 300, viewportWidth: 1280, viewportHeight: 800, margin: 8, ...o })
  assert.deepEqual(m({}), { left: 100, top: 100, maxHeight: null }, 'fits: at the pointer')
  assert.equal(m({ x: 1200 }).left, 1040, 'does not fit to the right: opens to the left of the pointer')
  assert.equal(m({ y: 700 }).top, 400, 'does not fit below: opens above the pointer')
  const mid = m({ y: 400, height: 530 }); assert.equal(mid.top, 262, 'fits neither above nor below: ends at the edge'); assert.equal(mid.maxHeight, null)
  const corner = m({ x: 1270, y: 790, height: 530 }); assert.deepEqual([corner.left, corner.top], [1110, 260])
  const tiny = m({ y: 100, height: 530, viewportHeight: 360 }); assert.equal(tiny.top, 8); assert.equal(tiny.maxHeight, 344, 'a window shorter than the menu: it scrolls inside')
  const edge = m({ x: 3, y: 2 }); assert.deepEqual([edge.left, edge.top], [8, 8], 'never closer than the margin to the edge')
  for (const [x, y] of [[0, 0], [1279, 799], [640, 799], [1279, 0]]) { const r = m({ x, y, height: 300 }); assert.ok(r.left >= 8 && r.left + 160 <= 1272 && r.top >= 8 && r.top + 300 <= 792, `${x},${y} -> ${JSON.stringify(r)}`) }
})

test('MContextMenu measures the open menu and places it', () => {
  const src = read('../src/vue/MContextMenu.vue')
  assert.match(src, /placeMenu\(/); assert.match(src, /\.reposition\?\.\(\)/); assert.match(src, /visibility = 'hidden'/)
})
