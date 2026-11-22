// The smart stack model: membership by size and class, dissolve at one member, reorder, rotation rules
import test from 'node:test'
import assert from 'node:assert/strict'
import { STACK_MAX, RELEVANCE_MARGIN, ROTATE_GAP_MS, addMember, canJoin, commonSizes, createStack, dissolve, isStackId, normalizeStacks, removeMember, reorderMember, rotationPick, setActive, setFlags, setRotate, stackOf } from '../src/vue/stackModel.js'
import { relevanceOf } from '../src/vue/homeSmart.js'
import { useStacks } from '../src/vue/useStacks.js'
import { CARD_META } from '../src/vue/homeCards.js'

const card = (id) => ({ id, ...(CARD_META[id] || {}), available: true, data: { points: [1, 2, 3, 4, 5], facts: [{ label: 'a', value: 'b' }] } })
const empty = () => ({ stacks: {}, next: 1 })

test('a stack is made of two tiles dropped on each other, the target first; a tile is in one stack only', () => {
  const a = createStack(empty(), 'cpu', 'gpu', 's')
  assert.equal(a.id, 'stack:1'); assert.deepEqual(a.state.stacks['stack:1'].members, ['gpu', 'cpu']); assert.equal(a.state.stacks['stack:1'].size, 's')
  assert.ok(a.state.stacks['stack:1'].smartRotate); assert.ok(!a.state.stacks['stack:1'].suggestions)
  const b = createStack(a.state, 'cpu', 'memory', 's')
  assert.deepEqual(b.state.stacks[b.id].members, ['memory', 'cpu'], 'cpu left the first stack for the second')
  assert.equal(b.state.stacks['stack:1'], undefined, 'the first stack was left with one tile and dissolved')
  assert.equal(stackOf(b.state, 'cpu'), b.id); assert.equal(stackOf(b.state, 'gpu'), '')
})

test('a stack holds 2 to 6 tiles: more are refused, and one that falls to a single tile dissolves', () => {
  let st = createStack(empty(), 'a1', 'a0', 's').state
  const id = 'stack:1'
  for (let i = 2; i < 14; i++) st = addMember(st, id, `a${i}`)
  assert.equal(STACK_MAX, 6); assert.equal(st.stacks[id].members.length, STACK_MAX)
  assert.equal(addMember(st, id, 'zz'), st)
  st = createStack(empty(), 'x', 'y', 'm').state
  st = removeMember(st, 'stack:1', 'x')
  assert.deepEqual(st.stacks, {}, 'one member left: it is that tile again')
})

test('reordering keeps the member that is shown; the active member follows removals', () => {
  let st = createStack(empty(), 'b', 'a', 'm').state; st = addMember(st, 'stack:1', 'c')
  st = setActive(st, 'stack:1', 2)
  st = reorderMember(st, 'stack:1', 2, 0)
  assert.deepEqual(st.stacks['stack:1'].members, ['c', 'a', 'b']); assert.equal(st.stacks['stack:1'].active, 0, 'c is still the one shown')
  st = removeMember(st, 'stack:1', 'a')
  assert.deepEqual(st.stacks['stack:1'].members, ['c', 'b']); assert.equal(st.stacks['stack:1'].active, 0)
  assert.equal(setActive(st, 'stack:1', -1).stacks['stack:1'].active, 1, 'the index wraps')
  assert.deepEqual(dissolve(st, 'stack:1').stacks, {})
})

test('membership by size and window class: only a size the tile offers there; the common sizes are what the stack can be', () => {
  assert.equal(canJoin(card('cpu'), 'l', 'large').ok, true)
  assert.equal(canJoin(card('cpu'), 'l', 'compact').ok, true, 'a phone has 大 (2 x 2, the width of the phone), not 特大')
  assert.deepEqual(canJoin(card('cpu'), 'xl', 'compact'), { ok: false, reason: 'size' }, 'the cpu tile ends at 大')
  assert.deepEqual(canJoin(card('cpu'), 'xl', 'large'), { ok: false, reason: 'size' }, 'the cpu tile ends at 大')
  assert.deepEqual(canJoin(card('journey'), 's'), { ok: false, reason: 'kind' }); assert.equal(canJoin({ id: 'pin:setting:x' }, 's').reason, 'kind'); assert.equal(canJoin({ id: 'stack:1' }, 's').reason, 'kind')
  const sizes = commonSizes([card('cpu'), card('gpu')], 'large')
  assert.ok(sizes.includes('s') && sizes.includes('l'))
  assert.deepEqual(commonSizes([card('cpu'), card('gpu')], 'compact'), ['s', 'm', 'l'])
})

test('the saved stacks are read strictly: unknown tiles go, a stack under two members goes, a tile is in the first stack that names it', () => {
  const known = (id) => ['a', 'b', 'c', 'd'].includes(id)
  const r = normalizeStacks({ next: 3, stacks: { 'stack:1': { members: ['a', 'b', 'zzz'], size: 'm' }, 'stack:2': { members: ['b', 'c'], size: 'xx' }, 'nope': { members: ['a', 'b'] }, 'stack:7': { members: ['d', 'a'] } } }, known)
  assert.deepEqual(Object.keys(r.stacks), ['stack:1']); assert.deepEqual(r.stacks['stack:1'].members, ['a', 'b'])
  assert.ok(r.next >= 8 || r.next >= 3)
  assert.equal(normalizeStacks(null).next, 1)
  assert.equal(isStackId('stack:3'), true); assert.equal(isStackId('cpu'), false)
})

