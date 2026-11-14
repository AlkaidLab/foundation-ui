import { shallowReactive } from 'vue'
import { seedFromImage } from '../../../tokens/theme.js'
import { heroTint } from '../heroTint.js'
import { coverKnown, coverOk } from '../../coverOk.js'
import { useAppearance } from '../../useAppearance.js'

// The colours the hero card takes from the game's cover (CalHero, variant B while streaming), kept per cover, theme and style. The work (decode the picture, seed colour, scheme) is done once: a card that is drawn
// again (the person came back to the overview) has them in its first frame instead of drawing the theme's colours and then taking the cover's. A product that draws once asks heroArtReady first.
const cache = shallowReactive({})
const keyOf = (art, dark, soft) => `${art}|${dark ? 'd' : 'l'}|${soft ? 's' : 'f'}`
const darkNow = () => typeof document !== 'undefined' && document.documentElement.dataset.bsTheme === 'dark'

async function work(art, dark, soft, key) {
  try {
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = art; await img.decode()
    // clean dynamic colour from the art (heroTint.js: clamped chroma, no muddy darks, contrast checked); nothing usable: the theme's colours
    const r = heroTint(await seedFromImage(img), dark, !soft)
    cache[key] = { tint: r ? { '--hb-bg': r.bg, '--hb-fg': r.fg, '--hb-btn': r.btn, '--hb-glyph': r.glyph, '--hb-dot': r.dot } : null }
  } catch { cache[key] = { tint: null } }
}

/** The style object of the hero for a cover (CSS variables), or null while it is not known or the cover gives none. Starts the work the first time. Reactive. */
export function heroTintOf(art, dark = darkNow(), soft = true) {
  if (!art) return null
  const key = keyOf(art, dark, soft)
  if (cache[key] === undefined) { cache[key] = 'pending'; void work(art, dark, soft, key) }
  const e = cache[key]
  return e && e !== 'pending' ? e.tint : null
}

/** True when the hero card of a stream with this cover is final in its first frame: the person asked for no art colours, the cover is no picture, or its colours are known. Reactive; starts the work. */
export function heroArtReady(art) {
  const ap = useAppearance()
  if (!art || ap.state.heroArt === false) return true
  if (!coverKnown(art)) return false
  if (!coverOk(art)) return true
  const key = keyOf(art, darkNow(), ap.state.heroStyle !== 'solid')
  void heroTintOf(art, darkNow(), ap.state.heroStyle !== 'solid')
  return cache[key] !== undefined && cache[key] !== 'pending'
}
