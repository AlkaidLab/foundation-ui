// The model of a smart stack (智能轮换组), pure and tested: stacks of 2 to 6 tiles of ONE size in the place of one tile, the member shown rotating by hand or by what the host is doing.
// A stack is { members: [tileId…], size, smartRotate, suggestions, active }. It is kept apart from the layout of the overview (useStacks.js): the layout still holds every member,
// the overview shows the stack where its first member stands and the other members inside it. A stack that falls under two members dissolves into the tile that is left.
import { sizesOf } from './homeSizes.js'
import { relevanceOf } from './homeSmart.js'

export const STACK_MIN = 2
export const STACK_MAX = 6
export const STACK_PREFIX = 'stack:'
export const isStackId = (id) => typeof id === 'string' && id.startsWith(STACK_PREFIX)

// tiles that never go into a stack: the first pairing's banner (the width of its row), a pinned setting's control, a suggestion, a stack
const NEVER = (card) => !card || card.cls === 'journey' || card.ghost || isStackId(card.id) || String(card.id).startsWith('pin:')

/** Whether a tile may join a stack of `size` in this window class: the size must be one the tile offers there (effectiveSize's own table); the reason is for the editor's grey line. */
export function canJoin(card, size, windowClass = 'large', height = Infinity) {
  if (NEVER(card)) return { ok: false, reason: 'kind' }
  return sizesOf(card.id, card, windowClass, height).sizes[size] ? { ok: true, reason: '' } : { ok: false, reason: 'size' }
}

/** The sizes every member offers in this window class: a stack is drawn at one of them (the window class never gives a stack a size a member cannot draw). */
export function commonSizes(cards, windowClass = 'large', height = Infinity) {
  const lists = cards.map((c) => Object.keys(sizesOf(c.id, c, windowClass, height).sizes).filter((k) => k !== 'strip'))
  return (lists[0] || []).filter((k) => lists.every((l) => l.includes(k)))
}

const clean = (raw, known) => {
  if (!raw || typeof raw !== 'object') return null
  const members = [...new Set((Array.isArray(raw.members) ? raw.members : []).filter((id) => typeof id === 'string' && !isStackId(id) && (!known || known(id))))].slice(0, STACK_MAX)
  if (members.length < STACK_MIN) return null
  return { members, size: ['s', 'm', 'l', 'xl', 'xlp'].includes(raw.size) ? raw.size : 'm', smartRotate: raw.smartRotate !== false, suggestions: raw.suggestions === true, active: Math.max(0, Math.min(members.length - 1, Math.floor(Number(raw.active)) || 0)) }
}

/** Read the saved stacks: unknown ids and stacks of fewer than two members go; a tile is in one stack only (the first that names it keeps it). `rotate` is the one switch for every stack (off: no stack turns by itself). */
export function normalizeStacks(raw, known) {
  const stacks = {}; const used = new Set(); let next = Math.max(1, Math.floor(Number(raw?.next)) || 1)
  for (const [id, s] of Object.entries(raw?.stacks || {})) {
    if (!isStackId(id)) continue
    const c = clean({ ...s, members: (s?.members || []).filter((m) => !used.has(m)) }, known)
    if (!c) continue
    c.members.forEach((m) => used.add(m)); stacks[id] = c
    next = Math.max(next, Number(id.slice(STACK_PREFIX.length)) + 1 || 1)
  }
  return { stacks, next, rotate: raw?.rotate !== false }
}

export const stackOf = (state, tileId) => Object.keys(state.stacks).find((id) => state.stacks[id].members.includes(tileId)) || ''

const without = (state, id) => { const stacks = { ...state.stacks }; delete stacks[id]; return { ...state, stacks } }
/** A stack with one member left is that tile again; none left is gone. */
const settle = (state, id) => { const s = state.stacks[id]; return s && s.members.length < STACK_MIN ? without(state, id) : state }

