import { hostSource, normalizeReport } from '../doctor/model.js'
// The port check of the guide is the host's own 体检 (GET /api/doctor?only=network), the group that also shows on the diagnostics page: it runs the same reachability probe as 主机设置 › 网络, so the
// guide, the network page and the diagnostics cannot disagree about a port. No probe of its own is made here. `request(path)` is the product's way to the host and returns { ok, status, json }.

/** The items of the network group that say something about the ports a client needs, in the order shown. */
export const PORT_CHECK_IDS = Object.freeze(['network.lan', 'network.ports', 'network.firewall'])

/**
 * Asks the host's 体检 for its network group and keeps the port lines.
 * -> { ok: true, items: [{ id, status ('pass' | 'warn' | 'fail' | 'skip'), title, detail }], worst } | { ok: false, unsupported: boolean }
 * `unsupported`: the host has no 体检 (404 or a closed connection, 444): the guide then says so instead of calling it a failed check.
 */
export async function checkPortsViaDoctor(request, lang = 'en') {
  try {
    const r = await hostSource(request).fetch('network', lang)
    if (!r || !r.ok) return { ok: false, unsupported: r?.status === 404 || r?.status === 444 || r?.status === 501 }
    const report = normalizeReport(r.json, 'host')
    const group = report?.groups.find((g) => g.id === 'network')
    if (!group) return { ok: false, unsupported: true }
    const items = PORT_CHECK_IDS.map((id) => group.items.find((i) => i.id === id)).filter(Boolean).map(({ id, status, title, detail }) => ({ id, status, title, detail }))
    const rank = { fail: 3, warn: 2, pass: 1, skip: 0 }
    const worst = items.reduce((w, i) => ((rank[i.status] ?? 0) > (rank[w] ?? 0) ? i.status : w), 'skip')
    return { ok: true, items, worst }
  } catch {
    return { ok: false, unsupported: false }
  }
}