test('smart rotation: the signals name the member (the plan\'s own scores); never under the pointer or the focus, pinned, switched off, or within 15 minutes of the last change', () => {
  const stack = { members: ['recent-games', 'bitrate', 'logs', 'update'], smartRotate: true, active: 0 }
  const t = 1_000_000_000; const day = { now: t, hour: 13 }
  const idle = { pairedCount: 2 }; const live = { pairedCount: 2, streaming: true }; const problem = { pairedCount: 2, problems: 1 }; const upd = { pairedCount: 2, updateAvailable: true }
  assert.equal(rotationPick(stack, live, day), 1); assert.equal(rotationPick(stack, problem, day), 2); assert.equal(rotationPick(stack, upd, day), 3)
  assert.equal(rotationPick(stack, idle, day), -1, 'nothing in the stack says anything about an idle host at noon')
  assert.equal(rotationPick(stack, live, { ...day, holding: true }), -1, 'the pointer or the focus is on it')
  assert.equal(rotationPick({ ...stack, smartRotate: false }, live, day), -1, 'pinned: rotation off for this stack')
  assert.equal(rotationPick(stack, live, { ...day, enabled: false }), -1, 'the switch for all stacks is off')
  assert.equal(ROTATE_GAP_MS, 15 * 60_000)
  assert.equal(rotationPick(stack, live, { ...day, lastChangeAt: t - 14 * 60_000 }), -1); assert.equal(rotationPick(stack, live, { ...day, lastChangeAt: t - 16 * 60_000 }), 1)
  assert.equal(rotationPick({ ...stack, members: ['cpu', 'gpu'] }, live, day), -1, 'no member is worth showing')
  assert.equal(rotationPick(stack, live, { ...day, available: (id) => id !== 'bitrate' }), -1, 'a member without data is not turned to')
})

test('smart rotation does not flap: a member needs 30 and a lead of 10 over the one shown; the part of the day lifts tiles in calm scenarios only', () => {
  assert.equal(RELEVANCE_MARGIN, 10)
  const pair = { members: ['cpu', 'gpu'], smartRotate: true, active: 1 }
  const idle = { pairedCount: 2 }
  assert.equal(rotationPick(pair, idle, { now: 1, hour: 13 }), -1, 'cpu 36 against gpu 35: a lead of 1 is no reason to turn')
  const games = { members: ['cpu', 'recent-games'], smartRotate: true, active: 0 }
  assert.equal(rotationPick(games, idle, { now: 1, hour: 13 }), -1, 'at noon the games tile has nothing to say')
  assert.equal(rotationPick(games, idle, { now: 1, hour: 20 }), 1, 'in the evening it comes forward on an idle host')
  assert.equal(rotationPick(games, { pairedCount: 2, streaming: true }, { now: 1, hour: 20 }), -1, 'while streaming the time of day does not decide')
  assert.ok(relevanceOf('update', { pairedCount: 2, updateAvailable: true }, { now: 1, hour: 8 }) > relevanceOf('update', { pairedCount: 2, updateAvailable: true }, { now: 1, hour: 13 }))
  assert.equal(relevanceOf('comp:x', { problemComponents: ['x'] }, { hour: 13 }), 94); assert.equal(relevanceOf('comp:y', { problemComponents: ['x'] }, { hour: 13 }), 0)
})

test('the switch for all stacks is saved with them; an old save without it reads as on', () => {
  assert.equal(normalizeStacks({ stacks: {}, rotate: false }).rotate, false); assert.equal(normalizeStacks({ stacks: {} }).rotate, true); assert.equal(normalizeStacks(null).rotate, true)
  const st = setRotate(createStack(empty(), 'a', 'b', 's').state, false)
  assert.equal(st.rotate, false); assert.equal(addMember(st, 'stack:1', 'c').rotate, false, 'a change of the stacks keeps the switch'); assert.equal(createStack(st, 'x', 'y', 's').state.rotate, false)
})

test('the store keeps the stacks per interface and ignores a corrupt save', () => {
  const mem = new Map(); const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }
  const s = useStacks('t', { storage, known: () => true })
  const id = s.create('b', 'a', 'm'); s.add(id, 'c'); s.setFlags(id, { smartRotate: false })
  s.setRotate(false)
  const again = useStacks('t', { storage, known: () => true })
  assert.equal(again.state.rotate, false, 'the switch for all stacks is saved'); again.setRotate(true); assert.equal(useStacks('t', { storage, known: () => true }).state.rotate, true)
  assert.deepEqual(again.state.stacks[id].members, ['a', 'b', 'c']); assert.equal(again.state.stacks[id].smartRotate, false)
  mem.set('foundation-ui.stacks.bad', '{not json'); assert.deepEqual(useStacks('bad', { storage }).state.stacks, {})
  assert.deepEqual(setFlags(empty(), 'stack:9', { smartRotate: false }), empty())
})
