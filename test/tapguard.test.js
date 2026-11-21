// The add flow on a phone: a finger that scrolls the gallery must not add a tile, a tap adds it once, and the snackbar takes it back.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { computed, ref } from 'vue'
import { HOLD_MS, TAP_QUIET, TAP_SLOP, createTapGuard, fingerGesture, isFinger } from '../src/vue/tapGuard.js'
import { useDashEditSheet } from '../src/vue/dash/dashEditSheet.js'
import { resetNotify, useNotify } from '../src/notify/store.js'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const BTN = { getBoundingClientRect: () => ({ left: 100, right: 200, top: 400, bottom: 444 }) }
const ev = (x, y, o = {}) => ({ pointerId: 1, pointerType: 'touch', clientX: x, clientY: y, currentTarget: BTN, type: 'pointer', ...o })
function clock() { let t = 1000; return { now: () => t, tick: (ms) => { t += ms } } }

// ---- the tap on 添加 ----
test('a swipe that starts on 添加 is a scroll: the click that follows adds nothing', () => {
  const c = clock(), g = createTapGuard({ now: c.now })
  g.down(ev(150, 420)); c.tick(16); g.move(ev(150, 400)); c.tick(16); g.move(ev(150, 330)); c.tick(16); g.up(ev(150, 330))
  assert.equal(g.allowClick(), false)
  // the same when the browser takes the finger for the scroll (pointercancel; some browsers still send a click)
  g.down(ev(150, 420)); g.cancel(ev(150, 400))
  assert.equal(g.allowClick(), false)
})

test('a tap on 添加 is let through once: still, short, lifted on the button', () => {
  const c = clock(), g = createTapGuard({ now: c.now })
  g.down(ev(150, 420)); c.tick(80); g.move(ev(152, 421)); g.up(ev(152, 421))
  assert.equal(g.allowClick(), true)
  assert.equal(g.allowClick(), true, 'a click with no press before it (keyboard, assistive technology) is let through')
  // a finger that slides off the button before the lift is not a tap on it
  g.down(ev(150, 420)); g.up(ev(150, 470))
  assert.equal(g.allowClick(), false)
  assert.ok(TAP_SLOP >= 8 && TAP_SLOP <= 12)
})

test('a press during a scroll, or within 150 ms after one, is the finger stopping the list, not a tap; one that is later is a tap', () => {
  const c = clock(), g = createTapGuard({ now: c.now })
  g.scrolled(); c.tick(60)
  g.down(ev(150, 420)); c.tick(30); g.up(ev(150, 420))
  assert.equal(g.allowClick(), false, '60 ms after a scroll event')
  c.tick(TAP_QUIET + 1)
  g.down(ev(150, 420)); c.tick(30); g.up(ev(150, 420))
  assert.equal(g.allowClick(), true, 'once the list has been still for the quiet time')
  // the list moves while the finger is down (momentum after a flick that the press did not stop)
  g.down(ev(150, 420)); c.tick(40); g.scrolled(); c.tick(40); g.up(ev(150, 420))
  assert.equal(g.allowClick(), false, 'a scroll event between the press and the lift')
})

test('a mouse and the keyboard are not touched: no verdict is kept for them', () => {
  const c = clock(), g = createTapGuard({ now: c.now })
  g.scrolled()
  assert.equal(g.down(ev(150, 420, { pointerType: 'mouse' })), false)
  g.up(ev(190, 440, { pointerType: 'mouse' }))
  assert.equal(g.allowClick(), true, 'the mouse click is always let through, even right after a scroll')
  assert.equal(isFinger(ev(0, 0, { pointerType: 'pen' })), true)
  assert.equal(isFinger(ev(0, 0, { pointerType: 'mouse' })), false)
  // a verdict that no click came for does not hold back a later click
  g.down(ev(150, 420)); g.cancel(ev(150, 400)); c.tick(2000)
  assert.equal(g.allowClick(), true)
})

