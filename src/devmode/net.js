// What the sign-in and the reads say about a request that never got an answer (the browser only reports a failed fetch, never why): the host that was asked and the engine's own words.
// `WORKER_HEADERS` are the request headers the Worker's CORS preflight allows (its access-control-allow-headers, plus the ones every browser sends on its own): a request to the Worker that carries any
// other header is refused before it leaves the window, and the page can only call that 离线. Keep the Worker's reads inside this list.
export const WORKER_HEADERS = Object.freeze(['accept', 'authorization', 'content-type', 'if-none-match'])
export const hostOf = (url) => { try { return new URL(String(url)).host } catch { return '' } }
export const reasonOf = (error) => String(error?.message || error || '').replace(/\s+/g, ' ').trim().slice(0, 120)
