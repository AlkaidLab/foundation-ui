import { ref, watch } from 'vue'
import { readOs, writeOs } from '../clients/osChoice.js'
import { useReleaseAssets } from './useReleaseAssets.js'
import { createPairQr } from './usePairQr.js'

/**
 * The state of the ConnectDialog of a product: open or not, the tab (pair | install), the device and the system chosen, the pairing QR window of the host
 * (opened only while the pair view of a client that reads it is shown), and the PIN sent to the host.
 *   hostApi   { getJson(path), postJson(path, body) } over the host API (the panel through its proxy, the Web UI directly)
 *   render    (url) => Promise<data URL> the image of a code
 *   matrix    (text) => module matrix of a code (for the install QR, drawn as an SVG)
 *   say       (kind: 'sent' | 'failed', reason?: 'incorrect' | 'timeout' | 'network' | 'not-ready') the product's notice
 *   defaultName  the name a client gets when it was paired by PIN from here
 */
export function useConnectDialog({ hostApi, render, matrix, say = () => {}, defaultName = 'New client', onPaired = () => {} } = {}) {
  const open = ref(false)
  const tab = ref('pair')
  // the system of the device: the last one chosen anywhere, Android the first time
  const os = ref(readOs())
  watch(os, (v) => writeOs(v))
  const releases = useReleaseAssets()
  const pairQr = createPairQr({
    start: async () => { const d = await hostApi.postJson('/api/qr-pair', {}); if (String(d.status) !== 'true') throw new Error(d.error || 'qr'); return d },
    poll: () => hostApi.getJson('/api/qr-pair'),
    cancel: () => hostApi.postJson('/api/qr-pair/cancel', {}),
    render,
    onPaired,
  })
  // Why a request to /api/pin did not arrive. The panel proxy answers 503 when Sunshine is not running and 504/408 on a timeout;
  // a fetch that never got an answer (TypeError) is a lost connection. Any other status stays the plain failure.
  const failureReason = (error) => {
    const status = Number(error?.status)
    if (error?.code === 'timeout' || error?.name === 'TimeoutError' || status === 504 || status === 408) return 'timeout'
    if (status === 503) return 'not-ready'
    if (status === 502 || !status) return 'network'
    return undefined
  }
  const withTimeout = (work, timeoutMs = 10000) => {
    let timer
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('pairing request timed out'), { code: 'timeout', name: 'TimeoutError' })), timeoutMs)
    })
    return Promise.race([work, timeout]).finally(() => clearTimeout(timer))
  }
  async function pairPin(pin, name = '') {
    if (!/^\d{4}$/.test(String(pin || ''))) return false
    const work = hostApi.postJson('/api/pin', { pin: String(pin), name: String(name || '').trim() || defaultName })
    const accepted = (d) => String(d?.status).toLowerCase() === 'true'
    try {
      const d = await withTimeout(work)
      const ok = accepted(d)
      // The host answers { status: "false" } for a wrong PIN and for no pairing waiting, with no error field (confighttp.cpp savePin,
      // nvhttp/pairing.cpp pin); the old PIN window showed the same wrong-PIN text for it.
      say(ok ? 'sent' : 'failed', ok ? undefined : 'incorrect')
      return ok
    } catch (error) {
      say('failed', failureReason(error))
      // the host may still finish the pairing after the wait ran out: the person then sees that it worked, and does not retry a PIN already used
      if (error?.code === 'timeout') work.then((d) => { if (accepted(d)) say('sent') }, () => {})
      return false
    }
  }
  /** Open the dialog on a tab. */
  const show = (which = 'pair') => { tab.value = which === 'install' ? 'install' : 'pair'; open.value = true }
  return { open, tab, os, assetsOf: releases.assetsOf, versionOf: releases.versionOf, pairQr: pairQr.view, qrBegin: pairQr.begin, qrStop: pairQr.stop, pairPin, show, matrix }
}