// ---- the finger on a card ----
function gesture(o = {}) {
  const log = []; const timers = []
  const g = fingerGesture(ev(200, 500), {
    swipeable: o.swipeable, onHold: () => log.push('hold'), onSwipe: (dx) => log.push(`swipe:${dx}`), onTurn: (dx) => log.push(`turn:${dx}`), onEnd: (m) => log.push(`end:${m}`),
    setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length }, clearTimer: (i) => { if (timers[i - 1]) timers[i - 1].fn = null },
  })
  const fire = () => timers[0]?.fn?.()
  return { g, log, fire, timers }
}

test('a finger that scrolls the gallery from a card takes nothing out (the bug: 8 px of vertical movement added the tile)', () => {
  const t = gesture({ swipeable: true })
  t.g.move(ev(200, 490)); t.g.move(ev(200, 470)); t.g.move(ev(201, 420)); t.g.up(ev(201, 420, { type: 'pointerup' }))
  t.fire() // the hold timer must have been cleared
  assert.deepEqual(t.log, ['end:scroll'])
  const u = gesture({ swipeable: false })
  u.g.move(ev(200, 480)); u.fire()
  assert.deepEqual(u.log, ['end:scroll'], 'a card without sizes: the same')
})

test('a finger that rests on a card for the hold time takes the tile up; a tap that is short does not', () => {
  const t = gesture()
  assert.equal(t.timers[0].ms, HOLD_MS)
  t.g.move(ev(202, 503)); t.fire()
  assert.deepEqual(t.log, ['hold'])
  t.g.move(ev(200, 300)) // the drag belongs to the parent now
  t.g.up(ev(200, 300, { type: 'pointerup' }))
  assert.deepEqual(t.log, ['hold', 'end:held'])
  const s = gesture()
  s.g.up(ev(200, 500, { type: 'pointerup' })); s.fire()
  assert.deepEqual(s.log, ['end:'], 'lifted before the hold: nothing happens')
})

test('a sideways swipe on a preview with several sizes turns the page at 48 px and adds nothing; a vertical one on it is the scroll', () => {
  const t = gesture({ swipeable: true })
  t.g.move(ev(190, 502)); t.g.move(ev(150, 504)); t.g.move(ev(120, 505)); t.g.up(ev(120, 505, { type: 'pointerup' }))
  assert.deepEqual(t.log, ['swipe:-10', 'swipe:-50', 'swipe:-80', 'end:swipe', 'turn:-80'])
  const c = gesture({ swipeable: true })
  c.g.move(ev(150, 504)); c.g.up(ev(150, 504, { type: 'pointercancel' }))
  assert.deepEqual(c.log, ['swipe:-50', 'end:swipe'], 'a cancel never turns the page')
  const v = gesture({ swipeable: true })
  v.g.move(ev(205, 440)); v.g.up(ev(205, 440))
  assert.deepEqual(v.log, ['end:scroll'])
})

// ---- the add and its undo ----
globalThis.document = { documentElement: { dataset: { motion: 'reduced' } } } // no motion: the tile is placed at once
function sheet() {
  resetNotify()
  const visible = ref(['hero'])
  const layout = {
    snapshot: () => [...visible.value], restore: (s) => { visible.value = [...s] }, setSize() {}, moveTo() {},
    setVisible: (id, on) => { visible.value = on ? [...visible.value.filter((x) => x !== id), id] : visible.value.filter((x) => x !== id) },
  }
  const allCards = ref(['hero', 'cpu', 'gpu'].map((id) => ({ id, title: id.toUpperCase(), available: true, group: 'host' })))
  const D = {
    T: ref({ galSnack: 'Added: {name}', galUndo: 'Undo', hide: 'Hide', addCard: 'Add card' }), addable: ref([]), allCards, blocks: ref([]), boxIn: () => ({}), dockBox: () => ({}), dockLayout: ref(false), edit: ref(true), grid: ref(null),
    gridOf: () => ({ unit: 100 }), hasDetailOf: () => false, layout, planMoving: ref(false), resizing: ref(false), root: ref(null), rowPxIn: () => () => 100, shownIds: computed(() => visible.value),
    sizeKeysOf: () => ['s'], stacks: {}, tall: ref(false), units: ref(8), width: ref(1200), windowClass: ref('expanded'), sel: ref(''),
  }
  useDashEditSheet(D)
  return { D, visible, notify: useNotify() }
}
const settle = () => new Promise((r) => setTimeout(r, 30))

