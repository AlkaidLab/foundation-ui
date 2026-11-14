// Readout-overlap check for the tray menu (gallery/tray.html): is every number, label and badge the card shows left uncovered and uncut while a slider is dragged?
//
// For every page, variant, state, language, theme, scale and input mode it drags every slider to its start, middle and end (a mouse, or a finger through CDP touch events: the
// pointer type is what makes the shared slider draw its touch bubble), and after each move it takes every readout of the card and asks the browser what is on top of it
// (document.elementFromPoint at the inset corners, the middle of the top and the bottom edge, and the centre). A readout whose point is answered by anything that is not the
// readout or a part of it is covered; a point the browser answers with null is cut off (by the card, by the scroller of a page that does not fit the window).
// Elements that do not take part in the card (the other pages of the track, rows scrolled out of the window) and hidden or faded ones are left out.
//
//   node tools/readout-overlap.mjs --port 18991 --out DIR [--themes light,dark] [--dsf 1,1.25,1.5] [--modes mouse,touch] [--variants 3] [--states busy,vdd]
//        [--pages quick,display,settings] [--locales zh] [--maxh 0,520] [--shots] [--tag run]
// Exit status 1 if a readout is covered or cut. The same function backs test/trayReadoutOverlap.test.js, which starts its own gallery server.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// every readout of the quick panel: the live value of a slider and its bubble, the line that names the display, a failure under a slider, a badge, the words of a pill, a strip, a page title
export const READOUTS = [
  '.m-slider-value', '.m-slider__bubble', '.m-tray__sl-target-text', '.m-tray__sl-err', '.m-tray__badge', '.m-tray__tile-state', '.m-tray__tile-label', '.m-tray__tile-chip',
  '.m-tray__strip-text', '.m-tray__st-name', '.m-tray__label', '.m-tray__foot-title', '.m-tray__bar-title', '.m-trayset__hint', '.m-tray__supchip',
].join(', ')

// runs in the page: the readouts of the card that something else sits on top of
export function checkReadouts(selector) {
  const root = document.querySelector('.m-tray')
  const surface = root.querySelector('.m-tray__surface').getBoundingClientRect()
  const viewportEl = root.querySelector('.m-tray__viewport')
  const win = viewportEl ? viewportEl.getBoundingClientRect() : surface
  const scrolls = !!viewportEl && viewportEl.classList.contains('is-scroll')
  const desc = (e) => (e ? e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : '') : 'null')
  const out = []
  for (const el of document.querySelectorAll(selector)) {
    if (!root.contains(el)) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    let o = 1
    for (let n = el; n && n !== document.body; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity)
    if (o < 0.6) continue // a bubble that is not drawn, a row that is leaving
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    if (cx < surface.left || cx > surface.right || cy < surface.top || cy > surface.bottom) continue // another page of the track
    const inChrome = !!el.closest('.m-tray__chrome')
    if (scrolls && !inChrome && (r.top < win.top - 0.5 || r.bottom > win.bottom + 0.5)) continue // scrolled partly out of the window: cut by the person's own scroll
    const inset = Math.max(1, Math.min(0.3 * Math.min(r.width, r.height), 8))
    const pts = [[r.left + inset, r.top + inset], [r.right - inset, r.top + inset], [r.left + inset, r.bottom - inset], [r.right - inset, r.bottom - inset], [cx, cy], [cx, r.top + inset], [cx, r.bottom - inset]]
    const bad = []
    for (const [x, y] of pts) {
      const top = document.elementFromPoint(x, y)
      if (!top) { bad.push({ x: Math.round(x), y: Math.round(y), top: 'cut' }); continue }
      if (el === top || el.contains(top)) continue
      bad.push({ x: Math.round(x), y: Math.round(y), top: desc(top), text: (top.textContent || '').trim().slice(0, 20) })
    }
    if (bad.length) out.push({ el: desc(el), text: (el.textContent || '').trim().slice(0, 30), box: [r.left, r.top, r.width, r.height].map(Math.round), bad })
  }
  return out
}

const KEYS = { 分辨率: 'resolution', 刷新率: 'refresh', 码率上限: 'bitrate', 缩放: 'dpi' }
const csv = (s) => String(s).split(',').map((x) => x.trim()).filter(Boolean)

