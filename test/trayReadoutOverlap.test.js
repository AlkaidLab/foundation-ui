import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import { READOUTS, checkReadouts, loadBrowser, scanReadouts, summarise } from '../tools/readout-overlap.mjs'

// No readout of the tray card is covered or cut off (dragging the 分辨率 slider, its number was covered by the card above). tools/readout-overlap.mjs drags every slider of
// every page to its start, middle and end, by mouse and by finger, and asks the browser what lies on top of every readout (elementFromPoint at its corners). Part 1 reads the CSS and needs no
// browser; part 2 needs Chromium (playwright-core: PLAYWRIGHT_ROOT, QA_CHROME) and skips without it; TRAY_READOUT_SKIP=1 skips it on purpose.
const root = fileURLToPath(new URL('..', import.meta.url))
const css = readFileSync(new URL('../src/css/tray.css', import.meta.url), 'utf8')

test('the tray draws no slider bubble: the readout in the pill\'s title row is the only one', () => {
  assert.match(css, /\.m-tray \.m-slider__bubble\s*\{\s*display:\s*none;?\s*\}/, 'the shared bubble floats out of the pill and was cut by the card or covered the number')
  // nothing lets a slider's content out of its pill any more
  assert.doesNotMatch(css, /\.m-tray__sl \.m-item\s*\{[^}]*overflow:\s*visible/, 'a visible overflow of the pill brings back what covers its neighbours')
})

test('a finger gets the readout bigger by a transform: the row keeps its height, the card does not move', () => {
  const rule = css.match(/\.m-tray\.is-touch \.m-tray__sl:has\([^)]*\) \.m-slider-value\s*\{([^}]*)\}/)
  assert.ok(rule, 'the touch emphasis of the readout is missing')
  assert.match(rule[1], /transform:\s*scale\(/)
  assert.doesNotMatch(rule[1], /(font-size|font|padding|margin|height|line-height):/, 'a change of the row\'s size moves the pills around it')
})

const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) }) })
const ready = (port) => new Promise((resolve, reject) => {
  const t0 = Date.now()
  const poll = () => http.get({ host: '127.0.0.1', port, path: '/tray.html' }, (res) => { res.resume(); resolve() }).on('error', () => (Date.now() - t0 > 30000 ? reject(new Error('the gallery server did not start')) : setTimeout(poll, 250)))
  poll()
})

const skip = process.env.TRAY_READOUT_SKIP === '1'
let browser = null
if (!skip) { try { browser = await loadBrowser() } catch { browser = null } }
const gate = skip ? 'TRAY_READOUT_SKIP=1' : !browser ? 'no Chromium (playwright-core) on this machine' : false

test('no readout of the tray card is covered or cut off, on any page, slider position, theme, scale or input', { skip: gate, timeout: 600000 }, async () => {
  const port = await freePort()
  const vite = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), '--config', 'gallery/vite.config.js', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' })
  try {
    await ready(port)
    const { rows, findings } = await scanReadouts(browser, { port, themes: ['light', 'dark'], dsfs: [1.25], modes: ['mouse', 'touch'], states: ['busy'], pages: ['quick', 'display', 'settings'], locales: ['zh'], maxhs: [0, 560] })
    assert.ok(rows.length >= 48, `only ${rows.length} slider positions were driven`)
    assert.ok(rows.some((r) => r.page === 'display' && r.slider === '分辨率'), 'the resolution slider was not driven')
    assert.ok(rows.every((r) => r.value), 'a readout was empty while its slider was dragged')
    assert.deepEqual(summarise(findings), [])
  } finally {
    vite.kill()
  }
})

test('the check itself sees a covered readout and a cut one', { skip: gate, timeout: 120000 }, async () => {
  const port = await freePort()
  const vite = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), '--config', 'gallery/vite.config.js', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' })
  const ctx = await browser.newContext({ viewport: { width: 800, height: 1400 } })
  try {
    await ready(port)
    const p = await ctx.newPage()
    await p.goto(`http://127.0.0.1:${port}/tray.html?v=3&state=busy&page=display&bare=1&still=1`)
    await p.waitForSelector('.m-tray .m-slider-value')
    await p.waitForTimeout(400)
    assert.deepEqual(await p.evaluate(checkReadouts, READOUTS), [], 'the card at rest is clean')
    // an element that lies over the number of the first slider: covered
    await p.evaluate(() => { const r = document.querySelector('.m-tray__page:not([inert]) .m-slider-value').getBoundingClientRect(); const d = document.createElement('div'); d.id = 'seed'; d.style.cssText = `position:fixed;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;background:red;z-index:99`; document.body.appendChild(d) })
    const covered = await p.evaluate(checkReadouts, READOUTS)
    assert.ok(covered.some((f) => f.el.includes('m-slider-value') && f.bad.some((b) => b.top.includes('div'))), 'a div over the number was not found')
    await p.evaluate(() => document.getElementById('seed').remove())
    // the same number pushed out of the card: cut
    await p.evaluate(() => { document.querySelector('.m-tray__page:not([inert]) .m-slider-value').style.transform = 'translateX(30px)' })
    const cut = await p.evaluate(checkReadouts, READOUTS)
    assert.ok(cut.some((f) => f.el.includes('m-slider-value') && f.bad.length > 0), 'a number cut by the card edge was not found')
  } finally {
    await ctx.close()
    vite.kill()
  }
})

test.after(async () => { if (browser) await browser.close() })
