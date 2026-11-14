// The virtual display (基地虚拟显示器) as one setting: the mode the person picks and the options that follow from it. Pure
// model shared by every place that shows it (the settings page, a home card): which host keys make up the mode, which
// of them the host only lets the tray change, and what a choice writes. No DOM, no Vue.
//
//   physical    the host's own display is streamed                      output_name is not ZakoHDR
//   ondemand    a virtual display is made for the stream and removed    output_name = ZakoHDR, vdd_keep_enabled off
//   persistent  a virtual display is always there                       output_name = ZakoHDR, vdd_keep_enabled on
//
// Options of a virtual display mode: one display per client or one shared (vdd_reuse), make one when the host has no
// display (vdd_headless_create), what happens to the physical displays (display_device_prep), how the client's resolution
// and refresh rate are treated (resolution_change, refresh_rate_change and their manual values), whether the stream
// follows a change of the host resolution (dynamic_resolution_follow_display). Expert: Vulkan HDR bridge and NVIDIA vsync
// (vdd_vulkan_hdr_bridge, nvenc_vdd_force_vsync).

export const VDD_OUTPUT = 'ZakoHDR'
export const VDD_MODES = Object.freeze(['physical', 'ondemand', 'persistent'])
/** Keys the host keeps out of the configuration save (the tray owns them): a product needs its own way to write them. */
export const VDD_PROTECTED = Object.freeze(['vdd_keep_enabled', 'vdd_headless_create'])
export const VDD_PREP = Object.freeze(['no_operation', 'ensure_active', 'ensure_primary', 'ensure_only_display', 'ensure_secondary'])
export const VDD_RULES = Object.freeze(['automatic', 'manual', 'no_operation'])
/** Every key of the control: [key, tier] (1 = the mode, 2 = options, 3 = expert). */
export const VDD_KEYS = Object.freeze([
  ['output_name', 1], ['vdd_keep_enabled', 1],
  ['vdd_reuse', 2], ['vdd_headless_create', 2], ['display_device_prep', 2], ['resolution_change', 2], ['manual_resolution', 2],
  ['refresh_rate_change', 2], ['manual_refresh_rate', 2], ['dynamic_resolution_follow_display', 3],
  ['vdd_vulkan_hdr_bridge', 3], ['nvenc_vdd_force_vsync', 3],
])
/** Settings the control owns that the search must find, with the locale key of their title (the Web locale files). */
export const VDD_SEARCH_KEYS = Object.freeze([
  ['output_name', 'config.output_name_windows'], ['vdd_keep_enabled', 'config.vdd_keep_enabled'], ['vdd_headless_create', 'config.vdd_headless_create'],
  ['vdd_reuse', 'config.vdd_reuse'], ['display_device_prep', 'config.display_device_prep'], ['resolution_change', 'config.resolution_change'],
  ['manual_resolution', 'config.resolution_change_manual'], ['refresh_rate_change', 'config.refresh_rate_change'], ['manual_refresh_rate', 'config.refresh_rate_change_manual'],
  ['dynamic_resolution_follow_display', 'config.dynamic_resolution_follow_display'],
  ['vdd_vulkan_hdr_bridge', 'config.vdd_vulkan_hdr_bridge'], ['nvenc_vdd_force_vsync', 'config.nvenc_vdd_force_vsync'],
])

/**
 * The parts of the virtual display control (MVirtualDisplay `parts`) and the settings each draws; the pages of 显示 draw one part each:
 *   virtual  the mode (physical, on demand, stays), the driver notice, the options of a virtual display and the expert rows   output  the physical display that is streamed and how the displays are switched
 *   modes    the resolution and refresh handling
 */
export const VDD_PARTS = Object.freeze({
  virtual: ['vdd_keep_enabled', 'vdd_headless_create', 'vdd_reuse', 'nvenc_vdd_force_vsync'],
  output: ['output_name', 'display_device_prep'],
  modes: ['resolution_change', 'manual_resolution', 'refresh_rate_change', 'manual_refresh_rate', 'dynamic_resolution_follow_display'],
})

export const vddOn = (value) => value === true || value === 'true' || value === 'enabled' || value === 'on'

/** The mode a configuration stands for. */
export const vddModeOf = (config) => (config?.output_name !== VDD_OUTPUT ? 'physical' : vddOn(config?.vdd_keep_enabled) ? 'persistent' : 'ondemand')

/**
 * What choosing a mode writes: { normal, protected } (protected = keys the tray owns). `lastPhysical` is the display the
 * person had before (a device id or ''), so going back to the physical display does not forget it.
 */
export function vddPatchForMode(mode, config = {}, lastPhysical = '') {
  if (mode === 'physical') return { normal: { output_name: lastPhysical && lastPhysical !== VDD_OUTPUT ? lastPhysical : '' }, protected: {} }
  if (mode === 'ondemand') return { normal: { output_name: VDD_OUTPUT }, protected: { vdd_keep_enabled: false } }
  if (mode === 'persistent') return { normal: { output_name: VDD_OUTPUT }, protected: { vdd_keep_enabled: true } }
  return { normal: {}, protected: {} }
}

/** Splits any patch by who may write the key. */
export function vddSplit(patch) {
  const out = { normal: {}, protected: {} }
  for (const [key, value] of Object.entries(patch || {})) out[VDD_PROTECTED.includes(key) ? 'protected' : 'normal'][key] = value
  return out
}

/** The physical displays the host lists: "DISPLAY NAME: ...\nFRIENDLY NAME: F32D80U\n..." -> [{ id, name }]. */
export function vddPhysicalDisplays(config) {
  const list = config?.display_devices
  if (!Array.isArray(list)) return []
  return list.map(({ device_id: id, data = '' }) => {
    const friendly = /FRIENDLY NAME:\s*([^\n]*)/.exec(data)?.[1]?.trim()
    const display = /(DISPLAY\d+)/.exec(data)?.[1]
    return { id, name: [friendly, display && `(${display})`].filter(Boolean).join(' ') || String(id) }
  })
}

/** The facts the controls and a card show, from the configuration (and the host's status when it is known). */
export function vddSummary(config = {}, status = null) {
  const mode = vddModeOf(config)
  const virtual = mode !== 'physical'
  return {
    mode,
    virtual,
    shared: virtual && vddOn(config.vdd_reuse),
    headless: virtual && vddOn(config.vdd_headless_create),
    prep: VDD_PREP.includes(config.display_device_prep) ? config.display_device_prep : 'no_operation',
    resolution: VDD_RULES.includes(config.resolution_change) ? config.resolution_change : 'automatic',
    refresh: VDD_RULES.includes(config.refresh_rate_change) ? config.refresh_rate_change : 'automatic',
    driverReady: status ? status.ready : null,
    active: status ? status.active : null,
  }
}

/** A status answer of /api/vdd/status (or the panel's own) as { ready, active }; null when it says nothing. */
export function vddStatusOf(raw) {
  const data = raw && (raw.data || raw)
  if (!data || typeof data !== 'object') return null
  const state = String(data.state || '')
  const ready = data.installed === false ? false : data.running === true || state === 'ready' || data.control_available === true ? true : state ? state === 'ready' : null
  const active = typeof data.monitor_active === 'boolean' ? data.monitor_active : typeof data.active === 'boolean' ? data.active : null
  return { ready, active, text: data.status_text || '' }
}
