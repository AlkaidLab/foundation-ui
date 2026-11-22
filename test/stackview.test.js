// The smart stack on the overview: the component, its place in the card view and in the overview, behind the flag
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readDash } from './dashSource.js'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

test('the stack is a group a person can turn: swipe, wheel, the dots, keys; only the member shown is drawn (and the neighbour of a swipe while it is moving)', () => {
  const v = read('src/vue/MDashStack.vue')
  assert.match(v, /role="group" aria-roledescription="轮换组" :aria-label="label"/)
  assert.match(v, /<MDashCardView v-else-if="shown" :card="shown"/, 'one member is drawn (the one leaving only for the moment of the move)')
  assert.match(v, /createWheelGesture\(\)/, 'the wheel steps once per gesture and never takes the page\'s own scroll (stackGesture.js)')
  assert.match(v, /swipeIntent\(dx, dy, \{ canTurn, pageCanScroll, touch \}\)/, 'the first movement of a finger decides who has it')
  assert.match(v, /@touchmove="touchMove"/); assert.match(v, /lock === 'swipe' && e\.cancelable\) e\.preventDefault\(\)/, 'the page is stopped only for a finger the stack has')
  assert.match(v, /e\.key === 'ArrowDown'/)
  assert.match(v, /commit\(pos\.value === from \? verdict : 0\)/, 'a member chosen while a swipe settles stands')
  assert.match(v, /<Transition :name="skipAnim \? 'm-dstack-none' : fade \? 'm-dstack-fade' : dir > 0 \? 'm-dstack-up' : 'm-dstack-down'">/)
  assert.doesNotMatch(v, /aria-live="assertive"/)
  // a turn by hand is told in the page's polite live region (one region for the page), a turn by the host is not
  const d = readDash()
  assert.match(d, /if \(source === 'manual'\) D\.say\(stackWords\(stacks\.state\.stacks\[id\], i\)\)/)
  assert.match(d, /<p class="m-dash__live" role="status" aria-live="polite">/)
})

test('the motion is the spatial spring, a vertical shared axis; reduced motion is a short crossfade', () => {
  const css = read('src/css/stack.css')
  assert.match(css, /transition: transform var\(--m-spring-default-spatial-duration, 412ms\) var\(--m-spring-default-spatial, ease\), opacity 200ms linear/)
  assert.match(css, /prefers-reduced-motion: reduce/); assert.match(css, /html\[data-motion='reduced'\]/)
  assert.match(css, /touch-action: pan-y; container-type: size/, 'the page keeps its vertical scroll until the stack has taken the finger on its first movement (a cancelled touchmove)')
  assert.match(read('src/css/all.css'), /@import '\.\/stack\.css'/)
})

