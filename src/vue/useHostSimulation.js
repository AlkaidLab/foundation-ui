import { computed, ref } from 'vue'

// The simulation of a host that is away (开发者 › 测试工具): one at a time, at most a minute, and always visible. The state lives here, not in a page, so the chip in the header of every developer page and the
// choice on 测试工具 read the same thing, and the end after SIMULATION_MS comes from here even when the page that started it has gone. What the simulation does to the product is the product's own `apply(kind)`
// (the panel shows its offline page or its error surface); `apply('')` puts everything back.
export const SIMULATION_MS = 60000
export const SIMULATIONS = Object.freeze(['offline', 'stopped', 'unresponsive'])

export function createHostSimulation({ duration = SIMULATION_MS, now = () => Date.now(), timers = { timeout: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id), every: (fn, ms) => setInterval(fn, ms), stop: (id) => clearInterval(id) } } = {}) {
  // (arrow functions: a browser's setTimeout called as a method of this object throws 「Illegal invocation」)
  const kind = ref('')
  const endsAt = ref(0)
  const clock = ref(now())
  let apply = null
  let timeout = 0
  let tick = 0
  const stopTimers = () => { timers.clear(timeout); timers.stop(tick); timeout = 0; tick = 0 }
  const remaining = computed(() => (kind.value ? Math.max(0, Math.ceil((endsAt.value - clock.value) / 1000)) : 0))

  /** Ends the simulation (a second call, or one with nothing running, does nothing). The product is told to go back first, the state follows at once. */
  async function end() {
    if (!kind.value) return true
    const run = apply
    stopTimers(); kind.value = ''; endsAt.value = 0; apply = null
    try { await run?.('') } catch { /* the product had nothing to put back */ }
    return true
  }
  /** Starts `next` (one of SIMULATIONS) with the product's `run`; a change from another simulation goes straight over. A failure of the product leaves nothing running and is thrown. */
  async function start(next, run) {
    if (!SIMULATIONS.includes(next)) throw new Error(`unknown simulation: ${next}`)
    const before = { kind: kind.value, endsAt: endsAt.value, apply }
    stopTimers()
    const at = now()
    kind.value = next; endsAt.value = at + duration; clock.value = at; apply = run
    timeout = timers.timeout(() => { void end() }, duration)
    tick = timers.every(() => { clock.value = now() }, 250)
    try { await run?.(next) } catch (error) {
      stopTimers(); kind.value = before.kind; endsAt.value = before.endsAt; apply = before.apply
      if (before.kind) { timeout = timers.timeout(() => { void end() }, Math.max(0, before.endsAt - now())); tick = timers.every(() => { clock.value = now() }, 250) }
      throw error
    }
  }
  return { kind, endsAt, remaining, active: computed(() => !!kind.value), start, end, duration }
}

/** What choosing `kind` in the control does: 「未模拟」 ends it at once (no question), the one that already runs does nothing, any other asks first. Nothing starts without the question. */
export const chooseSimulation = (active, kind) => (!kind ? 'end' : kind === active ? 'none' : 'ask')

let shared = null
/** The one simulation of this window. */
export const useHostSimulation = () => (shared ||= createHostSimulation())
