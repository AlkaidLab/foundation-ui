import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { alignedScrollLeft, nearestScrollTop, pageLeft, trackOffset, trackTransform } from '../src/tray/trayPager.js'

// The V3 pager at rest (page 2 drawn half over page 1 and half over page 3). The track is placed by percent of its own width, which is the viewport's; the viewport
// is never scrolled sideways; a focus never scrolls it sideways. src/vue/MTrayMenu.vue + src/tray/trayPointer.js use these.
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('the track is at -index x 100 %, plus the finger', () => {
  assert.equal(trackTransform(0), 'translateX(calc(0% + 0px))')
  assert.equal(trackTransform(2), 'translateX(calc(-200% + 0px))')
  assert.equal(trackTransform(1, -37.5), 'translateX(calc(-100% + -37.5px))')
})

test('every page sits exactly in the viewport at rest, at every width, whole pixels or not', () => {
  for (const width of [240, 330, 333.3, 360, 360.44, 412.4, 450, 540, 810]) {
    for (let index = 0; index < 5; index++) {
      assert.equal(Math.abs(pageLeft(index, width, 0, 0)) < 1e-9, true, `page ${index} at width ${width}`)
      assert.ok(Math.abs(trackOffset(index, width) + index * width) < 1e-9)
    }
  }
})

test('a viewport that has been scrolled sideways shifts every page by exactly that (the bug: 272 px)', () => {
  assert.equal(pageLeft(1, 360, 0, 272), -272)
  assert.equal(pageLeft(2, 360, 0, 272), -272)
  assert.equal(alignedScrollLeft, 0)
})

test('nearestScrollTop only moves up or down, as little as it takes', () => {
  const v = { viewTop: 100, viewBottom: 500 }
  assert.equal(nearestScrollTop({ ...v, top: 120, bottom: 180, scrollTop: 30 }), 30) // in view: nothing
  assert.equal(nearestScrollTop({ ...v, top: 80, bottom: 140, scrollTop: 30 }), 10) // above: up by 20
  assert.equal(nearestScrollTop({ ...v, top: 480, bottom: 560, scrollTop: 30 }), 90) // below: down by 60
  assert.equal(nearestScrollTop({ ...v, top: 480, bottom: 900, scrollTop: 0 }), 380) // taller than the view: its top at the view's top
})

test('the component never lets the viewport scroll sideways', () => {
  const menu = src('../src/vue/MTrayMenu.vue')
  assert.match(menu, /el\.focus\(\{ focusVisible: true, preventScroll: true \}\)/, 'focus is given with preventScroll')
  assert.equal(/\.focus\(\{ focusVisible: true \}\)/.test(menu), false, 'no focus() that may scroll the viewport sideways')
  assert.match(menu, /@scroll\.passive="keepAligned"/, 'a sideways scroll is undone')
  assert.match(menu, /keepAligned\(\); placeTrack\(0\)/, 'a page change realigns before the track is placed')
  const pointer = src('../src/tray/trayPointer.js')
  assert.match(pointer, /track\.value\.style\.transform = trackTransform\(nav\.index, dx\)/)
})