test('in the card view and the overview: a stack is a card of its own kind, one box, drawn at a size every member offers; behind the flag', () => {
  assert.match(read('src/vue/MDashCardView.vue'), /<MDashStack v-if="card\.kind === 'stack'"/)
  const d = readDash()
  assert.match(d, /const stacksOn = stacksEnabled\(\)/)
  assert.match(d, /const withStacks = \(list\) => \{\n\s+if \(!stacksOn \|\| D\.dockLayout\.value\) return list/)
  assert.match(d, /if \(card\.kind === 'stack'\) \{ const key = stackSizeFor\(card\)/)
  assert.match(d, /commonSizes\(c\.stackMembers, windowClass\.value, tall\.value\)/)
  assert.match(d, /const visibleCards = computed\(\(\) => withStacks\(visibleCardsRaw\.value\)\)/)
  assert.match(d, /@rotate="onStackRotate" @hover="onStackHover"/)
})


test('the carried tile is the same size as the target and covers it: the target highlight stands above and the carried tile draws back while it hovers', () => {
  const css = read('src/css/stack.css')
  assert.match(css, /\.m-dash__cell\.is-merge-target \{ z-index: 45; \}/)
  assert.match(css, /is-merge-target::after \{ pointer-events: none; z-index: 3;/)
  assert.match(css, /\.is-dragging\.is-merging \.m-dash__body \{ transform: scale\(\.74\)/)
  assert.match(readDash(), /'is-merging': drag\?\.id === c\.id && !!drag\?\.mergeCand/)
})

test('on the way to the middle of a tile of its size the carried tile does not swap places at once: the swap waits a moment so a rest in the middle can join', () => {
  const d = readDash()
  assert.match(d, /const SWAP_DWELL_MS = 260/)
  assert.match(d, /other\.dataset\.size === d\.size && mergeable\(d\.id, id\)/)
  assert.match(d, /if \(!inZone && d\.swapCand\) clearSwap\(\)/)
})

test('in the own layout a stack is anchored by the order of its first member even when no member is shown by itself', () => {
  const d = readDash()
  assert.match(d, /if \(!smart\.value\) \{\n\s+const ord = /)
  assert.match(d, /out\.splice\(at, 0, card\)/)
})

test('the sheet shows only switches that do something, in a settings group; the carried tile leaves its badge behind; no tile size in the settings lines', () => {
  const v = read('src/vue/MStackSheet.vue')
  assert.match(v, /<div class="m-group">\s*<MSwitchItem :model-value="stack\.smartRotate"/)
  assert.match(v, /stack\.suggestions/); assert.match(read('src/vue/MDashStack.vue'), /const suggestion = computed/)
  assert.match(read('src/css/dash.css'), /\.is-edit \.m-dash__cell\.is-dragging \.m-dash__badge, \.is-edit \.m-dash__cell\.is-dragging\.is-over-sheet \.m-dash__badge \{ opacity: 0; pointer-events: none; \}/)
  assert.doesNotMatch(read('src/settings/rowLines.js'), /磁贴尺寸|tile size/)
})

test('a tile of covers without a cover shows an icon (the apps, the gamepad), never the first letter of the name', () => {
  const h = read('src/vue/homeSmall.js'), v = read('src/vue/MDashSmall.vue')
  assert.doesNotMatch(h, /letter:/)
  assert.match(h, /covers: coversOf\(d\.items, 'title', 'apps'\)/)
  assert.doesNotMatch(v, /c\.letter/)
  assert.match(v, /<MIcon v-if="!coverOk\(c\.cover\)" :name="c\.icon \|\| 'sports_esports'" \/>/)
})

test('the open items of the stack: 加入轮换组 on a selected tile, a suggestion page, announcements, a member dragged out of the sheet, the keyboard on a whole stack', () => {
  const d = readDash(), s = read('src/vue/MStackSheet.vue'), v = read('src/vue/MDashStack.vue')
  assert.match(d, /data-stack-join/); assert.match(d, /const joinTargetsOf = /); assert.match(d, /const joinInto = /)
  assert.match(d, /const suggestFor = \(st, members, size\) => \{\n\s+if \(!st\.suggestions\) return null/)
  assert.match(v, /suggestion\.value && to === members\.value\.length/); assert.match(v, /backTimer = setTimeout\(\(\) => \{ sug\.value = false \}, 8000\)/)
  assert.match(d, /const sheetOut = /); assert.match(s, /emit\('out'/); assert.match(s, /outside\.value = outOfPanel\(e\.clientX, e\.clientY\)/)
  assert.match(d, /layout\.step\(laid\(id\), /)
  for (const k of ['stackJoin', 'stackSuggestTag', 'stackSuggestAdd', 'stackSuggestHide', 'stackSuggestLabel', 'stackAdded', 'stackTakenOut', 'stackMoved', 'stackDropOut', 'stackOnPage']) assert.match(read('src/vue/homeCatalogueTextsMore.js'), new RegExp(`${k}: `), k)
})

test('a picture that is not a cover (a pixel, a file that does not load) is no cover: the tile shows its icon, never a blank coloured block', () => {
  const c = read('src/vue/coverOk.js')
  assert.match(c, /const MIN = 16/); assert.match(c, /im\.onerror = \(\) => \{ state\[url\] = 'bad' \}/)
  for (const f of ['MDashWidget', 'MDashSmall', 'MDashApps']) assert.match(read(`src/vue/${f}.vue`), /import \{ coverOk(, coverStyle)? \} from '\.\/coverOk\.js'/, f)
  assert.doesNotMatch(read('src/vue/MDashWidget.vue'), /a\.cover \? \{ backgroundImage/)
})

test('加入轮换组 is in the pill of every selected tile, also of a tile with one size (then the pill is the one button); the title says what it does', () => {
  const d = readDash()
  assert.match(d, /<template v-if="edit && sel === c\.id && !drag\?\.moved && \(c\.sizeKeys\.length > 1 \|\| \(stacksOn && c\.kind !== 'stack' && !c\.ghost && joinTargetsOf\(c\)\.length\)\)">/)
  assert.match(d, /<span v-if="c\.sizeKeys\.length > 1" class="m-dash__sizeset" role="radiogroup"/)
  assert.match(read('src/css/dash.css'), /\.m-dash__sizes-join\.is-alone/)
  const t = read('src/vue/homeCatalogueTextsMore.js')
  assert.match(t, /stackJoinTitle: '把「\{name\}」加入轮换组'/); assert.match(t, /stackJoinTitle: 'Add “\{name\}” to a stack'/)
})
test('the suggestion page stands on the surface of every tile; the button carries the colour', () => {
  const css = read('src/css/stack.css')
  assert.match(css, /\.m-dstack__sug \{[^}]*background: var\(--m-card\)/)
  assert.doesNotMatch(css, /\.m-dstack__sug \{[^}]*tertiary-container/)
})
