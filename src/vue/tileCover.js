// Tile kit (docs/tile-kit.md): what MTileCover draws for an application or a game: its cover art; without art the app's own icon (an image the app entry
// carries, or the glyph of a built-in app: 桌面, Steam Big Picture, Playnite, TV) on surface-container-high; without either a neutral glyph (a game: a gamepad,
// an app: a window). Never a gradient and never an initial letter (「渐变上的大字母假封面」 looked cheap).
// the applications every host ships with have no cover: each one a glyph of its own (src_assets/windows/assets/apps.json; the Chinese names the products show)
const APP_GLYPHS = [[/^(desktop|桌面)$/i, 'desktop_windows'], [/steam/i, 'videogame_asset'], [/playnite/i, 'gamepad'], [/(^|\s)(tv|电视)/i, 'tv']]
/** The glyph of an application without cover art, or '' (then the neutral glyph). */
export const appGlyph = (name) => APP_GLYPHS.find(([re]) => re.test(String(name || '')))?.[1] || ''
/** The neutral glyphs: a game, an application. */
export const NEUTRAL_GLYPH = Object.freeze({ game: 'sports_esports', app: 'desktop_windows' })
/**
 * A cover: { cover, name } when there is art; else { name, iconUrl } when the app entry has an icon image; else { name, glyph }.
 * `item`: { name | title, cover?, icon? (an image URL of the app's icon, or a glyph name), kind? ('game' | 'app') }.
 */
export function coverOf(item) {
  const name = item?.name ?? item?.title ?? ''
  if (item?.cover) return { cover: item.cover, name }
  const icon = String(item?.icon || '')
  if (/^(https?:|data:image\/|\/)/.test(icon)) return { name, iconUrl: icon }
  return { name, glyph: (icon && !/\s/.test(icon) && icon !== 'devices' ? icon : '') || appGlyph(name) || NEUTRAL_GLYPH[item?.kind === 'app' ? 'app' : 'game'] }
}