test('two taps on 添加 add the tile once and show one snackbar; a tile that is already on the overview is not added again', async () => {
  const { D, visible, notify } = sheet()
  D.addFromGallery('cpu'); D.addFromGallery('cpu'); await settle()
  assert.deepEqual(visible.value, ['hero', 'cpu'])
  assert.equal(notify.state.queue.length, 1)
  assert.equal(notify.state.queue[0].message, 'Added: CPU')
  D.addFromGallery('cpu'); await settle()
  assert.equal(notify.state.queue.length, 1)
  assert.equal(D.sheetAway.value, false, 'the gallery is not left hidden')
})

test('撤销 puts the overview back as it was; the next add replaces the message and its 撤销 takes back that tile only', async () => {
  const { D, visible, notify } = sheet()
  D.addFromGallery('cpu'); await settle()
  assert.equal(notify.state.queue[0].action, 'Undo')
  notify.runSnackAction(notify.state.queue[0].id)
  assert.deepEqual(visible.value, ['hero'])
  assert.equal(notify.state.queue.length, 0)
  D.addFromGallery('cpu'); await settle(); D.addFromGallery('gpu'); await settle()
  assert.deepEqual(visible.value, ['hero', 'cpu', 'gpu'])
  assert.equal(notify.state.queue.length, 1, 'the second message replaces the first, it does not wait behind it for six seconds')
  assert.equal(notify.state.queue[0].message, 'Added: GPU')
  notify.runSnackAction(notify.state.queue[0].id)
  assert.deepEqual(visible.value, ['hero', 'cpu'])
})

// ---- the wiring: the pieces above are what the gallery and the sheet use ----
test('the gallery follows a finger with the guards, and the mouse path is the old one', () => {
  const g = read('src/vue/MTileGallery.vue')
  assert.match(g, /if \(isFinger\(event\)\) \{ fingerDown\(event, e, stage\); return \}/)
  assert.match(g, /mode = Math\.abs\(dx\) > Math\.abs\(dy\) \* 1\.2 \? 'swipe' : 'pick'/) // the mouse
  assert.match(g, /@scroll\.capture\.passive="tap\.scrolled\(\)"/)
  assert.match(g, /@pointerdown="tap\.down\(\$event\)" @pointermove="tap\.move\(\$event\)" @pointerup="tap\.up\(\$event\)" @pointercancel="tap\.cancel\(\$event\)" @click\.stop="onAdd\(e\)"/)
  assert.match(g, /const onAdd = \(e\) => \{ if \(tap\.allowClick\(\)\) emit\('add', e\.id\) \}/)
  assert.match(g, /document\.addEventListener\('touchmove', freeze, \{ passive: false \}\)/) // the list stays while the tile is carried
  const css = read('src/css/gallery.css')
  assert.match(css, /@media \(pointer: coarse\) \{[\s\S]*?\.m-gal__dot \{ width: 44px; height: 44px; \}/)
  assert.match(css, /\.m-gal__variant \{ height: 44px;/)
  assert.match(css, /\.m-dedit__head \.m-dpill \{ min-height: 44px; \}/)
  assert.match(css, /@media \(hover: hover\) \{ \.m-gal__add:not\(\.is-added\):hover/) // a tap leaves no stuck hover
  const d = read('src/vue/dash/dashDrag.js')
  assert.match(d, /if \(ev\.pointerId !== pid \|\| moved \|\|/) // another finger's move does not add the tile
  assert.match(d, /document\.addEventListener\('pointercancel', onUpDoc\)/)
})
