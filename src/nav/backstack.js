import { computed, shallowRef } from 'vue'

let seq = 0
// `root`: the page of a push route was opened as a first-level page (from the rail's footer), not over another page: it has no back arrow, and takes the rail of `rootRail` when the route has one
const make = (route, id, params, root = false) => ({ key: `${id}#${++seq}`, id, role: route.role, rail: root && route.rootRail ? route.rootRail : route.rail, list: route.list, supporting: route.supporting || undefined, push: root ? undefined : route.push || undefined, root: root || undefined, params: params || undefined })

/**
 * One back stack is the single source of navigation state.
 *
 * routes: { [id]: { role: 'list' | 'detail', rail: category id, list?: false, supporting?: id, push?: true } }
 *   A route with `push: true` (公告, 关于) opens on top of where the person was: `go` pushes it, so Back, Esc and the page's back arrow return to that page.
 *   The same page can also be a first-level page: `go(id, params, { root: true })` (the About button of the rail's footer) replaces the stack with that page alone, with no back arrow; entered from
 *   another page (帮助与关于) it is pushed and keeps its Back. How the page was entered decides, not the page; the choice survives the window's history (`root` is in the saved entry).
 *   A category (a rail item) is a 'list' route whose pages are the 'detail' routes with the same `rail`.
 *   The overview is a detail route with `list: false`: the rail and the full-width page.
 * `selectRail(category)` chooses a rail item, `go(page)` a page of a category, `push` goes deeper, `pop` goes back.
 * `pages(category)` lists the pages of a category in declaration order; the first is the default detail.
 * The stack mirrors into history so the browser's back button, the window's back arrow and `pop` agree. A resize
 * never touches it.
 *
 * A narrow window (a phone) has no list pages of the rail categories: `compact()` says it is narrow and `hubOf` maps a rail to the one page that stands for it ({ config: 'settings-hub', stream: 'stream-hub' }).
 *   While narrow, a list entry of such a rail is that hub page, in every way a stack is made (go, selectRail, a restored history state, the browser's back), so a page opened from the hub has the hub
 *   under it and Back is the hub; no route lands on a list that does not exist on the phone. `narrow()` and `widen()` convert the stack when the window crosses the breakpoint.
 *
 * urlFor(entries) -> string | undefined, entriesFrom(location) -> [{ id, params }] | null for apps with real URLs.
 * mirror: 'push' (default) adds an entry to the window's history for each step; 'replace' only rewrites the current one. A page that lives in a frame of another page uses 'replace': an entry
 *   it added to the joint history of the window would be the first thing the outer page's Back (the mouse button) undoes, with nothing to show for it.
 */
