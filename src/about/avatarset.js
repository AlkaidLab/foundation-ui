// The sources of an avatar for an <img>: the 96 px file the README bundle has for everyone, and the 256 px file of the same GitHub avatar that the
// team also has (`<id>-256.<ext>`, see scripts/build-about.mjs). Pure: `lookup(name)` turns a file name into its bundled address ('' when absent).
export const HD_SUFFIX = '-256'
const EXTS = ['jpg', 'png', 'webp']

/** The 256 px file name next to a 96 px one ("2795904.jpg" -> "2795904-256.jpg"), whichever extension of it is bundled; '' when none is. */
export function hdName(name, lookup) {
  const id = /^(\d+)\.[a-z]+$/i.exec(String(name || ''))?.[1]
  if (!id) return ''
  return EXTS.map((ext) => `${id}${HD_SUFFIX}.${ext}`).find((file) => lookup(file)) || ''
}

/**
 * { src, srcset } for an avatar: src is the 96 px file (the fallback), srcset offers both widths so the browser takes the 256 px one wherever the slot
 * needs more than 96 device pixels (a dense or zoomed screen, a large slot). Give the <img> its `sizes`, the slot's CSS width.
 */
export function avatarSources(name, lookup) {
  const sd = lookup(name)
  const hd = lookup(hdName(name, lookup))
  return { src: sd || hd, srcset: sd && hd ? `${sd} 96w, ${hd} 256w` : '' }
}
