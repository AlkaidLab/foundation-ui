// A hero for an announcement that has no banner: a colourful mesh chosen stably from its id (the same post always has the same colours). Four hues around the circle, taken from the theme's own colours
// (primary and tertiary give the anchor hue; the others are turned from it by 60 to 300 degrees in OKLCH at a fixed lightness and chroma, so the colour is vivid in light and in dark and still follows
// the seed): two radial spots over a linear base of two hues. Nothing fades to black: the tile puts only a soft scrim under the title (tilefit.css). Now and then our own 薇薇 stands on it
// (src/about/mascot.js). Nothing is drawn new. `--hl` and `--hc` (lightness and chroma) are set by tilefit.css per theme.
const hash = (s) => { let h = 2166136261; for (const ch of String(s ?? '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0 } return h >>> 0 }
const hue = (role, turn, dl = 0, dc = 0) => `oklch(from var(--md-sys-color-${role}) calc(var(--hl, .62) + ${dl}) calc(var(--hc, .2) + ${dc}) calc(h + ${turn}))`

/** The parts of a post's hero: four colours (a, b the base; c, d the spots), their places, the angle of the base, and whether 薇薇 stands on it. */
export function announcementHero(id) {
  const h = hash(id)
  const anchor = h & 1 ? 'tertiary' : 'primary'
  const other = h & 1 ? 'primary' : 'tertiary'
  const t = 60 + ((h >>> 1) % 4) * 20 // 60..120
  return {
    a: hue(anchor, 0), b: hue(other, t), c: hue(anchor, t * 2 + 30, 0.14, -0.02), d: hue(other, 240 + ((h >>> 3) % 3) * 30, 0.06, 0),
    angle: 110 + ((h >>> 8) % 8) * 30,
    x1: 10 + ((h >>> 11) % 5) * 10, y1: 8 + ((h >>> 14) % 4) * 10, x2: 62 + ((h >>> 17) % 4) * 10, y2: 52 + ((h >>> 20) % 4) * 10,
    vivi: ((h >>> 23) & 1) === 0,
  }
}

/** The background of the hero layer: two radial spots over the two-hue base. */
export function announcementHeroBackground(id) {
  const g = announcementHero(id)
  return `radial-gradient(circle at ${g.x1}% ${g.y1}%, ${g.c} 0, transparent 55%), radial-gradient(circle at ${g.x2}% ${g.y2}%, ${g.d} 0, transparent 60%), linear-gradient(${g.angle}deg, ${g.a}, ${g.b})`
}

/** The inline style of the hero layer. */
export const announcementHeroStyle = (id) => ({ background: announcementHeroBackground(id) })