export function createNav({ routes, home = null, urlFor = null, entriesFrom = null, historyKey = 'foundationNav', initial = null, mirror = 'push', compact = null, hubOf = null }) {
  const isNarrow = () => !!(compact && hubOf && compact())
  const entryOf = (id, params, root = false) => {
    const route = routes[id]
    if (!route) throw new Error(`unknown destination ${id}`)
    return make(route, id, params, root && !!route.push)
  }
  const pagesOf = (category) => Object.keys(routes).filter((id) => routes[id].role === 'detail' && routes[id].rail === category)
  const homeId = home || Object.keys(routes).find((id) => routes[id].role === 'detail')
  // a stack that starts with a page of a category gets that category's list underneath, so Back reaches the list
  const withList = (stack) => (stack.length && stack[0].role === 'detail' && stack[0].list !== false && routes[stack[0].rail + ':list'] ? [entryOf(stack[0].rail + ':list'), ...stack] : stack)
  const plain = (stack) => stack.map(({ id, params, root }) => ({ id, params, ...(root ? { root: true } : {}) }))
  // a narrow window: the list entry of a rail that has a hub is the hub (twice in a row is once)
  const flat = (stack) => {
    if (!isNarrow()) return stack
    const out = []
    for (const e of stack) {
      const hub = e.role === 'list' ? hubOf[e.rail] : null
      const next = hub && routes[hub] ? entryOf(hub) : e
      if (out.length && out[out.length - 1].id === next.id) continue
      out.push(next)
    }
    return out
  }
  const fromPlain = (list, previous = []) => flat(withList(list.map((p, i) => {
    const kept = previous[i]
    return kept && kept.id === p.id && !!kept.root === !!p.root && JSON.stringify(kept.params || null) === JSON.stringify(p.params || null) ? kept : entryOf(p.id, p.params, !!p.root)
  })))

  const entries = shallowRef([])
  const restore = () => {
    const state = typeof history !== 'undefined' && history.state && history.state[historyKey]
    if (state) return fromPlain(state, entries.value)
    const parsed = entriesFrom && typeof location !== 'undefined' ? entriesFrom(location) : null
    return fromPlain(parsed || [{ id: homeId }], entries.value)
  }
  entries.value = initial ? fromPlain(initial) : restore()

  const sync = (replace = false) => {
    if (typeof history === 'undefined') return
    const index = (history.state && history.state.navIdx) || 0
    const url = urlFor ? urlFor(entries.value) : undefined
    const state = { [historyKey]: plain(entries.value), navIdx: replace || mirror === 'replace' ? index : index + 1 }
    if (replace || mirror === 'replace') history.replaceState(state, '', url)
    else history.pushState(state, '', url)
  }
  // a step in the history that leads to the same pages (the entry of a sheet, a ghost) changes nothing: the shell is not rendered again for it
  const same = (a, b) => a.length === b.length && a.every((e, i) => e.id === b[i].id && !!e.root === !!b[i].root && JSON.stringify(e.params || null) === JSON.stringify(b[i].params || null))
  const onPop = () => { const next = restore(); if (!same(next, entries.value)) entries.value = next }

  const top = computed(() => entries.value[entries.value.length - 1])
  const detail = computed(() => [...entries.value].reverse().find((e) => e.role === 'detail') || null)
  const list = computed(() => [...entries.value].reverse().find((e) => e.role === 'list') || null)
  /** the page shown in the detail pane when none was chosen: the first page of the category */
  const defaultDetailOf = (listEntry) => {
    const first = pagesOf(listEntry.rail)[0]
    return first ? (defaultCache.get(first) || (defaultCache.set(first, entryOf(first)), defaultCache.get(first))) : null
  }
  const defaultCache = new Map()

  return {
    entries,
    top,
    list,
    detail,
    routes,
    pagesOf,
    defaultDetailOf,
    /** id of the rail item that is selected */
    rail: computed(() => (detail.value || list.value || {}).rail || routes[homeId].rail),
    /** id of the page that is selected, for highlighting in the list */
    current: computed(() => {
      if (detail.value) return detail.value.id
      return list.value ? (pagesOf(list.value.rail)[0] || '') : homeId
    }),
    depth: computed(() => entries.value.length),
    canPop: computed(() => entries.value.length > 1),
    /** the page on top was opened over another one (it has a back arrow) */
    pushed: computed(() => !!entries.value[entries.value.length - 1]?.push && entries.value.length > 1),
    selectRail(category) {
      const first = pagesOf(category)[0]
      if (!first) return
      const hub = isNarrow() ? hubOf[category] : null
      if (hub && routes[hub]) { entries.value = [entryOf(hub)]; sync(); return }
      const only = routes[first]
      // a category with a list: the list entry (the detail pane shows its first page); the overview: just the page
      entries.value = only.list === false ? [entryOf(first)] : [entryOf(category + ':list')]
      sync()
    },
    go(id, params, opts) {
      const route = routes[id]
      if (!route) return
      if (route.push && opts?.root) { entries.value = [entryOf(id, params, true)]; sync(); return }
      if (route.push) {
        const at = entries.value.findIndex((e) => e.id === id)
        const base = at >= 0 ? entries.value.slice(0, at) : entries.value[entries.value.length - 1]?.push ? entries.value.slice(0, -1) : entries.value
        entries.value = [...base, entryOf(id, params)]
        sync()
        return
      }
      if (detail.value && detail.value.id === id && JSON.stringify(detail.value.params || null) === JSON.stringify(params || null) && entries.value.length <= 2) return
      // the page the detail pane already shows by default (only the list was chosen): choosing it is the same page, it keeps its key and is not mounted again (no empty frame, no skeleton)
      const shown = !params && entries.value.length === 1 && entries.value[0].role === 'list' && entries.value[0].rail === route.rail && pagesOf(route.rail)[0] === id ? defaultCache.get(id) : null
      entries.value = flat(route.list === false ? [entryOf(id, params)] : [entryOf(route.rail + ':list'), shown || entryOf(id, params)])
      sync()
    },
    push(id, params) { entries.value = [...entries.value, entryOf(id, params)]; sync() },
    pop() {
      if (entries.value.length < 2) return
      if (typeof history !== 'undefined' && history.state && history.state.navIdx > 0) {
        // the window's history goes back, and the popstate it brings sets the stack. A frame in the page (the control panel's Web UI) has history entries of its own in the same joint history: going
        // back may undo one of those and no popstate comes to the page. Then the window is asked once more (the entry of the page is the next one down), and when that brings none either
        // the stack goes back by itself.
        const before = entries.value
        const settled = () => entries.value !== before || entries.value.length < 2
        history.back()
        setTimeout(() => {
          if (settled()) return
          history.back()
          setTimeout(() => { if (!settled()) { entries.value = entries.value.slice(0, -1); sync(true) } }, 160)
        }, 160)
      } else { entries.value = entries.value.slice(0, -1); sync(true) }
    },
    /** the window became narrow: the list entries of the rails with a hub become the hub */
    narrow() { const next = flat(entries.value); if (next !== entries.value) { entries.value = next; sync(true) } },
    /** the window became wide: a hub (and the page above it) becomes the rail's list again */
    widen() {
      if (!hubOf || isNarrow()) return
      const hubs = Object.values(hubOf)
      const [first, ...rest] = entries.value
      if (!first || !hubs.includes(first.id)) return
      entries.value = rest.length ? withList(rest) : [entryOf(first.rail + ':list')]
      sync(true)
    },
    attach() { window.addEventListener('popstate', onPop); sync(true) },
    detach() { window.removeEventListener('popstate', onPop) },
  }
}