export async function loadBrowser() {
  const roots = [process.env.PLAYWRIGHT_ROOT, path.join(os.homedir(), 'node_modules') + '/'].filter(Boolean)
  let chromium = null
  for (const r of roots) { try { chromium = createRequire(r)('playwright-core').chromium; break } catch { /* next */ } }
  if (!chromium) return null
  const exe = process.env.QA_CHROME
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-gpu'] })
  return browser
}

/** drags every slider of every page to its start, middle and end and returns { rows, findings } */
export async function scanReadouts(browser, o) {
  const themes = o.themes || ['light', 'dark'], dsfs = o.dsfs || [1, 1.5], modes = o.modes || ['mouse', 'touch'], variants = o.variants || ['3']
  const states = o.states || ['busy'], pages = o.pages || ['quick', 'display', 'settings'], locales = o.locales || ['zh'], maxhs = o.maxhs || [0]
  const rows = [], findings = []
  const hook = () => { const s = document.createElement('style'); s.textContent = '.m-slider__bubble{pointer-events:auto !important}'; document.head.appendChild(s) }
  for (const theme of themes) for (const dsf of dsfs) for (const mode of modes) {
    const touch = mode === 'touch'
    const ctx = await browser.newContext({ viewport: { width: 800, height: 1400 }, deviceScaleFactor: dsf, hasTouch: touch })
    const p = await ctx.newPage()
    const cdp = await ctx.newCDPSession(p)
    const touchAt = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 1 }] })
    const open = async (url) => {
      for (let k = 0; k < 8; k++) {
        try { await p.goto(url); await p.waitForSelector('.m-tray', { timeout: 12000 }); await p.evaluate(hook); await p.waitForTimeout(350); return } catch (e) { await p.waitForTimeout(1500) /* the dev server re-optimised its dependencies: again */ }
      }
      throw new Error('cannot open ' + url)
    }
    for (const v of variants) for (const state of states) for (const locale of locales) for (const maxh of maxhs) for (const page of pages) {
      const url0 = `http://127.0.0.1:${o.port}/tray.html?v=${v}&state=${state}&page=${page === 'root' ? '' : page}&bare=1&still=1&theme=${theme}&locale=${locale}${maxh ? '&maxh=' + maxh : ''}${touch ? '&density=touch&input=touch' : ''}${o.extra || ''}`
      let url = url0
      const where = { theme, dsf, mode, v, state, locale, maxh, page }
      await open(url)
      for (const f of await p.evaluate(checkReadouts, READOUTS)) findings.push({ ...where, slider: '-', pos: 'rest', ...f })
      const n = await p.locator('.m-tray__page:not([inert]) .m-slider').count()
      for (let i = 0; i < n; i++) {
        for (const scrolled of maxh ? [false, true] : [false]) for (const pos of [0, 0.5, 1]) {
          url = o.fail ? `${url0}&fail=${KEYS[(await p.locator('.m-tray__page:not([inert]) .m-slider').nth(i).evaluate((e) => e.closest('.m-item')?.querySelector('.m-item__title')?.textContent || '').catch(() => '')) || ''] || ''}` : url0
          await open(url)
          const sl = p.locator('.m-tray__page:not([inert]) .m-slider').nth(i)
          const label = await sl.evaluate((e) => e.closest('.m-item')?.querySelector('.m-item__title')?.textContent || '')
          if (maxh) await sl.evaluate((e, block) => { e.closest('.m-item').scrollIntoView({ block }) }, scrolled ? 'start' : 'center') // a slider outside the window is not reached by a finger
          if (maxh) await p.waitForTimeout(100)
          const bb = await sl.boundingBox()
          const y = bb.y + bb.height / 2
          const x1 = bb.x + 12 + (bb.width - 24) * pos
          const x0 = pos === 0.5 ? bb.x + bb.width * 0.3 : bb.x + bb.width * 0.5 // the press lands off the target, so the drag moves
          if (touch) { await touchAt('touchStart', x0, y); for (let s = 1; s <= 4; s++) await touchAt('touchMove', x0 + ((x1 - x0) * s) / 4, y) } else { await p.mouse.move(x0, y); await p.mouse.down(); await p.mouse.move(x1, y, { steps: 4 }) }
          await p.waitForTimeout(250)
          const bad = await p.evaluate(checkReadouts, READOUTS)
          const bubble = await p.evaluate(() => [...document.querySelectorAll('.m-slider__bubble')].some((e) => parseFloat(getComputedStyle(e).opacity) > 0.9 && getComputedStyle(e).display !== 'none'))
          const value = await sl.evaluate((e) => e.closest('.m-item')?.querySelector('.m-slider-value')?.textContent || '')
          rows.push({ ...where, slider: label, pos, scrolled, bubble, value, covered: bad.length })
          for (const f of bad) findings.push({ ...where, slider: label, pos, scrolled, ...f })
          if (o.shots) {
            fs.mkdirSync(o.shots, { recursive: true })
            await p.locator('.m-tray').screenshot({ path: path.join(o.shots, `${o.tag || 'run'}-${theme}-${mode}-dsf${dsf}-${state}-${locale}-v${v}-${page}-s${i}${maxh ? '-h' + maxh + (scrolled ? 's' : '') : ''}-${pos}.png`) })
          }
          if (touch) await touchAt('touchEnd', x1, y); else await p.mouse.up()
          if (o.fail) {
            await p.waitForTimeout(1300) // the mock host answers a release after 700 ms and, for the slider named in ?fail=, with a refusal that stays under the slider
            const after = await p.evaluate(checkReadouts, READOUTS)
            const errShown = await p.evaluate(() => !!document.querySelector('.m-tray__page:not([inert]) .m-tray__sl-err'))
            rows.push({ ...where, slider: label, pos: `${pos}+released`, scrolled, errShown, covered: after.length })
            for (const f of after) findings.push({ ...where, slider: label, pos: `${pos}+released`, scrolled, ...f })
          }
        }
      }
    }
    await ctx.close()
    if (o.onProgress) o.onProgress(rows, findings)
  }
  return { rows, findings }
}

