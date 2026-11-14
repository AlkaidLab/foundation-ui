import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms))

// The preview of 个性化 is the cost of the page's first frame (measured on the panel 2026-11-05: 58 ms with it, 41-42 ms without it and no long frame).
// The first frame paints the empty box at the final size; the preview's own markup is built after that paint, and nothing about the look or the settings changes.
test('afterFirstPaint runs once the frame was painted, exactly once, and a cancelled call never runs', async () => {
  const { afterFirstPaint } = await import('../src/vue/afterFirstPaint.js')
  const frames = []
  const had = globalThis.requestAnimationFrame
  globalThis.requestAnimationFrame = (fn) => (frames.push(fn), frames.length)
  try {
    let ran = 0
    afterFirstPaint(() => { ran += 1 })
    assert.equal(ran, 0, 'not while the component is mounting')
    frames.splice(0).forEach((fn) => fn())
    assert.equal(ran, 0, 'not in the frame callbacks: the frame is not painted yet')
    await tick()
    assert.equal(ran, 1, 'after the frame was painted')
    await tick()
    assert.equal(ran, 1, 'exactly once')
    let cancelled = 0
    const stop = afterFirstPaint(() => { cancelled += 1 })
    stop()
    frames.splice(0).forEach((fn) => fn())
    await tick(30)
    assert.equal(cancelled, 0, 'a component that unmounts before its frame leaves nothing behind')
  } finally {
    if (had === undefined) delete globalThis.requestAnimationFrame
    else globalThis.requestAnimationFrame = had
  }
})

test('a window that paints no frame at all (hidden, minimized) is not held forever', async () => {
  const { afterFirstPaint } = await import('../src/vue/afterFirstPaint.js')
  let ran = 0
  afterFirstPaint(() => { ran += 1 }, 15)
  await tick(40)
  assert.equal(ran, 1)
})

test('the preview paints its place at the final size first and is built after the first paint', () => {
  const src = read('src/vue/MAppearance.vue')
  const css = read('src/css/appearance.css')
  // the box itself is in the first frame, with the size and shape it keeps, and its two paint layers wait for the content
  const quote = String.fromCharCode(39)
  const box = '<div v-if="!compact && (on(' + quote + 'theme' + quote + ') || on(' + quote + 'frost' + quote + '))" ref="previewEl" class="m-ap__preview" :class="{ ' + quote + 'm-ap__preview--holding' + quote + ': previewHolding, ' + quote + 'm-ap__preview--flat' + quote + ': previewFlat }" :style="previewVars" aria-hidden="true">'
  assert.ok(src.includes(box), 'the box, its class and its bindings are in the first frame')
  assert.ok(css.includes('.m-ap__preview--holding::before, .m-ap__preview--holding::after { content: none; }'), 'the wallpaper blur and the scrim wait for the content')
  // the preview's markup is one block behind the flag, its bindings unchanged: every setting reaches it from then on
  const open = src.indexOf('<template v-if="previewIn">')
  const inside = open < 0 ? '' : src.slice(open, src.indexOf('</template>', open))
  assert.ok(inside.includes('m-ap__rail') && inside.includes('m-ap__card--hero') && inside.includes('m-ap__tag'), 'the same preview, only later')
  assert.ok(inside.includes('shown.blur') && inside.includes('shown.dim'), 'it still shows the frost being edited')
  // it is built after the frame was painted, and an unmount cancels the pending build
  assert.ok(src.includes('previewIn.value = true') && src.includes('stopPreview = afterFirstPaint(async () => {'), 'the build waits for the paint')
  assert.ok(src.includes('onBeforeUnmount(() => { stopPreview();'), 'an unmount cancels the pending build')
  // the strip keeps its empty box until the blurred picture (one bitmap) is there; the scrim and the noise are backgrounds of the strip, not layers of their own
  assert.ok(src.includes('const previewHolding = computed(() => !previewIn.value || bakeState.value === ' + quote + 'pending' + quote + ')'), 'the holding state lasts until the bake has answered')
  assert.ok(css.includes('.m-ap__preview--flat::before, .m-ap__preview--flat::after { content: none; }'), 'no pseudo-element layers on the flat strip')
  assert.ok(/\.m-ap__preview--flat \{ background: var\(--m-noise\), linear-gradient\(to bottom, color-mix\(in srgb, var\(--m-page-solid\) calc\(var\(--m-ap-tint\) \* 100%\), transparent\), color-mix\(in srgb, var\(--m-fade-tone\) calc\(var\(--m-ap-end\) \* 100%\), transparent\)\), var\(--m-ap-wall-baked, none\)/.test(css), 'the same scrim and noise as the old layer, now backgrounds of the strip')
  const bake = read('src/vue/previewBake.js')
  assert.ok(bake.includes('filter = `blur(') && bake.includes('toBlob') && bake.includes("state.value = 'failed'"), 'the bitmap is the blurred wallpaper; a failure leaves the old layers')
  // the motion row and the system watcher are untouched: 跟随系统 and reduced motion behave as before
  assert.ok(src.includes('watchSystemMotion') && src.includes('systemReducedMotion()'))
})

test('the log viewer reads scrollHeight after the first paint at its first mount, and keeps the same-frame read for later changes', () => {
  const src = read('src/vue/MLogViewer.vue')
  assert.ok(src.includes('const toEnd = () => { const el = scroller.value; if (el) el.scrollTop = el.scrollHeight }'), 'the tail scroll itself is unchanged')
  assert.ok(src.includes('onMounted(() => { stopFirstScroll = afterFirstPaint(() => { if (follow.value) toEnd() }) })'), 'the first mount reads after the paint, outside the mount task')
  assert.ok(!src.includes('onMounted(scrollEnd)'), 'no read of scrollHeight inside the mount')
  assert.ok(src.includes('function scrollEnd() { nextTick(toEnd) }'), 'changes while following read after every write of that change')
  assert.ok(src.includes('watch(() => props.text, () => { if (follow.value && session.value === null) scrollEnd() })'))
  assert.ok(src.includes('watch(follow, (on) => { if (on) scrollEnd() })'))
})

test('the hue of a hex is solved once, not once per scheme of the same seed', async () => {
  const theme = await import('../src/tokens/theme.js')
  const { Hct } = await import('@material/material-color-utilities')
  const real = Hct.fromInt
  let calls = 0
  Hct.fromInt = function (argb) { calls += 1; return real.call(this, argb) }
  try {
    const options = { dark: false, variant: 'vibrant', style: 'bright' }
    const first = theme.schemeColors('#4a9eff', options)
    const solves = calls
    calls = 0
    const again = theme.schemeColors('#4a9eff', options)
    assert.deepEqual(again, first, 'the memo changes no colour')
    assert.ok(calls < solves, 'the second scheme of the same seed solves fewer hexes (' + calls + ' < ' + solves + ')')
  } finally {
    Hct.fromInt = real
  }
})

test('a jump before the first paint is not pulled back to the tail', () => {
  assert.match(read('src/vue/MLogViewer.vue'), /afterFirstPaint\(\(\) => \{ if \(follow\.value\) toEnd\(\) \}\)/)
})
