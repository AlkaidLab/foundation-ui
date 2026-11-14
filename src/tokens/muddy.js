// The "muddy" band of the colour roles (the robot of the browser check and the unit tests ask it): the places where a Material scheme turns a yellow, orange or gold seed into brown, olive or a heavy beige.
//
//   muddy fill   an accent role used as a FILL (primary, the containers, secondary and tertiary) whose hue is warm (HCT 35 to 125: orange, amber, yellow, yellow-green), whose chroma is 20 or more
//                and whose tone is 20 to 54. A dark, saturated colour of that hue is read as brown or olive: there is no dark saturated yellow. The band takes the hue range and the tone limit of the
//                official DislikeAnalyzer of material-color-utilities (hue 90 to 111, chroma over 16, tone under 65: "universal distaste for dark yellow-greens") and widens it to the orange hues
//                (brown is dark orange) and to the yellow-greens (olive); the fix lifts to the lightest tone that still keeps 3 : 1 against the light surface (about 57), so 54 is the edge.
//   heavy surface a surface role of a warm hue (HCT 45 to 140) whose chroma is over 16 in the light scheme or over 10 in the dark one: beige, cream or khaki instead of a near neutral. Material's neutral palettes are chroma 4 to 10; the 2025
//                spec multiplies them for yellow hues (Hct.isYellow) because a neutral yellow looks grey, which on a whole page reads as a heavy beige.
import { Hct, argbFromHex } from '@material/material-color-utilities'

export const FILL_ROLES = Object.freeze(['primary', 'primaryContainer', 'secondary', 'secondaryContainer', 'tertiary', 'tertiaryContainer'])
export const SURFACE_ROLES = Object.freeze(['background', 'surface', 'surfaceDim', 'surfaceBright', 'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'surfaceVariant'])
export const MUDDY = Object.freeze({ hue: [35, 125], minChroma: 20, tone: [20, 54], surfaceHue: [45, 140], surfaceChroma: { light: 16, dark: 10 } })

export const hctOf = (hex) => { const h = Hct.fromInt(argbFromHex(hex)); return { hue: h.hue, chroma: h.chroma, tone: h.tone } }
export const isMuddyFill = ({ hue, chroma, tone }) => hue >= MUDDY.hue[0] && hue <= MUDDY.hue[1] && chroma >= MUDDY.minChroma && tone >= MUDDY.tone[0] && tone <= MUDDY.tone[1]
export const isHeavySurface = ({ hue, chroma }, dark) => hue >= MUDDY.surfaceHue[0] && hue <= MUDDY.surfaceHue[1] && chroma > (dark ? MUDDY.surfaceChroma.dark : MUDDY.surfaceChroma.light)

/** The roles of one scheme ({ role: '#rrggbb' }) that fall into the muddy band: [{ role, kind: 'fill' | 'surface', hue, chroma, tone }]. */
export function muddyRoles(roles, { dark = false } = {}) {
  const out = []
  for (const role of FILL_ROLES) { if (!roles[role]) continue; const h = hctOf(roles[role]); if (isMuddyFill(h)) out.push({ role, kind: 'fill', ...h }) }
  for (const role of SURFACE_ROLES) { if (!roles[role]) continue; const h = hctOf(roles[role]); if (isHeavySurface(h, dark)) out.push({ role, kind: 'surface', ...h }) }
  return out
}
