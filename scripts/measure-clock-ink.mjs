// Measures the ink of every glyph the dock clock can draw, from rendered pixels, and writes src/appearance/clockInk.js.
//   node scripts/measure-clock-ink.mjs <url of a page that loads foundation-ui all.css, e.g. the panel>
// Why pixels and not canvas measureText: the canvas draws the proportional figures (no font-variant-numeric) and knows no width axis, so for the tabular,
// condensed and expanded digits of the faces its side bearings are off by up to 0.04 em (10 px at a 270 px hero clock). Here every glyph is drawn by the
// browser with the face's own CSS (tabular figures, variable axes, italic, strokes, the Outline layer), black on white, at 2x; its ink box is compared with the
// advance box of its text (a Range). Per glyph: [left overhang, right overhang] in em of the glyph's font size; positive = the ink passes the advance box.
// Bearings scale with the size, so the table holds at every size. Growth changes its weight through the minute: the worst of three weights is kept.
// playwright-core is resolved from PW_REQUIRE_FROM (a directory with node_modules) or from here.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { HANZI_CHARS } from '../src/appearance/clockFaces.js'

const require = createRequire(process.env.PW_REQUIRE_FROM ? `${process.env.PW_REQUIRE_FROM}/` : import.meta.url)
const { chromium } = require('playwright-core')
const url = process.argv[2]
if (!url) { console.error('usage: node scripts/measure-clock-ink.mjs <page url>'); process.exit(2) }
const DIGITS = '0123456789'
// role: the element a glyph sits in, as MDockClock.vue's ink measurement names it; html: the glyph `c` in that element, inside the face
const STACK = (f) => [[`${f}:l`, DIGITS, (c) => `<span class="m-clock__l" data-text="${c}">${c}</span>`], [`${f}:s`, DIGITS, (c) => `<span class="m-clock__l"><span class="m-clock__s" data-text="${c}">${c}</span></span>`]]
const LINE = (f) => [[`${f}:line`, DIGITS, (c) => `<span class="m-clock__line">${c}</span>`], [`${f}:s`, DIGITS, (c) => `<span class="m-clock__line"><span class="m-clock__s">${c}</span></span>`]]
const JOBS = [
  ...['default', 'metro', 'inflate', 'outline'].map((f) => [f, STACK(f)]),
  ...['calligraphy', 'handwritten', 'minimal', 'tall'].map((f) => [f, LINE(f)]),
  ...[200, 500, 800].map((w) => ['growth', LINE('growth'), `--clock-w: ${w}`]),
  ['flex', [['flex:fx0', DIGITS, (c) => `<span class="m-clock__line"><span class="m-clock__fx m-clock__fx--0">${c}</span></span>`], ['flex:fx4', DIGITS, (c) => `<span class="m-clock__line"><span class="m-clock__fx m-clock__fx--4">${c}</span></span>`], ['flex:s', DIGITS, (c) => `<span class="m-clock__line"><span class="m-clock__s">${c}</span></span>`]]],
  ['numoverlap', [['numoverlap:d0', DIGITS, (c) => `<span class="m-clock__row"><span class="m-clock__d m-clock__d--0">${c}</span></span>`], ['numoverlap:d3', DIGITS, (c) => `<span class="m-clock__row"><span class="m-clock__d m-clock__d--3">${c}</span></span>`], ['numoverlap:s', DIGITS, (c) => `<span class="m-clock__row"><span class="m-clock__s">${c}</span></span>`]]],
  ['hanzi', [['hanzi:l', HANZI_CHARS, (c) => `<span class="m-clock__l">${c}</span>`], ['hanzi:ls', HANZI_CHARS, (c) => `<span class="m-clock__l m-clock__l--s">${c}</span>`]]],
]
const SIZE = 120 // --clock-size of the specimens

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb', '--font-render-hinting=none'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 2400 }, deviceScaleFactor: 2 })
await page.goto(url)
await page.waitForTimeout(2500)
const table = {}
for (const [face, roles, extra = ''] of JOBS) {
  const cells = roles.flatMap(([role, chars, html]) => [...chars].map((c) => ({ role, c, html: html(c) })))
  const n = await page.evaluate(({ face, cells, extra, SIZE }) => {
    document.getElementById('ink-sheet')?.remove()
    for (const d of document.querySelectorAll('dialog[open]')) d.close()
    for (const p of document.querySelectorAll(':popover-open')) p.hidePopover()
    const sheet = document.createElement('div'); sheet.id = 'ink-sheet'
    sheet.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#fff;overflow:hidden'
    const style = document.createElement('style')
    style.textContent = '#ink-sheet .m-clock, #ink-sheet .m-clock * { color: #000 !important; -webkit-text-stroke-color: #000 !important; background: none !important; -webkit-text-fill-color: #000 !important; animation: none !important; transition: none !important; } #ink-sheet [data-text]::before { color: #000 !important; -webkit-text-fill-color: #000 !important; } #ink-sheet .m-clock [data-ink] { margin: 0 !important; }'
    sheet.appendChild(style)
    document.body.appendChild(sheet)
    cells.forEach((x, i) => {
      const t = document.createElement('time'); t.className = `m-clock m-clock--${face}`; t.style.cssText = `position:absolute;--clock-size:${SIZE}px;${extra};left:0;top:0`
      t.innerHTML = x.html; t.dataset.cell = i; sheet.appendChild(t)
    })
    // place the cells on a grid wide enough for the face
    const els = [...sheet.querySelectorAll('time')]
    const fsMax = Math.max(...els.map((e) => { const n = e.querySelector('*:not(:has(*))') || e; return parseFloat(getComputedStyle(n).fontSize) }))
    const cw = Math.ceil(fsMax * 1.6), ch = Math.ceil(fsMax * 1.5), cols = Math.max(1, Math.floor(1560 / cw))
    els.forEach((e, i) => { e.style.left = `${20 + (i % cols) * cw + fsMax * 0.3}px`; e.style.top = `${20 + Math.floor(i / cols) * ch + fsMax * 0.15}px` })
    window.__inkCells = { cw, ch, cols }
    return els.length
  }, { face, cells, extra, SIZE })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  const boxes = await page.evaluate(() => [...document.querySelectorAll('#ink-sheet time')].map((t) => {
    const w = document.createTreeWalker(t, NodeFilter.SHOW_TEXT); const node = w.nextNode()
    const r = document.createRange(); r.selectNodeContents(node); const b = r.getBoundingClientRect()
    return { l: b.left, r: b.right, t: b.top, b: b.bottom, fs: parseFloat(getComputedStyle(node.parentElement).fontSize) }
  }))
  const { cw, ch, cols } = await page.evaluate(() => window.__inkCells)
  const rows = Math.ceil(n / cols)
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1600, height: Math.min(2400, 40 + rows * ch) } })
  if (40 + rows * ch > 2400) throw new Error(`${face}: the sheet does not fit`)
  const inks = await page.evaluate(async ({ b64, boxes, cw, ch, cols }) => {
    const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
    const c = new OffscreenCanvas(bm.width, bm.height); const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bm, 0, 0)
    const d = x.getImageData(0, 0, bm.width, bm.height), W = bm.width
    return boxes.map((_, i) => {
      const X0 = (20 + (i % cols) * cw) * 2, Y0 = (20 + Math.floor(i / cols) * ch) * 2
      let l = 1e9, r = -1
      for (let y = Y0; y < Math.min(d.height, Y0 + ch * 2); y++) for (let xx = X0; xx < Math.min(W, X0 + cw * 2); xx++) { const k = (y * W + xx) * 4; if (d.data[k] + d.data[k + 1] + d.data[k + 2] < 600) { if (xx < l) l = xx; if (xx > r) r = xx } }
      return r < 0 ? null : { l: l / 2, r: (r + 1) / 2 }
    })
  }, { b64: png.toString('base64'), boxes, cw, ch, cols })
  cells.forEach((x, i) => {
    const b = boxes[i], k = inks[i]
    if (!k) throw new Error(`${x.role} ${x.c}: no ink`)
    const v = [Math.round(((b.l - k.l) / b.fs) * 1000) / 1000, Math.round(((k.r - b.r) / b.fs) * 1000) / 1000]
    const row = (table[x.role] ||= {})
    row[x.c] = row[x.c] ? [Math.max(row[x.c][0], v[0]), Math.max(row[x.c][1], v[1])] : v
  })
  console.log(face, extra, 'cells', n)
}
await browser.close()
const out = `// Generated by scripts/measure-clock-ink.mjs from rendered pixels (${new Date().toISOString().slice(0, 10)}): do not edit by hand, run it again when a face's font or axes change.
// The ink of every glyph of the dock clock past its advance box, [left, right] in em of the glyph's font size (positive: the ink passes the box; an italic's lean, the Outline layer).
// Keys: face:role, the role being the element the glyph sits in (l a stacked line, s the seconds, line one line, fx0/fx4 the first and last of Flex, d0/d3 of Numoverlap, ls the seconds line of 文字).
export const CLOCK_INK = ${JSON.stringify(table)}
`
fs.writeFileSync(new URL('../src/appearance/clockInk.js', import.meta.url), out)
console.log('wrote src/appearance/clockInk.js:', Object.keys(table).length, 'roles')
