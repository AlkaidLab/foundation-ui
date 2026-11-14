// 薇薇 (Vivi), the one mascot of both products. Every file is its own downscale of the original art, so each size is crisp: the small sizes are
// made from the original no-background art (`source/`), the large ones from the avatar render (`gen/`). A slot asks for the size it draws and the
// density of the screen; `viviImage` returns the file that fits (never a big image shrunk by the browser).
// every file is named literally so the bundlers find and copy it
const LOGO_SIZES = Object.freeze([24, 32, 48, 64, 96, 128, 192])
const AVATAR_SIZES = Object.freeze([256, 384, 512, 768, 1024])
const CLIP_SMALL = Object.freeze([24, 32, 48]) // the head of the clip only: the whole clip is a speck at these sizes
const CLIP_LARGE = Object.freeze([64, 96, 128, 256, 512])

export const VIVI = Object.freeze({
  logo: Object.freeze({ 24: new URL('../assets/vivi/vivi-logo-24.png', import.meta.url).href, 32: new URL('../assets/vivi/vivi-logo-32.png', import.meta.url).href, 48: new URL('../assets/vivi/vivi-logo-48.png', import.meta.url).href, 64: new URL('../assets/vivi/vivi-logo-64.png', import.meta.url).href, 96: new URL('../assets/vivi/vivi-logo-96.png', import.meta.url).href, 128: new URL('../assets/vivi/vivi-logo-128.png', import.meta.url).href, 192: new URL('../assets/vivi/vivi-logo-192.png', import.meta.url).href }),
  avatar: Object.freeze({ 256: new URL('../assets/vivi/vivi-avatar-256.webp', import.meta.url).href, 384: new URL('../assets/vivi/vivi-avatar-384.webp', import.meta.url).href, 512: new URL('../assets/vivi/vivi-avatar-512.webp', import.meta.url).href, 768: new URL('../assets/vivi/vivi-avatar-768.webp', import.meta.url).href, 1024: new URL('../assets/vivi/vivi-avatar-1024.webp', import.meta.url).href }),
  clip: Object.freeze({ 24: new URL('../assets/vivi/vivi-clip-24.png', import.meta.url).href, 32: new URL('../assets/vivi/vivi-clip-32.png', import.meta.url).href, 48: new URL('../assets/vivi/vivi-clip-48.png', import.meta.url).href, 64: new URL('../assets/vivi/vivi-clip-64.webp', import.meta.url).href, 96: new URL('../assets/vivi/vivi-clip-96.webp', import.meta.url).href, 128: new URL('../assets/vivi/vivi-clip-128.webp', import.meta.url).href, 256: new URL('../assets/vivi/vivi-clip-256.webp', import.meta.url).href, 512: new URL('../assets/vivi/vivi-clip-512.webp', import.meta.url).href }),
  loading: new URL('../assets/vivi/vivi-loading.webp', import.meta.url).href, // four open-eyed frames, 288 x 392 each
  bg: new URL('../assets/vivi/vivi-bg.webp', import.meta.url).href,
  wallpaper: Object.freeze({ 1: new URL('../assets/vivi/vivi-wallpaper-1.webp', import.meta.url).href, 2: new URL('../assets/vivi/vivi-wallpaper-2.webp', import.meta.url).href }),
  buttons: Object.freeze({ close: new URL('../assets/vivi/btn-close.svg', import.meta.url).href, maximize: new URL('../assets/vivi/btn-maximize.svg', import.meta.url).href, minimize: new URL('../assets/vivi/btn-minimize.svg', import.meta.url).href, restore: new URL('../assets/vivi/btn-restore.svg', import.meta.url).href }),
})
export const LOGO_MAX = LOGO_SIZES[LOGO_SIZES.length - 1]
const atLeast = (sizes, need) => sizes.find((s) => s >= need) ?? sizes[sizes.length - 1]

/**
 * The file of the figure for a slot: `px` CSS pixels at `dpr` device pixels per CSS pixel. Up to 192 device pixels the no-background original art,
 * above that the avatar render. Returns { src, srcset, size } with a 1x and a 2x candidate so the browser can also choose by its own density.
 */
export function viviImage(px, dpr = 1) {
  const one = (d) => { const need = Math.ceil(px * d); return need <= LOGO_MAX ? { file: VIVI.logo[atLeast(LOGO_SIZES, need)], w: atLeast(LOGO_SIZES, need) } : { file: VIVI.avatar[atLeast(AVATAR_SIZES, need)], w: atLeast(AVATAR_SIZES, need) } }
  const a = one(1), b = one(2)
  return { src: one(dpr).file, size: one(dpr).w, srcset: a.file === b.file ? '' : `${a.file} 1x, ${b.file} 2x` }
}

/** The clip for a button of `px` CSS pixels: the head only up to 48 device pixels, the whole clip above. */
export function viviClip(px, dpr = 1) {
  const need = Math.ceil(px * dpr)
  const sizes = Object.keys(VIVI.clip).map(Number).sort((a, b) => a - b)
  return VIVI.clip[atLeast(sizes, need)]
}

/** The names the older call sites use: 45 (small mark), 256 (avatar), 1024 (hero). */
export const MASCOT = Object.freeze({ 45: VIVI.logo[48], 256: VIVI.avatar[256], 1024: VIVI.avatar[1024] })