export function summarise(findings) {
  const uniq = new Map()
  for (const f of findings) {
    const k = `${f.page}|${f.slider}|${f.el}|${[...new Set(f.bad.map((x) => x.top))].join(',')}`
    ;(uniq.get(k) || uniq.set(k, []).get(k)).push(`${f.theme}/${f.dsf}/${f.mode}/${f.state}/${f.locale}/${f.maxh ? 'h' + f.maxh + '/' : ''}${f.pos}`)
  }
  return [...uniq].map(([k, v]) => `${k}  x${v.length}  e.g. ${v.slice(0, 2).join(' ')}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2)
  const one = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
  const OUT = one('--out', path.join(os.tmpdir(), 'tray-readouts')), TAG = one('--tag', 'run')
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await loadBrowser()
  if (!browser) { console.error('no playwright-core / chromium found (PLAYWRIGHT_ROOT, QA_CHROME)'); process.exit(2) }
  const t0 = Date.now()
  const partial = { rows: [], findings: [] }
  let res
  try { res = await scanReadouts(browser, {
    port: one('--port'), themes: csv(one('--themes', 'light,dark')), dsfs: csv(one('--dsf', '1,1.25,1.5')).map(Number), modes: csv(one('--modes', 'mouse,touch')), variants: csv(one('--variants', '3')),
    states: csv(one('--states', 'busy')), pages: csv(one('--pages', 'quick,display,settings')), locales: csv(one('--locales', 'zh')), maxhs: csv(one('--maxh', '0')).map(Number),
    extra: one('--extra', ''), fail: args.includes('--fail'), shots: args.includes('--shots') ? path.join(OUT, 'shots') : null, tag: TAG,
    onProgress: (rows, findings) => { partial.rows = rows; partial.findings = findings; fs.writeFileSync(path.join(OUT, `${TAG}-findings.json`), JSON.stringify(partial)) },
  }) } catch (e) { console.error('scan stopped:', String(e).slice(0, 200)); process.exit(3) }
  fs.writeFileSync(path.join(OUT, `${TAG}-findings.json`), JSON.stringify(res, null, 1))
  console.log(`${res.rows.length} drag positions, ${res.findings.length} readouts covered or cut, ${Math.round((Date.now() - t0) / 1000)} s`)
  for (const l of summarise(res.findings)) console.log(l)
  await browser.close()
  process.exit(res.findings.length ? 1 : 0)
}
