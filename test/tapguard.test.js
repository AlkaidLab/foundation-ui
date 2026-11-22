// The add flow on a phone: a finger that scrolls the gallery must not add a tile, a tap adds it once, and the snackbar takes it back.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { computed, ref } from 'vue'
import { HOLD_MS, TAP_QUIET, TAP_SLOP, createTapGuard, fingerGesture, holdLock, isFinger } from '../src/vue/tapGuard.js'
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
  assert.match(g, /@pointerdown="tap\.down\(\$event\)" @pointermove="tap\.move\(\$event\)" @pointerup="tap\.up\(\$event\)" @pointercancel="tap\.cancel\(\$event\)" @click\.stop="onAdd\(\$event, e\)"/)
  assert.match(g, /const onAdd = \(ev, e\) => \{ if \(tap\.allowClick\(ev\)\) emit\('add', e\.id\) \}/)
  assert.match(g, /unlock = holdLock\(/) // the list stays while the tile is carried
  const css = read('src/css/gallery.css')
  assert.match(css, /@media \(pointer: coarse\) \{[\s\S]*?\.m-gal__dot \{ width: 44px; height: 44px; \}/)
  assert.match(css, /\.m-gal__variant \{ height: 44px;/)
  assert.match(css, /\.m-dedit__head \.m-dpill \{ min-height: 44px; \}/)
  assert.match(css, /@media \(hover: hover\) \{ \.m-gal__add:not\(\.is-added\):hover/) // a tap leaves no stuck hover
  const d = read('src/vue/dash/dashDrag.js')
  assert.match(d, /if \(ev\.pointerId !== pid \|\| moved \|\|/) // another finger's move does not add the tile
  assert.match(d, /document\.addEventListener\('pointercancel', onUpDoc\)/)
})

// ---- review round: a verdict is about its own pointer's click; every gesture has its own lock on the list ----
test('a finger the browser took (pointercancel, no click) holds back no later click: the keyboard, an assistive technology and another pointer are let through; its own click is not', () => {
  const c = clock(), g = createTapGuard({ now: c.now })
  g.down(ev(150, 420, { pointerId: 7 })); g.cancel(ev(150, 400, { pointerId: 7 }))
  assert.equal(g.allowClick({ detail: 0, pointerType: '' }), true, 'Enter / Space on the button, a screen reader')
  assert.equal(g.allowClick({ detail: 1, pointerType: 'touch', pointerId: 9 }), true, 'a click of another pointer')
  assert.equal(g.allowClick({ detail: 1, pointerType: 'touch', pointerId: 7 }), false, 'the click that would follow that finger')
  assert.equal(g.allowClick({ detail: 1, pointerType: 'touch', pointerId: 7 }), true, 'a verdict is used once')
  // a rejected tap (a scroll) and then the keyboard
  g.down(ev(150, 420, { pointerId: 3 })); g.move(ev(150, 330, { pointerId: 3 })); g.up(ev(150, 330, { pointerId: 3 }))
  assert.equal(g.allowClick({ detail: 0, pointerType: '' }), true)
  assert.equal(g.allowClick({ detail: 1, pointerType: 'touch', pointerId: 3 }), false)
})

function fakeDoc() {
  const on = []
  return { on, addEventListener: (t, f, o) => on.push({ t, f, o }), removeEventListener: (t, f) => { const i = on.findIndex((x) => x.t === t && x.f === f); if (i >= 0) on.splice(i, 1) } }
}
test('carrying a tile locks the list for every input device, and one gesture releasing its lock leaves another gesture\'s alone', () => {
  const doc = fakeDoc(), scroller = { scrollTop: 120, style: { overflowY: '' } }, card = { style: { touchAction: '' } }
  const a = holdLock({ doc, scroller, card })
  assert.equal(scroller.style.overflowY, 'hidden'); assert.equal(card.style.touchAction, 'none')
  assert.equal(doc.on.filter((x) => x.t === 'touchmove' && x.o.passive === false).length, 1, 'touchmove is cancelled (a finger)')
  // a pen sends no touchmove: a scroll that happens anyway is put back on the next pointermove
  scroller.scrollTop = 175; doc.on.find((x) => x.t === 'pointermove').f()
  assert.equal(scroller.scrollTop, 120)
  const b = holdLock({ doc, scroller: { scrollTop: 0, style: {} }, card: { style: {} } })
  assert.equal(doc.on.filter((x) => x.t === 'touchmove').length, 2)
  const mine = doc.on.filter((x) => x.t === 'touchmove').map((x) => x.f)
  a()
  assert.equal(doc.on.filter((x) => x.t === 'touchmove').length, 1)
  assert.equal(doc.on.find((x) => x.t === 'touchmove').f, mine[1], 'the second gesture keeps its own listener')
  assert.equal(scroller.style.overflowY, ''); assert.equal(card.style.touchAction, '')
  a() // twice is harmless
  b()
  assert.equal(doc.on.length, 0)
  const g = read('src/vue/MTileGallery.vue')
  assert.ok(!/^const freeze = /m.test(g), 'no listener shared by every gesture')
  assert.match(g, /let unlock = null/); assert.match(g, /unlock = holdLock\(\{ doc: document, scroller: event\.target\.closest\('\.m-gal__main'\), card: event\.target\.closest\('\.m-gal__card'\) \}\)/)
  assert.match(g, /@click\.stop="onAdd\(\$event, e\)"/)
})

// ---- the preview is the tile: same box, same proportions, whatever the width ----
const { columnsOf, SIZE_UNITS, UNIT_GAP, ALL_SIZE_KEYS, sizesOf, effectiveSize } = await import('../src/vue/homeSizes.js')
const { CARD_META } = await import('../src/vue/homeCards.js')
function galleryAt(width, windowClass) {
  resetNotify()
  const g = columnsOf(width, 'standard')
  const cards = ['cpu', 'hero', 'table', 'apps'].filter((id) => CARD_META[id]).map((id) => ({ ...CARD_META[id], id, title: id, available: true }))
  const boxIn = (c, key, u) => { const k = SIZE_UNITS[key] || SIZE_UNITS.s; return { span: Math.min(k[0], u), rows: k[1], cls: 'unit', max: Math.min(k[0], u) } }
  const D = {
    T: ref({}), addable: ref([]), allCards: ref(cards), blocks: ref([]), boxIn, dockBox: () => ({}), dockLayout: ref(false), edit: ref(true), grid: ref(null), gridOf: (w) => columnsOf(w, 'standard'), hasDetailOf: () => false,
    layout: {}, planMoving: ref(false), resizing: ref(false), root: ref(null), rowPxIn: (unit) => (cls) => (cls === 'unit' ? unit : 56), shownIds: computed(() => []), sizeKeysOf: (c) => ALL_SIZE_KEYS.filter((k) => sizesOf(c.id, c, windowClass, Infinity).sizes[k]),
    stacks: {}, tall: ref(false), units: ref(g.columns), width: ref(width), windowClass: ref(windowClass), sel: ref(''),
  }
  useDashEditSheet(D)
  return { D, g, cards }
}
for (const [width, cls] of [[374, 'compact'], [424, 'compact'], [828, 'medium'], [1288, 'large']]) {
  test(`${width} px: the preview of every size of every card has the proportions of the tile the overview draws (a 方形 is a square, 中 is two squares and a gap wide, 大 two squares tall), never stretched`, () => {
    const { D, g, cards } = galleryAt(width, cls)
    let seen = 0
    for (const c of cards) {
      for (const key of ALL_SIZE_KEYS.filter((k) => k !== 'strip' && sizesOf(c.id, c, cls, Infinity).sizes[k])) {
        D.sheetSize.value = { ...D.sheetSize.value, [c.id]: key }
        const e = D.galleryEntries.value.find((x) => x.id === c.id)
        const shown = effectiveSize({ ...c, hasDetail: false }, key, cls, 'manual', { height: false })
        const k = SIZE_UNITS[shown], span = Math.min(k[0], g.columns), rows = k[1]
        assert.equal(e.w, Math.round(span * g.unit + (span - 1) * UNIT_GAP), `${c.id} ${key}: width`)
        assert.equal(e.h, Math.round(rows * g.unit + (rows - 1) * UNIT_GAP), `${c.id} ${key}: height`)
        assert.equal(e.card.span, span); assert.equal(e.card.rows, rows)
        if (shown === 's') assert.equal(e.w, e.h, `${c.id}: 方形 is a square`)
        if (shown === 'm' && g.columns >= 2) assert.equal(e.w, 2 * e.h + UNIT_GAP, `${c.id}: 中 is two squares and the gap between them`)
        if (shown === 'l' && g.columns >= 2) assert.equal(e.h, e.w, `${c.id}: 大 is two squares each way`)
        seen++
      }
    }
    assert.ok(seen >= 4)
  })
}
test('the gallery draws every preview with ONE scale on both axes, shows at least two columns, and names a size by the units the tile has', () => {
  const g = read('src/vue/MTileGallery.vue')
  assert.match(g, /width: `\$\{e\.w \* scaleOf\(e\)\}px`, height: `\$\{e\.h \* scaleOf\(e\)\}px`/)
  assert.match(g, /width: `\$\{e\.w\}px`, height: `\$\{e\.h\}px`, transform: `scale\(\$\{scaleOf\(e\)\}\)`/)
  assert.match(g, /const cols = computed\(\(\) => Math\.max\(2, /)
  assert.ok(!/SIZE_BOX/.test(g), 'the caption does not read the 8-column box table')
  assert.match(g, /const boxOf = \(e\) => \{ const c = e\.card; return c && \(c\.cls === 'unit' \|\| c\.cls === 'tile'\) \? `\$\{c\.span\} × \$\{c\.rows\}` : '' \}/)
  assert.match(g, /\{\{ sizeName\(e\.sizeKey\) \}\} · \{\{ boxOf\(e\) \}\}/)
  const css = read('src/css/gallery.css')
  assert.match(css, /\.m-gal__card\.is-narrow \{ padding: 10px;/)
  const dock = read('src/vue/dash/dashDock.js')
  assert.match(dock, /st\.alignSelf = 'start'; st\.height = `\$\{p\.rows \* b\.unit \+ \(p\.rows - 1\) \* UNIT_GAP\}px`/) // edit mode's wider row gap does not stretch a tile
})
