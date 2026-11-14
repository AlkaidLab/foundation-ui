// The product's icon, the sun without clouds (AlkaidLab/SunshineQ, 素材/无云.svg, commit 9c5f587; see src/assets/app/SOURCE.md), drawn at the top left of the window and nowhere else: no tile, no rim, no outline.
// It is one vector file: every slot, from 16 px to a hero, draws the same art sharp, so there is no size to choose and no density to follow.
const FILE = new URL('../assets/app/app-icon.svg', import.meta.url).href

/** The file for a slot of `px` CSS pixels at `dpr` device pixels per CSS pixel: { src, srcset }; the vector scales, so `srcset` stays empty. */
export function appIcon() {
  return { src: FILE, srcset: '' }
}