/** Drop tile `a` onto tile `b` (the same size): a new stack of the two, `b` first. A tile that is in a stack already leaves it. */
export function createStack(state, aId, bId, size) {
  if (aId === bId || !aId || !bId) return { state, id: '' }
  let st = state
  for (const t of [aId, bId]) { const from = stackOf(st, t); if (from) st = removeMember(st, from, t) }
  const id = `${STACK_PREFIX}${st.next}`
  return { state: { ...st, stacks: { ...st.stacks, [id]: { members: [bId, aId], size, smartRotate: true, suggestions: false, active: 0 } }, next: st.next + 1 }, id }
}
/** Add a tile at the end (6 at most); from another stack it is moved. */
export function addMember(state, id, tileId) {
  const s = state.stacks[id]; if (!s || s.members.includes(tileId) || s.members.length >= STACK_MAX) return state
  let st = state; const from = stackOf(st, tileId); if (from) st = removeMember(st, from, tileId)
  const cur = st.stacks[id]; if (!cur) return st
  return { ...st, stacks: { ...st.stacks, [id]: { ...cur, members: [...cur.members, tileId] } } }
}
export function removeMember(state, id, tileId) {
  const s = state.stacks[id]; if (!s || !s.members.includes(tileId)) return state
  const members = s.members.filter((m) => m !== tileId)
  const was = s.members.indexOf(tileId)
  const active = s.active > was ? s.active - 1 : Math.min(s.active, Math.max(0, members.length - 1))
  return settle({ ...state, stacks: { ...state.stacks, [id]: { ...s, members, active } } }, id)
}
export function reorderMember(state, id, from, to) {
  const s = state.stacks[id]; if (!s || from === to || from < 0 || to < 0 || from >= s.members.length || to >= s.members.length) return state
  const members = [...s.members]; const [m] = members.splice(from, 1); members.splice(to, 0, m)
  const shown = s.members[s.active]
  return { ...state, stacks: { ...state.stacks, [id]: { ...s, members, active: members.indexOf(shown) } } }
}
export const dissolve = (state, id) => without(state, id)
export function setActive(state, id, index) {
  const s = state.stacks[id]; if (!s) return state
  return { ...state, stacks: { ...state.stacks, [id]: { ...s, active: ((index % s.members.length) + s.members.length) % s.members.length } } }
}
/** The one switch for all stacks: off, no stack turns by itself (a turn by hand still works). */
export const setRotate = (state, on) => ({ ...state, rotate: !!on })
export function setFlags(state, id, patch) {
  const s = state.stacks[id]; if (!s) return state
  return { ...state, stacks: { ...state.stacks, [id]: { ...s, ...(patch.smartRotate !== undefined ? { smartRotate: !!patch.smartRotate } : {}), ...(patch.suggestions !== undefined ? { suggestions: !!patch.suggestions } : {}), ...(patch.size ? { size: patch.size } : {}) } } }
}

// ---- smart rotation. Apple's Smart Stack is the model (WidgetKit: a relevance score per entry, the system "may rotate" the widget to the top; Smart Rotate is a switch; a person can pin a widget; see docs/authority/source-index.tsv).
// The rules here are data and small numbers:
//  - relevance is relevanceOf (homeSmart.js): the plan's own scores from the same signals (streaming, a problem, an update, a new host) and the part of the day;
//  - a member needs 30 (the plan's line for a tile worth showing) and a lead of 10 over the one shown, so two tiles that matter alike never swap back and forth;
//  - a stack changes at most once in 15 minutes, counting a turn by hand: 15 min is the short end of how often WidgetKit lets a widget that is looked at reload (40 to 70 refreshes a day, "every 15 to 60 minutes");
//  - WHEN it may change is not here but in stackRotation.js: only after the page was away (hidden or unfocused) for 15 minutes and is shown again, or after 30 minutes without input;
//  - the stack with the pointer or the keyboard focus on it never changes; a stack pinned (smartRotate off) never changes; with the switch for all stacks off none changes.
export const ROTATE_GAP_MS = 15 * 60 * 1000
export const RELEVANCE_FLOOR = 30
export const RELEVANCE_MARGIN = 10

/**
 * The member smart rotation turns to, or -1 for nothing. `signals` are the overview's (homeSmart.js); `available(id)` says which members have data now.
 * `holding`: the pointer or the focus is on the stack. `lastChangeAt`: when the stack last changed, by hand or by itself (0: never).
 */
export function rotationPick(stack, signals, { now = Date.now(), hour, lastChangeAt = 0, holding = false, enabled = true, every = ROTATE_GAP_MS, margin = RELEVANCE_MARGIN, floor = RELEVANCE_FLOOR, available = () => true, relevance = relevanceOf } = {}) {
  if (!enabled || !stack || !stack.smartRotate || holding) return -1
  if (lastChangeAt && now - lastChangeAt < every) return -1
  const rel = stack.members.map((id) => (available(id) ? relevance(id, signals || {}, { now, ...(hour !== undefined ? { hour } : {}) }) : -1))
  let best = -1
  rel.forEach((r, i) => { if (r >= floor && (best < 0 || r > rel[best])) best = i })
  if (best < 0 || best === stack.active) return -1
  return rel[best] - Math.max(0, rel[stack.active] ?? 0) >= margin ? best : -1
}
