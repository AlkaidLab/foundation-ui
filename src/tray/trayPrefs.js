// What the tray icon does: which of the three menus the RIGHT click opens, and what the LEFT click and the double click do. One small record, kept by the host (the Panel, src-tauri/src/tray_prefs.rs,
// which reads it when the icon is clicked); the settings page (MTraySettings) edits it. This file is the shape of the record and the rules the host mirrors (both are tested).

import { SLIDER_KEYS, TILE_IDS } from './trayModel.js'

export const MENU_VARIANTS = Object.freeze(['v1', 'v2', 'v3'])
/** what a click can do: open the Panel's main window, open one of the three menus, nothing */
export const CLICK_ACTIONS = Object.freeze(['panel', 'v1', 'v2', 'v3', 'none'])

/** Default: right click V1, left click opens the main window (today's behaviour), the double click does nothing extra, the popup menu is used (not the native one). */
/** `tiles` / `sliders`: the ids the quick panel (V3) shows, in order, once the person has edited it; null = the default (src/tray/trayModel.js DEFAULT_TILES / DEFAULT_SLIDERS). */
export const TRAY_PREFS_DEFAULT = Object.freeze({ right: 'v1', click: 'panel', double: 'none', forceNative: false, tiles: null, sliders: null, density: 'auto' })
/** The density of the three menus: 'auto' (a finger or a pen that opens the menu, or slate posture, makes it touch; the first pointer of the page corrects the guess), 'standard', 'touch'. */
export const TRAY_DENSITIES = Object.freeze(['auto', 'standard', 'touch'])

const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback)
/** a list of known ids without repeats, or null when the stored value is not a list */
const ids = (v, known) => (Array.isArray(v) ? Array.from(new Set(v)).filter((x) => known.includes(x)) : null)

/** A valid record from whatever was stored (unknown or missing fields take the defaults). */
export function normalizePrefs(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  return {
    right: pick(r.right, MENU_VARIANTS, TRAY_PREFS_DEFAULT.right),
    click: pick(r.click, CLICK_ACTIONS, TRAY_PREFS_DEFAULT.click),
    double: pick(r.double, CLICK_ACTIONS, TRAY_PREFS_DEFAULT.double),
    forceNative: r.forceNative === true,
    tiles: ids(r.tiles, TILE_IDS),
    sliders: ids(r.sliders, SLIDER_KEYS),
    density: pick(r.density, TRAY_DENSITIES, TRAY_PREFS_DEFAULT.density),
  }
}

/** The action of a gesture: 'right' | 'click' | 'double' -> 'panel' | 'v1' | 'v2' | 'v3' | 'none' (a right click is always one of the menus). */
export function actionOf(prefs, gesture) {
  const p = normalizePrefs(prefs)
  if (gesture === 'right') return p.right
  if (gesture === 'double') return p.double
  return p.click
}

/**
 * A single click that has a double click beside it has to wait to learn whether a second click follows: the host runs it after the system's double-click time. With no double-click action the
 * click runs at once.
 */
export function singleClickWaits(prefs) {
  const p = normalizePrefs(prefs)
  return p.click !== 'none' && p.double !== 'none'
}
