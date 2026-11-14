// The picture of the 个性化 preview, blurred once. The preview used to show the wallpaper through two layers of its own (a pseudo-element with `filter: blur()` and, above it, a pseudo-element with the
// noise and the scrim) in a stacking context of its own: on the Skyward panel the first frame that painted them was 84-100 ms of GPU raster (the whole preview 33-34 ms when they were left out, the page
// without the preview 33 ms), and neither a smaller copy of the picture, nor staging the layers over three frames, nor a hidden copy painted at idle changed it (measured 2026-11-06). The same strip with
// its blurred picture as one bitmap, and the scrim and the noise as backgrounds of the strip itself, is a first frame of 42 ms. The blur setting and the size of the strip are the only inputs of the bitmap
// (the scrim follows the dim and fade settings as before, in CSS); anything that fails leaves the old two layers in place.
import { onBeforeUnmount, ref } from 'vue'

const urlOf = (css) => (String(css || '').match(/^url\(\s*["']?(.*?)["']?\s*\)$/) || [])[1] || ''
const MARGIN = 24 // the picture layer reached 24 px past the strip on every side (inset: -24px), so the blur never fades at the edge of what shows
const WIDTH_BOUND = 1280 // the decoded picture: the blur needs no more

/**
 * `box`: ref of the preview element; `style`: the computed style of the preview (--m-ap-wall, --m-ap-blur). Returns `baked` (a CSS url() of the bitmap, or '') and `bake()`, to be called when the box
 * is in place, when the blur changes and when the box is resized.
 */
export function usePreviewBake(box, style) {
  const baked = ref('')
  const state = ref('pending') // pending until the first bake has answered; then 'baked', 'none' (no wallpaper: nothing to bake) or 'failed' (the layers of the CSS stay)
  let serial = 0
  let objectUrl = ''
  let picture = null // { src, bitmap }
  const release = () => { if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = '' } }
  const drop = () => { if (picture) { try { picture.bitmap.close?.() } catch { /* already closed */ } picture = null } }
  async function load(src) {
    if (picture && picture.src === src) return picture.bitmap
    drop()
    const blob = await (await fetch(src)).blob()
    const bitmap = await createImageBitmap(blob, { resizeWidth: WIDTH_BOUND, resizeQuality: 'medium' })
    picture = { src, bitmap }
    return bitmap
  }
  async function bake() {
    const mine = ++serial
    try {
      const el = box.value
      const src = urlOf(style.value['--m-ap-wall'])
      const blur = parseFloat(style.value['--m-ap-blur']) || 0
      if (!el) return
      if (!src) { release(); baked.value = ''; state.value = String(style.value['--m-ap-wall'] || 'none') === 'none' ? 'none' : 'failed'; return } // no wallpaper: nothing to bake; a gradient: the CSS layers draw it
      if (typeof createImageBitmap !== 'function') { release(); baked.value = ''; state.value = 'failed'; return }
      const w = el.offsetWidth, h = el.offsetHeight
      if (!w || !h) return
      const bitmap = await load(src)
      if (mine !== serial) return
      const k = blur >= 8 ? 0.5 : 1 // a strong blur needs half the pixels; a light one keeps them
      const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k)), mg = MARGIN * k
      const canvas = document.createElement('canvas')
      canvas.width = cw; canvas.height = ch
      const g = canvas.getContext('2d')
      const bw = cw + 2 * mg, bh = ch + 2 * mg
      const scale = Math.max(bw / bitmap.width, bh / bitmap.height) // background-size: cover
      const dw = bitmap.width * scale, dh = bitmap.height * scale
      g.filter = `blur(${blur * k}px)`
      g.drawImage(bitmap, -mg + (bw - dw) / 2, -mg + (bh - dh) / 2, dw, dh)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (mine !== serial || !blob) return
      const next = URL.createObjectURL(blob)
      release()
      objectUrl = next
      baked.value = `url("${next}")`
      state.value = 'baked'
    } catch {
      if (mine === serial) { release(); baked.value = ''; state.value = 'failed' }
    }
  }
  onBeforeUnmount(() => { serial += 1; release(); drop() })
  return { baked, state, bake }
}
