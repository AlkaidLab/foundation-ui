import { unref, watchEffect } from 'vue'
import { useNotify } from '../notify/store.js'
import { statusTexts } from '../status/texts.js'

// The state of the host and the app that stays until it is solved, as the system notices of the window (the status button of the caption bar): a component
// that has a problem or wants attention, and an update that waits. `status` is the component status controller (createComponentStatus), `go` = { components,
// microphone, vdd, update } navigation callbacks, `update()` -> { state: 'available' | …, next }.
const UPDATE = { zh: { title: (v) => (v ? `有新版本 ${v}` : '有新版本'), open: '查看' }, en: { title: (v) => (v ? `Update ${v} is available` : 'An update is available'), open: 'View' } }
const GO = { mic: 'microphone', vdd: 'vdd' }

export function useSystemNotices({ status, locale, go = {}, update = null }) {
  const notify = useNotify()
  const seen = new Set()
  return watchEffect(() => {
    const T = statusTexts(unref(locale))
    const L = String(unref(locale)).startsWith('zh') ? 'zh' : 'en'
    const next = new Set()
    for (const row of status.rows.value) {
      if (!row.loaded || (row.state !== 'error' && row.state !== 'warn')) continue
      const id = `component:${row.id}`
      next.add(id)
      const open = go[GO[row.id]] || go.components
      notify.system(id, {
        tone: row.state === 'error' ? 'error' : 'warn',
        icon: row.icon || undefined,
        title: T.names?.[row.id] || row.title || row.id,
        text: T.states[row.state],
        actions: open ? [{ id: 'open', label: T.open, onClick: () => open() }] : [],
      })
    }
    const u = update?.()
    if (u?.state === 'available') {
      next.add('update')
      notify.system('update', { tone: 'info', icon: 'system_update_alt', dismissible: true, revision: u.next || '', title: UPDATE[L].title(u.next), actions: go.update ? [{ id: 'open', label: UPDATE[L].open, onClick: () => go.update() }] : [] })
    }
    for (const id of seen) if (!next.has(id)) notify.clearSystem(id)
    seen.clear()
    for (const id of next) seen.add(id)
  })
}
