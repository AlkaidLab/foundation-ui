// WHEN a smart stack may change (the model of what it changes to is stackModel.js rotationPick). Pure and tested with a clock that is passed in.
// The rule of the team (D3, 11-09): never while the person is looking at the overview. A stack changes only
//  - when the page was away (hidden, or the window not focused, or another page of the app) for AWAY_MS and is shown again, or
//  - after IDLE_MS without a touch, key, wheel or pointer press (a wall display nobody operates),
// and then once: calm, a short crossfade, nothing at all with reduced motion (MDashStack.vue, stack.css).
// Apple does the same in spirit: WidgetKit "may rotate" a widget to the top when the entry's date arrives, and reloads a widget on a page that is rarely visited "when the user views the page, WidgetKit may
// reload the widget when it becomes visible" (docs/authority/source-index.tsv: keeping-a-widget-up-to-date). The numbers are ours: 15 minutes is the short end of how often WidgetKit lets a viewed widget reload
// ("roughly every 15 to 60 minutes"), a glance away shorter than that leaves the page as it was; 30 minutes without input is twice that, so a person reading a page is not taken for gone.
export const AWAY_MS = 15 * 60 * 1000
export const IDLE_MS = 30 * 60 * 1000
/** After the page is shown the signals of the host are fetched again; the stack looks at them this long after, and not at all if the person has put the pointer on it meanwhile. */
export const SETTLE_MS = 1200

/**
 * The presence of the person at the page. hide()/show() are the page leaving and coming back (visibility, focus, route); activity() any input.
 * show() says whether the page was away long enough to count as a re-show. idleDue() is true once per idle stretch, after IDLE_MS without input.
 */
export function createPresence({ now = () => Date.now(), awayMs = AWAY_MS, idleMs = IDLE_MS } = {}) {
  let hiddenAt = null
  let lastInput = now()
  let idleFired = false
  return {
    hide() { if (hiddenAt === null) hiddenAt = now() },
    show() { const away = hiddenAt === null ? 0 : now() - hiddenAt; hiddenAt = null; lastInput = now(); idleFired = false; return away >= awayMs },
    activity() { lastInput = now(); idleFired = false },
    idleDue() { if (hiddenAt !== null || idleFired || now() - lastInput < idleMs) return false; idleFired = true; return true },
    get hidden() { return hiddenAt !== null },
  }
}

/**
 * What runs `run` (the overview turning its stacks, once) and when: the page comes back after AWAY_MS (SETTLE_MS later, the signals fresh), the overview is shown again after another page of the app,
 * or `tick()` finds IDLE_MS without input. Nothing else calls `run`: not a timer, not a change of the plan, nothing while the page is in use.
 */
export function createRotationDriver({ now = () => Date.now(), awayMs = AWAY_MS, idleMs = IDLE_MS, settleMs = SETTLE_MS, schedule = (f, ms) => setTimeout(f, ms), cancel = (t) => clearTimeout(t), run } = {}) {
  const presence = createPresence({ now, awayMs, idleMs })
  let timer = null
  const settle = () => { if (timer !== null) cancel(timer); timer = schedule(() => { timer = null; run() }, settleMs) }
  return {
    hide: () => presence.hide(),
    show() { if (presence.show()) settle() },
    activity: () => presence.activity(),
    tick() { if (presence.idleDue()) run() },
    /** the overview is shown again after another page of the app (`away` ms) */
    returned(away) { if (away >= awayMs) settle() },
    dispose() { if (timer !== null) cancel(timer); timer = null },
  }
}
