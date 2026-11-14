// The two wallpapers of 薇薇 and how they sit in a window. Pure (tested): which one fits the window, and where the picture goes so that
// `cover` cropping keeps her face on screen and, where the window has room, outside the panes that cover the picture.
import { VIVI } from '../about/mascot.js'

/** focus: the middle of her face as a fraction of the picture (measured on the pictures themselves). */
export const WALLPAPERS = Object.freeze({
  vivi1: Object.freeze({ id: 'vivi1', url: VIVI.wallpaper[1], w: 1491, h: 1055, focus: Object.freeze({ x: 0.60, y: 0.50 }) }),
  vivi2: Object.freeze({ id: 'vivi2', url: VIVI.wallpaper[2], w: 1672, h: 941, focus: Object.freeze({ x: 0.63, y: 0.52 }) }),
})
export const WALLPAPER_IDS = Object.freeze(['vivi1', 'vivi2'])

/**
 * Auto: the wide picture for wide windows, the other otherwise. The window must go past 1.7 to switch to the wide one and under 1.5 to leave it,
 * so a window near the middle (1440 x 900 is 1.6) does not flicker while it is resized. With nothing chosen yet the middle, 1.6, decides.
 */
export const AUTO_ASPECT = Object.freeze({ toWide: 1.7, toNormal: 1.5, first: 1.6 })
export function autoPick(prev, width, height) {
  const aspect = height > 0 ? width / height : 1
  if (prev !== 'vivi1' && prev !== 'vivi2') return aspect >= AUTO_ASPECT.first ? 'vivi2' : 'vivi1'
  if (prev === 'vivi2') return aspect < AUTO_ASPECT.toNormal ? 'vivi1' : 'vivi2'
  return aspect > AUTO_ASPECT.toWide ? 'vivi2' : 'vivi1'
}

/**
 * The picture the colours grow from. With Auto the picture shown follows the shape of each window (the control panel's window, the Web UI
 * inside its frame and the Web UI in a browser are three different shapes), so the colours must not follow it: one seed for every window of
 * the product, the wide picture's (the shape of the reference, 1440 x 900). A picture the person chose gives its own colours.
 */
export const COLOUR_PICTURE = 'vivi2'
export const colourPictureId = (source, pickedId) => (source === 'auto' ? COLOUR_PICTURE : pickedId)

/** The parts of [0, width] that no covered range ({ left, right } in pixels) touches. */
export function freeGaps(width, covered = []) {
  const ranges = covered.map((r) => ({ a: Math.max(0, r.left), b: Math.min(width, r.right) })).filter((r) => r.b > r.a).sort((p, q) => p.a - q.a)
  const gaps = []
  let at = 0
  for (const r of ranges) { if (r.a > at) gaps.push({ a: at, b: r.a }); at = Math.max(at, r.b) }
  if (at < width) gaps.push({ a: at, b: width })
  return gaps
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const FACE = 0.075 // half the width of her face, as a fraction of the picture's width (measured)
const overlap = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))

/**
 * Where the picture goes: { size (the picture's width in px), left, top, zoom, face: { x, y }, visible (0..1: how much of her face is outside the
 * panes) }. The candidates are `cover` with the focus alignment (the face at its own place in the picture, whatever the window shape) and, for each
 * free gap of the window of at least `minGap` px, the picture zoomed (at most `maxZoom` times cover) just enough to bring the face into the middle
 * of that gap. The one that shows most of her face wins; zooming costs a little, so nothing zooms for nothing.
 * With `whole` (the least width of a gap, in px) a window that has such a gap beside its content shows the picture small and whole in the widest
 * gap (at the bottom, a margin of 16 px around it) with `whole: true` in the answer, the product fades its edges into a plain field; no face
 * is cut by the window or by a pane then.
 */
export function wallpaperBox(picture, view, covered = [], { minGap = 90, maxZoom = 1.5, whole = 0 } = {}) {
  const { w: iw, h: ih, focus: { x: fx, y: fy } } = picture
  const { width: W, height: H } = view
  const cover = Math.max(W / iw, H / ih)
  const free = freeGaps(W, covered)
  if (whole > 0) {
    const gap = free.filter((g) => g.b - g.a >= whole).sort((p, q) => (q.b - q.a) - (p.b - p.a) || q.a - p.a)[0]
    if (gap) {
      const margin = 16
      const size = Math.min(gap.b - gap.a - 2 * margin, (H - 2 * margin) * iw / ih)
      const left = gap.a + margin + (gap.b - gap.a - 2 * margin - size) / 2
      const top = H - margin - size * ih / iw
      return { size, left, top, zoom: size / (iw * cover), face: { x: left + fx * size, y: top + fy * size * ih / iw }, visible: 1, whole: true }
    }
  }
  const make = (s, left, top) => {
    const half = FACE * iw * s
    const cx = left + fx * iw * s
    const seen = free.reduce((n, g) => n + overlap(cx - half, cx + half, g.a, g.b), 0) / (2 * half)
    return { size: iw * s, left, top, zoom: s / cover, face: { x: cx, y: top + fy * ih * s }, visible: Math.min(1, seen) }
  }
  let best = make(cover, (W - iw * cover) * fx, (H - ih * cover) * fy)
  for (const gap of free.filter((g) => g.b - g.a >= minGap)) {
    const tx = (gap.a + gap.b) / 2
    const need = Math.max(cover, tx / (fx * iw), (W - tx) / ((1 - fx) * iw))
    if (need > cover * maxZoom + 1e-9) continue
    const left = clamp(tx - fx * iw * need, W - iw * need, 0)
    const top = clamp(fy * H - fy * ih * need, H - ih * need, 0)
    const c = make(need, left, top)
    if (c.visible - 0.15 * (c.zoom - 1) > best.visible - 0.15 * (best.zoom - 1) + 1e-9) best = c
  }
  return best
}
