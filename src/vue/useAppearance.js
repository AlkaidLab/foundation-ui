import { reactive, ref, watch } from 'vue'
import { DEFAULTS, IMAGE_KEY, LEGACY_DESKTOP_THEME_KEY, STORAGE_KEY, legacyDesktopLook, normalize } from '../appearance/appearance.js'
import { applyAppearance, fileToDataUrl, pictureSeeds, setFrostScope } from '../appearance/apply.js'
import { reducedMotion } from '../appearance/motion.js'
import { installModality } from '../a11y/modality.js'
import { installTouchPress } from '../a11y/touchPress.js'

// One appearance for the window, shared by every page, sheet and the guide. The product registers how light/dark is applied
// (`registerModeHandler`) because each product already owns its theme switch.
const state = reactive(normalize(null))
const status = ref('solid')
const wallpaperSeeds = ref([]) // up to four seeds of the wallpaper, once it was read
const hasFile = ref(false)
let file = ''
let modeHandler = null
let started = false

// the old desktop's corner and text size come over once: while the stored record has no 界面 of its own
const legacy = () => { try { return legacyDesktopLook(JSON.parse(localStorage.getItem(LEGACY_DESKTOP_THEME_KEY) || 'null')) } catch { return {} } }
const read = () => {
  let raw = null
  try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { raw = null }
  const own = raw && typeof raw === 'object' && ('cardCorner' in raw || 'textSize' in raw)
  return normalize(own ? raw : { ...(raw && typeof raw === 'object' ? raw : {}), ...legacy() })
}
// The mark every motion rule reads, set as soon as the library is loaded (applyAppearance sets it again from the state): without it a window whose system turns animations off
// would run its first frames, the page entering among them, as reduced motion before the appearance was applied.
if (typeof document !== 'undefined' && document.documentElement && !document.documentElement.dataset.motion) document.documentElement.dataset.motion = read().motion
const write = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state })) } catch { /* storage unavailable */ } }

/** Resolves after the next frame was painted (a window that paints no frames, a hidden one: after 120 ms). */
const afterPaint = () => new Promise((resolve) => {
  const timer = setTimeout(resolve, 120)
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(() => { clearTimeout(timer); resolve() }, 0))
})

// What changes only colours (the picture, its frost and the layers stay)
const COLOUR_KEYS = new Set(['mode', 'color', 'preset', 'custom', 'dark', 'colorStyle', 'seedIndex'])
const changesColoursOnly = (patch) => Object.keys(patch).length > 0 && Object.keys(patch).every((key) => COLOUR_KEYS.has(key))
const fadesThePicture = () => typeof document.startViewTransition === 'function' && !reducedMotion() && !(() => { try { return localStorage.getItem('foundation-ui.theme-fade') === 'off' } catch { return false } })()
const holdColourTransitions = (on) => document.documentElement.classList.toggle('m-theme-fade', on)

async function apply() {
  status.value = 'loading'
  status.value = await applyAppearance(document.documentElement, { ...state }, { file }) === 'superseded' ? status.value : document.documentElement.dataset.wallpaper
  const seeds = pictureSeeds()
  if (seeds.join() !== wallpaperSeeds.value.join()) wallpaperSeeds.value = [...seeds]
}

export function registerModeHandler(fn) { modeHandler = fn; if (started && fn) fn(state.mode) }

export function useAppearance() {
  return {
    state, status, hasFile, wallpaperSeeds,
    /** Applies the stored appearance once at start; safe to call again. */
    async init() {
      if (started) return
      started = true
      installModality()
      installTouchPress()
      Object.assign(state, read())
      try { file = localStorage.getItem(IMAGE_KEY) || ''; hasFile.value = !!file } catch { file = '' }
      modeHandler?.(state.mode)
      await apply()
    },
    async set(patch) {
      const before = state.mode
      Object.assign(state, normalize({ ...state, ...patch }))
      write()
      // The click paints first (the chosen button shows its state); light or dark and the new colours follow, each in a task of its own. Changing the
      // theme makes the whole tree recalculate its style (30 ms for 600 elements on the Skyward panel): done in the click's task, together with the
      // work of apply(), it was one long task of 55 to 65 ms and the next paint waited for all of it.
      await afterPaint()
      // A change of colours only (light, dark, a colour): no element starts a colour transition for it (the cross-fade of 600 elements cost 25 to 35 ms of
      // style work in its first frame; 2 ms without it). Where the window may animate, the change is one cross-fade of the window's picture instead: a view
      // transition, two snapshots faded on the compositor, nothing per element. Where it may not (animation effects off) or the person turned it off
      // (localStorage foundation-ui.theme-fade = off), the colours change at once.
      if (changesColoursOnly(patch)) {
        holdColourTransitions(true)
        try {
          if (fadesThePicture()) {
            // a view transition the browser skips (the window is hidden, another one started) rejects its promises with "Transition was aborted": that is not an error of ours, and the colours still have to change
            let applied = false
            const transition = document.startViewTransition(async () => { applied = true; if (state.mode !== before) modeHandler?.(state.mode); await apply() })
            transition.ready.catch(() => {})
            transition.finished.catch(() => {})
            try { await transition.updateCallbackDone } catch (error) {
              if (applied) throw error
              if (state.mode !== before) modeHandler?.(state.mode)
              await apply()
            }
          } else {
            if (state.mode !== before) { modeHandler?.(state.mode); await afterPaint() }
            await apply()
            await afterPaint()
          }
        } finally { holdColourTransitions(false) }
        return
      }
      if (state.mode !== before) { modeHandler?.(state.mode); await afterPaint() }
      await apply()
    },
    /** The frost of the page the window is on: 'home' (the overview) or 'other'. Moves on the effects spring. */
    setScope(scope) { setFrostScope(document.documentElement, scope) },
    /** Changes the blur or the tint of one scope: setFrost('other', { blur: 40 }). */
    async setFrost(scope, patch) { const key = scope === 'home' ? 'home' : 'other'; return this.set({ [key]: { ...state[key], ...patch } }) },
    /** The frost back to its defaults (both scopes and the same-as-other switch). */
    async resetFrost() { return this.set({ fade: DEFAULTS.fade, homeSame: DEFAULTS.homeSame, home: { ...DEFAULTS.home }, other: { ...DEFAULTS.other } }) },
    async chooseFile(f) { return this.chooseDataUrl(await fileToDataUrl(f)) },
    /** A picture that is already a data URL (an older stored choice of a product). */
    async chooseDataUrl(url) {
      try { localStorage.setItem(IMAGE_KEY, url) } catch { status.value = 'failed'; return false }
      file = url; hasFile.value = true
      await this.set({ background: 'wallpaper', source: 'file' })
      return true
    },
    async reset() { Object.assign(state, normalize(null)); write(); await apply(); modeHandler?.(state.mode) },
    DEFAULTS,
  }
}
export const watchAppearance = (fn) => watch(state, fn, { deep: true })
