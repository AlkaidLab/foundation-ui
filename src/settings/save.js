// One saving path for a single host setting from outside the settings pages (the control cards of the home). It reads the host's current
// configuration, changes the one key and writes the whole configuration back, the way the settings page and the troubleshooting page save.
// `api` is the product's own transport: { getJson(path), postJson(path, body) }.

/** Value in the type the host keeps for the key: a number when the stored one is a number. */
export const coerceLike = (current, value) => (typeof current === 'number' && value !== '' && Number.isFinite(Number(value)) ? Number(value) : typeof current === 'boolean' ? value === true || value === 'true' : value)

export async function saveSettingKey(api, key, value) {
  let config
  try { config = await api.getJson('/api/config') } catch { return { ok: false, error: 'read' } }
  if (!config || typeof config !== 'object') return { ok: false, error: 'read' }
  const next = { ...config, [key]: coerceLike(config[key], value) }
  let result
  try { result = await api.postJson('/api/config', next) } catch { return { ok: false, error: 'write', config } }
  const ok = !!result && (result.status === true || result.status === 'true')
  return ok ? { ok: true, config: next } : { ok: false, error: result?.error || 'write', config }
}
