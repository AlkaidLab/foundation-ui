// The Panel shows the Web UI in a frame of another origin: its markup cannot be read from the page around it. So the frame answers a question: the page that wants a screenshot asks every frame it cannot read for its marked boxes
// (postMessage, rectangles only, never content), and a frame that does not answer in time is covered whole. The embedded Web UI calls answerRedactRequests() once.
import { collectRedactRects, clampRect, PAD } from './shot.js'

export const ASK = 'foundation-ui:redact-rects'
export const REPLY = 'foundation-ui:redact-rects:reply'
export const ASK_TIMEOUT_MS = 500

/** In an embedded page: answers the page that holds the frame (and only it) with the boxes of this page. -> stop() */
export function answerRedactRequests(win = globalThis, collect = (view) => collectRedactRects(win.document, view)) {
  if (!win?.addEventListener || win.parent === win) return () => {}
  const onMessage = (event) => {
    const data = event.data
    if (!data || data.kind !== ASK || event.source !== win.parent) return
    let rects = []
    try { rects = collect({ width: win.innerWidth, height: win.innerHeight }) } catch { rects = [] }
    try { event.source.postMessage({ kind: REPLY, id: data.id, rects: rects.map(({ x, y, w, h, kind }) => ({ x, y, w, h, kind })), width: win.innerWidth, height: win.innerHeight }, event.origin || '*') } catch { /* the parent is gone */ }
  }
  win.addEventListener('message', onMessage)
  return () => win.removeEventListener('message', onMessage)
}

let counter = 0
/** The boxes of a frame that cannot be read, in the page's own coordinates: asked by message, and covered whole when no answer comes. */
export function askFrame(frame, box, { win = globalThis, timeoutMs = ASK_TIMEOUT_MS, view = {} } = {}) {
  const cover = () => { const r = clampRect({ x: box.left, y: box.top, w: box.width, h: box.height, kind: 'text' }, view.width || win.innerWidth, view.height || win.innerHeight); return r ? [r] : [] }
  const target = frame.contentWindow
  if (!target?.postMessage || !win?.addEventListener) return Promise.resolve(cover())
  const id = `r${(counter += 1)}`
  return new Promise((resolve) => {
    const done = (rects) => { clearTimeout(timer); win.removeEventListener('message', onMessage); resolve(rects) }
    const onMessage = (event) => {
      const d = event.data
      if (!d || d.kind !== REPLY || d.id !== id || event.source !== target) return
      const sx = d.width > 0 ? box.width / d.width : 1, sy = d.height > 0 ? box.height / d.height : 1
      const out = (Array.isArray(d.rects) ? d.rects : []).slice(0, 400).map((r) => clampRect({ x: box.left + Number(r.x) * sx, y: box.top + Number(r.y) * sy, w: Number(r.w) * sx, h: Number(r.h) * sy, kind: String(r.kind || 'text') }, view.width || win.innerWidth, view.height || win.innerHeight)).filter(Boolean)
      done(out)
    }
    const timer = setTimeout(() => done(cover()), timeoutMs)
    win.addEventListener('message', onMessage)
    try { target.postMessage({ kind: ASK, id }, '*') } catch { done(cover()) }
  })
}

/** Every marked box of the page, frames included (the ones that cannot be read are asked). */
export async function collectAllRects(root, view = {}, options = {}) {
  const unreadable = []
  const rects = collectRedactRects(root, view, { x: 0, y: 0 }, 0, unreadable)
  const asked = await Promise.all(unreadable.map(({ frame, box }) => askFrame(frame, box, { ...options, view })))
  return [...rects, ...asked.flat()].slice(0, 400)
}
export { PAD }
