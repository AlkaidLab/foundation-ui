import { computed, onBeforeUnmount, ref } from 'vue'

/**
 * The system information of the host (GET /api/system/info, docs/api/system-info.md of the host): the CPU, the GPUs, the network adapters, the operating system, the host name.
 * Read again every minute while a page uses it; a host without the API (404, 401, 403) leaves the tiles that need it unavailable.
 *   fetchJson(path) -> parsed JSON; throws an error with `.status` on a failed request
 */
export function useSystemInfo({ fetchJson, every = 60000, setTimer = setInterval, clearTimer = clearInterval } = {}) {
  const info = ref(null)
  const supported = ref(true)
  let timer = 0
  async function refresh(force = false) {
    try {
      const d = await fetchJson(`/api/system/info${force ? '?refresh=1' : ''}`)
      if (d && d.version === 1) { info.value = d; supported.value = true }
    } catch (e) { if (e && [401, 403, 404, 444].includes(e.status)) { supported.value = false; stop() } }
  }
  function start() { if (timer) return; void refresh(); timer = setTimer(() => { void refresh() }, every) }
  function stop() { if (timer) clearTimer(timer); timer = 0 }
  onBeforeUnmount?.(stop)
  const defaultNic = computed(() => info.value?.nics?.find((n) => n.is_default_route) || null)
  return { info, supported, refresh, start, stop, defaultNic }
}
