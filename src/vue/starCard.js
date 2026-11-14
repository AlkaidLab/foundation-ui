import { computed, ref, watch } from 'vue'
import { readOs } from '../clients/osChoice.js'
import { recommendForOs } from '../clients/recommend.js'
import { CLIENTS } from '../clients/catalogue.js'
import { clientInUse } from './clientPrompt.js'
import { osFromClientName } from '../clients/osFromName.js'

// The ask for a star (MStarPrompt, a compact card at the top of the overview, not a tile). It is due after the first pairing (the last step of the connect journey), the first stream that
// was seen, or when paired clients exist already (a host that was set up before this interface kept its own record: the storage of a new panel is empty, the host is not new), and from then on it stays on the overview: while a stream runs it shows the star of the client in use (every stream), when nothing streams the star of the host and the sponsor entry.
// 以后再说 (and a click on a star) hides it until the next stream starts, not permanently. What is kept: `hidden` (the person said later) and `triggered` (it was due once). A `dismissed` that an
// earlier version kept is ignored: it hid the card permanently. The permanent, quiet entries are the star rows of 关于.
const KEY = (storageKey) => `foundation-ui.star.${storageKey}`
export const STAR_HOST_URL = 'https://github.com/AlkaidLab/foundation-sunshine'

export function readStar(storageKey, storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage?.getItem(KEY(storageKey)) || 'null'); if (v && typeof v === 'object') return { hidden: v.hidden === true, triggered: v.triggered === true } } catch { /* corrupted: the start */ }
  return { hidden: false, triggered: false }
}
const write = (storageKey, state, storage) => { try { storage?.setItem(KEY(storageKey), JSON.stringify(state)) } catch { /* storage unavailable */ } }

/**
 * `triggered()` says whether a first pairing or a first stream was seen, `paired()` how many paired clients the host has, `streaming()` whether a stream runs now. Returns { visible, dismiss }: `visible` is the flag of the layout context.
 * While a stream runs the card is due whatever was said before; a stream that starts brings back a card that was hidden.
 */
export function useStarCard({ storageKey, triggered, paired = () => 0, streaming = () => false, storage = globalThis.localStorage }) {
  const state = ref(readStar(storageKey, storage))
  const due = () => !!triggered() || Number(paired()) > 0 || !!streaming()
  const visible = computed(() => !state.value.hidden && (state.value.triggered || due()))
  // once it was due, it stays due (the flag is kept, so a window that was closed in between still shows it)
  const remember = () => { if (!state.value.triggered && due()) { state.value = { ...state.value, triggered: true }; write(storageKey, state.value, storage) } }
  const flag = computed(() => { remember(); return visible.value })
  // the next stream: what was said ("later") is over
  watch(() => !!streaming(), (on) => { if (on && state.value.hidden) { state.value = { ...state.value, hidden: false }; write(storageKey, state.value, storage) } })
  function dismiss() { state.value = { hidden: true, triggered: true }; write(storageKey, state.value, storage) }
  return { visible: flag, dismiss }
}

export const STAR_HOST = Object.freeze({ name: 'Foundation Sunshine', url: STAR_HOST_URL })

export { osFromClientName }

/**
 * The client the person actually uses, for the second button: the system of the most recently listed paired device when its name says one, else the system last chosen in the connect
 * dialogs (Android the first time). macOS devices get Moonlight macOS Enhanced. The name is the project's, without the system word ('Moonlight V+', not 'Moonlight V+ Android').
 */
export function starClientFor({ names = [], os = '' } = {}) {
  const fromNames = [...names].reverse().map(osFromClientName).find(Boolean)
  const client = recommendForOs(fromNames || os || readOs()).client
  // only a project of ours is asked for a star: a partner's client (VoidLink on an iPhone) is not a member project
  if (!client || client.group !== 'first') return null
  const url = client.links?.project
  if (!url) return null
  return { id: client.id, name: String(client.label || client.name).replace(/^(Moonlight V\+) (Android|Desktop|HarmonyOS)$/, '$1'), url }
}

// the project of the client in use, from what the host says of it (docs/api/client-family.md): the family of a paired device. The three clients of the project have a star of their own; VoidLink and upstream
// Moonlight are not ours (the host star is asked for instead); a family the host cannot tell (unknown, absent) falls back to what the device's name says, and when the name says nothing there is no client.
const OFFICIAL_BY_FAMILY = Object.freeze({ 'moonlight-vplus-android': 'vplus-android', 'moonlight-vplus-desktop': 'vplus-desktop', 'moonlight-macos-enhanced': 'macos-enhanced' })
export function starClientInUse({ clients = [], session = null, names = [] } = {}) {
  const use = clientInUse({ clients, session })
  // the session is the one source of who streams now: the family the host derived from the request (`client_family`) counts before the paired record, which a host may keep without a family
  // (the team's host lists 31 clients, none with one): a Mac session of Moonlight macOS Enhanced asks for the star of Moonlight macOS Enhanced, not of whichever device was seen last.
  const family = session?.family || use?.family
  const id = OFFICIAL_BY_FAMILY[family]
  if (!id && session && (session.family === 'voidlink' || session.family === 'moonlight-upstream' || session.official === false)) return null
  if (!id && !use && session?.official === true && session.os) return starClientFor({ os: session.os })
  if (id) {
    const c = CLIENTS.find((x) => x.id === id)
    const url = c?.links?.project
    return url ? { id: c.id, name: String(c.label || c.name).replace(/^(Moonlight V\+) (Android|Desktop|HarmonyOS)$/, '$1'), url } : null
  }
  if (use && (use.official === false || use.family === 'voidlink' || use.family === 'moonlight-upstream')) return null
  const guess = [use?.name, session?.name, ...(use ? [] : names)].filter(Boolean)
  if (!guess.some((n) => osFromClientName(n))) return null
  return starClientFor({ names: guess.filter((n) => osFromClientName(n)) })
}

const projectName = (client) => String(client.label || client.name).replace(/^(Moonlight V\+) (Android|Desktop|HarmonyOS)$/, '$1')
const repoOf = (url) => String(url).replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '')
/** One entry per project for the star rows of 关于: the host and every official client of the catalogue (a project once, whatever systems it serves). Partner clients are not member projects. */
export function starTargets() {
  const out = [{ ...STAR_HOST, repo: repoOf(STAR_HOST.url) }]
  for (const c of CLIENTS) {
    if (c.group !== 'first') continue
    const url = c.links?.project
    if (!url || !/^https:\/\/github\.com\//.test(url) || out.some((t) => t.url === url)) continue
    // the row names the client with its system word (two projects are both Moonlight V+: the desktop one and the Android one); the prompt uses the project name alone
    out.push({ name: String(c.label || c.name), url, repo: repoOf(url) })
  }
  return out
}
